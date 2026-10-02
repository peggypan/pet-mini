# 微信云开发接入指南（本仓库）

小程序侧采用 **云函数 `api` + 云数据库**，与 Nest 云托管后端**二选一**并行期：配置 `useCloud: true` 后登录走云开发；未配置时仍可用本地 mock / `localhost` Nest。

## 一、控制台开通（约 10 分钟）

1. [微信公众平台](https://mp.weixin.qq.com/) → 你的小程序 → **云开发** → 开通（按量计费即可）。
2. 记录 **环境 ID**（形如 `cloud1-xxxx`）。
3. **数据库集合**：共 **25** 个，分 6 期创建；清单、CLI 命令与控制台步骤见  
   **`apps/wxapp/database/README.md`**（脚本：`database/init-collections.sh`）。  
   今天只需先完成 **阶段 1**：`users`（可能已有）+ **`pets`**。  
4. **权限**：各集合规则见 **`apps/wxapp/database/permissions.md`**。

## 二、本地配置

```bash
cd chongwu/apps/wxapp/config
cp cloud-env.example.js cloud-env.js
```

编辑 `cloud-env.js`：

```javascript
module.exports = {
  envId: 'cloud1-你的环境ID',
  useCloud: true,
};
```

## 三、微信开发者工具

1. 打开目录 **`chongwu/apps/wxapp`**（小程序根目录）。
2. 顶部 **云开发** → 选中同一环境。
3. **绑定云环境（必做，否则会报「请在 cloudfunctionRoot 选择一个云环境」）**  
   - 左侧文件树 **单击** 文件夹 **`cloudfunctions`**（云函数根目录，不是 `api` 子目录）。  
   - 在编辑器上方或右侧出现的 **「云环境 / 当前环境」** 下拉里，选 **`cloud1-d8gnokqshc15dc3ae`**。  
   - 若列表为空：用当前小程序 AppID 登录开发者工具 → 云开发 → 先开通/进入该环境一次，再重开项目。  
   - 仓库已在 `project.private.config.json` 写入 `selectedEnvId`，保存后 **关闭项目再打开** 或 **重新编译** 有时可自动选中。
4. **cloudfunctions/api** 右键 → **上传并部署：云端安装依赖**。
4. 编译运行；在控制台可手动调用云函数测试：

```json
{ "module": "system", "action": "ping" }
```

## 四、小程序验证「环境跑通」

1. 开启 `useCloud` 后，`app.js` 会在 `onLaunch` 执行 `wx.cloud.init`。
2. 在开发者工具 **调试器 → Console** 测试（须选 **AppService / 逻辑层**，渲染层没有 `require`）：

```javascript
// 方式 A：直接调云函数（推荐，任何逻辑层 Console 可用）
wx.cloud.callFunction({
  name: 'api',
  data: { module: 'system', action: 'ping' },
}).then((res) => console.log('ping', res.result));

wx.cloud.callFunction({
  name: 'api',
  data: { module: 'auth', action: 'login' },
}).then((res) => console.log('login', res.result));
```

```javascript
// 方式 B：require（仅 AppService；路径相对小程序根目录）
const cloudApi = require('./utils/cloud-api.js');
cloudApi.ping().then(console.log);
cloudApi.login().then(console.log);
```

3. 云开发控制台 → 数据库 `users` 应出现一条 openid 记录。

## 五、API 约定

统一调用：

```javascript
wx.cloud.callFunction({
  name: 'api',
  data: {
    module: 'auth',
    action: 'login',
    payload: { /* 可选 */ },
  },
})
```

返回：

```json
{ "code": 0, "message": "ok", "data": { } }
```

封装见 `utils/cloud-api.js`：`callApi(module, action, payload)`。

### 已实现

| module.action | 说明 |
|---------------|------|
| `system.ping` | 连通性检测 |
| `system.checkCollections` | 检测各集合是否已在控制台创建（返回 `missing` 列表） |
| `system.getWxacode` | 活动海报等无限制小程序码（openapi `wxacode.getUnlimited`） |
| `auth.login` | openid 登录/注册，写 `users` |
| `auth.me` | 当前用户 |
| `auth.bindPhone` | `getPhoneNumber` 的 code 换手机号 |
| `auth.updateProfile` | 更新 `users` 网名 / 签名 / 头像 |
| `pets.listMine` / `pets.get` / `pets.save` | 宠物档案 |
| `buddy_posts.listFeed` / `listMine` / `get` / `save` / `remove` | 搭子广场 |
| `social_posts.listFeed` / `listMine` / `get` / `save` / `remove` | 社区动态（含寻宠/招领同步） |
| `social_comments.listByPost` / `save` / `remove` | 动态评论（楼中楼 `parentId`） |
| `local_posts.listFeed` / `listMine` / `get` / `save` / `remove` | 同城结构化帖（领养等，pet-rescue） |
| `events.listFeed` / `listMine` / `get` / `save` / `remove` | 活动（event-publish / 广场列表） |
| `event_signups.listMine` / `getMyByEvent` / `get` / `save` / `remove` | 报名与核销码（名额与 `events.remain` 联动） |
| `event_qualify.getMine` / `submit` | 活动发布资质（个人实名 / 商家入驻，含证件图） |
| `map_points.listFeed` / `listMine` / `get` / `save` / `remove` | 友好地图标点（提交 `pending`，广场仅 `approved`） |
| `merchants.listFeed` / `listMine` / `get` / `save` / `remove` | 商家门店（`bizStatus`: 0 待审 / 1 营业 / 2 拒绝） |
| `merchant_applies.getMine` / `submit` / `remove` | 商家入驻申请（对齐 admin 入驻审核） |
| `host_applies.getMine` / `submit` / `remove` | 主理人入驻（club-apply：俱乐部名称/城市/封面等） |
| `clubs.listFeed` / `listMine` / `get` / `save` / `remove` | 俱乐部档案（`onlineStatus`: pending/online/offline） |
| `club_members.listMine` / `listByClub` / `join` / `leave` | 加入/退出俱乐部，同步 `clubs.memberCount` |
| `pet_certs_public.get` / `listMine` / `publish` / `remove` | 电子宠证公开快照（扫码查验，`get` 无需登录） |
| `banners.listFeed` / `get` | 首页轮播（`status:1` + 投放期；`save`/`remove` 预留 admin） |
| `splash_ads.getActive` / `listFeed` / `get` | 开屏广告（`status:online` + 投放期；频次见 `showRule`） |
| `points_ledger.listMine` / `getSummary` | 积分流水与余额（余额以 `users.points` 为准；`credit` 客户端 403） |
| `sensitive_words.listActive` / `check` | 敏感词列表与文本检测（`save`/`remove` 客户端 403） |
| `admin.login` / `admin.me` | 运营后台登录与当前管理员（返回 `adminToken`，7 天有效） |
| `admin_users.listFeed` / `get` / `save` / `remove` | 管理员账号 CRUD（需 `payload.adminToken`；写操作 super 受限） |
| `pet_discover_likes.getSummary` / `swipe` / `addShareBonus` | 搭搭喜欢列表与每日滑动额度（需登录；本地 `mvp_pet_likes` 为缓存） |
| `chat_threads.listMine` / `ensure` / `markRead` | 私信会话（开云不再注入 `MOCK_CHATS`） |
| `chat_messages.listByThread` / `send` | 私信消息（媒体会先上传云存储） |

未实现返回 `code: 501`，`details.planned` 列出规划模块。

**积分入账**：云函数内部 `handlers/points_ledger.creditUserPoints(openid, userDoc, { amount, reason, type, refId, refType })`，`refId` 幂等；地图标点审核通过等运营场景后续接入。

**敏感词**：集合 `sensitive_words` 为空时使用内置兜底词表；`social_posts` / `social_comments` / `local_posts.save` 服务端校验。小程序 `app.onLaunch` 拉取 `listActive` 写入本地，发布页前置拦截。

**搭搭喜欢**：集合 `pet_discover_likes`（喜欢记录）+ `pet_discover_daily`（当日 `used`/`bonus`/`shareCount`）。`pet-discover` 开云时 `getSummary` 同步列表，右滑走 `swipe`。

**私信**：集合 `chat_threads` + `chat_messages`。消息页 `listMine` 拉会话；聊天页 `ensure` / `send` / `listByThread`。`peerId` 仍为搭子/虚拟对象 id；演示用「对方回复」以 `sender: peer` 写入同一会话（非双端实时 IM）。

**运营后台**：`admin_users` 集合权限 C 类。库为空时首次 `admin.login` 可用 **`admin` / `demo`** 自动创建 super（仅开发/bootstrap，上线前改密并配置云函数环境变量 **`ADMIN_TOKEN_SECRET`**）。管理端通过 CloudBase Web / HTTP 调 `api`：`{ module, action, payload: { adminToken, ... } }`。

## 六、模块落地顺序（建议）

与 `chongwu-admin/docs/cloud-integration.md` 一致：

1. **users / pets** — 档案、宠物表单  
2. **buddy_posts** — 搭搭、搭子广场  
3. **social_posts / social_comments** — 社区  
4. **events / event_signups / event_qualify** — 活动  
5. **map_points / local_posts** — 地图与同城  
6. **merchants / host_applies / clubs** — 商家与主理人  
7. **banners / splash_ads / points_ledger / sensitive_words** — 运营与配置  
8. **admin_*** — 运营后台（可独立云函数或 `api` 的 admin 路由 + 管理员校验）

每完成一模块：

1. 在 `cloudfunctions/api/handlers/` 增加 handler  
2. 在 `router.js` 的 `ROUTES` 注册  
3. 小程序 `utils/cloud-api.js` 或按域 `services/*.js` 封装  
4. 页面从 `store` / mock 改为 `callApi`，保留 mock 开关便于对照  

## 七、与 Nest 云托管的关系

| 能力 | 云开发 | 云托管 Nest |
|------|--------|-------------|
| 登录 | `auth.login`（openid） | `/auth/wx-login` |
| 数据 | 云数据库集合 | PostgreSQL + Prisma |
| 部署 | 开发者工具上传云函数 | Docker 云托管 |

长期可：**云函数做网关 + 鉴权**，或逐步把 Nest 逻辑迁到云函数；当前阶段优先云开发跑通业务集合。

## 八、常见问题

- **请在编辑器云函数根目录（cloudfunctionRoot）选择一个云环境**  
  1. 点击左侧 **`cloudfunctions`** 文件夹。  
  2. 在界面里手动选择环境 `cloud1-d8gnokqshc15dc3ae`。  
  3. 确认 `project.config.json` 含 `"cloudfunctionRoot": "cloudfunctions/"`。  
  4. 确认打开的是 `wxapp` 根目录，而不是上级 `chongwu`。  
- **cloud.init 失败**：检查 `envId` 与开发者工具所选环境一致。  
- **callFunction 失败 -501**：接口尚未实现，按第六节追加 handler。  
- **users 写不进去**：检查是否误开客户端写权限；应仅云函数写入。  
- **手机号 bindPhone 失败**：云函数 `config.json` 需 openapi `phonenumber.getPhoneNumber`，并重新上传部署。
- **海报小程序码无效**：需部署含 `wxacode.getUnlimited` 的 `api` 云函数；扫码进入详情页时 `scene` 为活动 `id`（≤32 字）。开发版扫码请用当前 `envVersion`（develop/trial/release）。
