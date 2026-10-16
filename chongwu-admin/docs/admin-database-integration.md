# 运营后台对接微信云数据库

小程序与后台**共用同一套云开发环境**（云数据库集合 + 云函数 `api`）。  
Schema 以 [`chongwu/apps/wxapp/database/schemas`](../../apps/wxapp/database/schemas) 为准；**不在 MySQL 建表**，字段由云函数写入时落地。

## 1. 为什么不能浏览器直连云库？

| 方式 | 问题 |
|------|------|
| 浏览器里 `wx.cloud` | 仅小程序环境，Admin 是 Vite Web |
| 前端 CloudBase Web SDK + 匿名登录 | 无法安全持有管理员密钥；权限规则应「仅云函数可写」 |
| 前端直连数据库 | 会暴露 Secret，且绕开 `adminToken` 鉴权 |

**推荐架构（当前实现）：**

```
React Admin（静态网站托管 或 localhost）
    │  @cloudbase/js-sdk：匿名登录 + callFunction('api')
    ▼
云函数 api/router.js
    │  requireAdmin(payload) 校验 adminToken
    ▼
云数据库集合（与 schemas 一致，权限模板 C：不浏览器直连库）
```

可选：`server/` Node BFF 仅作 Secret 转发备用，**默认不需要**。

C 端小程序同样走 `api`，但用 `auth.login` + openid；运营走 `admin.login` + `adminToken`，在 handler 里分支权限。

## 2. 本地开发步骤

### 2.1 云侧（一次性）

1. 微信开发者工具打开 `chongwu/apps/wxapp`，选对云环境。  
2. 按 [`database/README.md`](../../apps/wxapp/database/README.md) 创建集合；权限见 `permissions.md`（**客户端不可写业务表**）。  
3. **上传并部署** 云函数 `cloudfunctions/api`（含 `admin.*` / `admin_feed.*` 路由）。  
4. 云函数环境变量（生产必改）：
   - `ADMIN_TOKEN_SECRET`：签发 `adminToken` 的 HMAC 密钥  
5. 首次登录：`admin.login` 在 `admin_users` 为空时允许 **`admin` / `demo`** 引导创建 super（仅开发；上线前改密并禁用弱口令）。

### 2.2 Admin 前端（Web SDK）

```bash
cd chongwu-admin
cp .env.example .env.local
# VITE_TCB_ENV=cloud1-xxx
# 可选 VITE_TCB_ACCESS_KEY=Publishable Key
npm install
npm run dev
```

浏览器访问 http://localhost:5173 ，登录走 `admin.login`；业务请求走 `callApi` → 云函数 `api`。

**安全：** 不要把 `SecretId/SecretKey` 写进前端；Web 端仅用 Publishable Key（可选）+ 匿名登录满足 SDK 鉴权，**业务权限靠 payload.adminToken**。

## 3. 接口约定（与小程序一致）

请求体（`callFunction` 的 `data`）：

```json
{
  "module": "admin",
  "action": "login",
  "payload": { "username": "admin", "password": "***" }
}
```

响应：

```json
{ "code": 0, "message": "ok", "data": { } }
```

登录成功后，后续请求在 `payload` 中带：

```json
{ "adminToken": "<token>" }
```

（与 `cloudfunctions/api/common/auth-admin.js` 一致，也兼容字段名 `token`。）

## 4. Admin 页面 → 云模块映射

| 后台菜单 | 集合 (schema) | 列表接口 (admin_feed) | 审核 / 写操作 |
|----------|---------------|------------------------|---------------|
| 用户列表 | `users` | `admin_feed.listUsers` | `admin_feed.setUserStatus` |
| 宠物档案 | `pets` | `admin_feed.listPets` | 隐藏/驳回 `auditStatus` |
| 社区动态 | `social_posts` | `admin_feed.listSocialPosts` | `admin.moderatePost` |
| 评论 | `social_comments` | `admin_feed.listSocialComments` | `admin.moderatePost` type=comment |
| 搭子广场 | `buddy_posts` | `admin_feed.listBuddyPosts` | `admin.moderatePost` |
| 活动 | `events` | `admin_feed.listEvents` | moderate / 下架 |
| 报名核销 | `event_signups` | `admin_feed.listEventSignups` | `admin_feed.checkInSignup` |
| 地图标点 | `map_points` | `admin_feed.listMapPoints` | `admin.reviewMapPoint`、`admin_feed.createOfficialMapPoint` |
| 寻宠救助 | `social_posts` + `local_posts` | `listSocialPosts` lostType / `listLocalPosts` | moderate + `createOfficialContent` |
| 商家入驻 | `merchant_applies` | `admin_feed.listMerchantApplies` | `admin.reviewMerchantApply` |
| 门店管理 | `merchants` | `admin_feed.listMerchants` | `setMerchantBizStatus`、`saveMerchantAdmin` |
| 运营发帖 | 各内容集合 | — | `createOfficialContent`（social/buddy/event/local）；配图走 `uploadMedia` + `images`/`cover`/`detailImages` |
| 素材上传 | 云存储 | — | `admin_feed.uploadMedia` |
| 主理人 | `host_applies` | `admin_feed.listHostApplies` | 已有 `admin.reviewHostApply` |
| 俱乐部 | `clubs` / `club_members` | `admin_feed.listClubs` / `listClubMembers` | `saveClubAdmin`、`updateClubOnlineStatus` |
| Banner | `banners` | `admin_feed.listBanners` | `admin_feed.saveBanner` |
| 开屏广告 | `splash_ads` | `admin_feed.listSplashAds` | `admin_feed.saveSplashAd` |
| 话题 / 分区 | `app_settings` doc `community` | `admin_feed.getCommunityConfig` | `admin_feed.saveCommunityConfig` |
| 积分流水 | `points_ledger` | `admin_feed.listPointsLedger` | 地图审核通过时云函数内部 `credit` |
| 敏感词 | `sensitive_words` | `sensitive_words.listFeed` | `admin_feed.saveSensitiveWord` |

C 端 `*.listFeed` 通常只返回 `auditStatus=approved`；**后台必须用 `admin_feed.*`**，可按 `auditStatus` / `pending` 筛选。

## 5. 前端改造顺序（替换 Mock）

1. **`src/services/cloud-api.ts`** — 统一 `callApi(module, action, payload)`  
2. **`src/services/auth.ts`** — 登录、`adminToken` 存 sessionStorage  
3. **按模块建 service**：`services/buddy.ts`、`services/events.ts`…  
4. 页面：`useEffect` 拉数 + 审核按钮调 cloud  
5. **`src/mock/data.ts`** — 保留为 `import.meta.env.DEV && VITE_USE_MOCK` 开关（可选）  
6. **待办角标**：`PendingBadgeContext` → `admin_feed.summaryCounts`（`mapCountsToMenuBadges`）

单页改造模板：

```tsx
const [rows, setRows] = useState<BuddyPostRow[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  (async () => {
    setLoading(true);
    try {
      const data = await listBuddyPostsForAdmin({ auditStatus: statusFilter });
      if (!cancelled) setRows(data.list);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();
  return () => { cancelled = true; };
}, [statusFilter]);
```

## 6. 媒体上传（Banner / 运营录入）

1. Admin 选图 → BFF `POST /api/upload`（Node SDK `uploadFile` 到云存储）  
2. 返回 `fileID` / HTTPS 临时链 → 写入 `banners.imageUrl` 等字段  
3. 小程序端继续用现有 `cloud-media` 解析 fileID  

（BFF 上传路由可在 `server/index.js` 按阶段追加。）

## 7. 与 Nest / PostgreSQL 文档的关系

仓库内 `chongwu/docs/ARCHITECTURE.md` 描述的是**可选** Nest + PG 方案。当前小程序已以**微信云开发**为主，Admin 应跟云函数对齐，而不是先建第二套 PG，除非你们明确要双写迁移。

## 8. 上线 checklist

- [ ] 修改默认 `admin/demo` 密码；`ADMIN_TOKEN_SECRET` 使用强随机串  
- [ ] 云数据库权限：所有业务集合 **仅云函数可读写**  
- [ ] BFF 部署在内网或带 IP 白名单；HTTPS  
- [ ] 管理端 session 过期跳转登录（401 统一处理）  
- [ ] 审核、积分发放操作写 `updatedAt` / 操作人（可扩展 `adminId` 审计字段）

## 9. 相关文件

| 路径 | 说明 |
|------|------|
| `chongwu/apps/wxapp/cloudfunctions/api/router.js` | 路由表 |
| `chongwu/apps/wxapp/cloudfunctions/api/handlers/admin.js` | 登录、主理人审核 |
| `chongwu/apps/wxapp/cloudfunctions/api/handlers/admin_feed.js` | 运营列表与 Banner/敏感词写 |
| `chongwu-admin/src/services/cloudbase-client.ts` | Web SDK 初始化与 callFunction |
| `chongwu-admin/src/services/cloud-api.ts` | callApi + adminToken |
| `chongwu-admin/server/` | 可选 BFF（默认不用） |
| `chongwu/docs/wechat-cloud-dev.md` | 小程序云开发总览 |
