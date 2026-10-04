# 云数据库集合权限（上线版）

控制台路径：**云开发 → 数据库 → 点集合名 → 权限设置 → 自定义安全规则**。

## 一、原则（先看这段）

| 角色 | 是否受安全规则约束 |
|------|-------------------|
| 云函数 `api`（服务端） | **否**，等同管理员，可读写任意集合 |
| 小程序 `wx.cloud.database()` 直连 | **是** |

本仓库 **页面层不直连数据库**，读写一律走 `utils/cloud-api.js` → 云函数 `api`。  
因此上线推荐：**除少数公开配置外，全部「客户端不可读写」（模板 C）**，避免有人改包绕过审核字段（如 `auditStatus`、`bizStatus`、积分等）。

新建/迁移环境时：**每个环境都要重新粘贴一遍规则**（不会从开发环境复制）。

---

## 二、权限模板（复制到控制台）

### A · 用户私有（仅 `users`）

本人可读自己的用户文档；**禁止客户端写**（注册/改资料走 `auth.*`）。

```json
{
  "read": "doc._openid == auth.openid",
  "write": false
}
```

说明：他人资料、搜索用户、主页展示均走云函数，由服务端按业务字段返回，不依赖「客户端可读全表」。

---

### C · 仅云函数（**推荐默认**）

```json
{
  "read": false,
  "write": false
}
```

列表、详情、发帖、报名、私信、关注等 **全部走 `api`**。上线请对下表中标 **C** 的集合使用本规则。

---

### D · 公开只读配置（可选优化）

```json
{
  "read": true,
  "write": false
}
```

仅用于 **无敏感字段、且允许被爬取也无大碍** 的运营配置。写操作仍只走管理端/云函数。  
若你希望和其余集合一致、只走接口，也可改成 **C**（功能不受影响）。

---

### B · 发布者可写（**不推荐上线**）

```json
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

客户端一旦可写，可能篡改 `auditStatus`、点赞数、商家状态等。**仅本地调试、且确认无直连 DB 时可临时使用**；正式环境请改 **C**。

---

## 三、全集合对照表（27 个）

与 `permissions-map.json`、`collections.json` 一致。按阶段建库时可分批配权限。

| 集合 | 阶段 | 模板 | 主要云函数模块 | 说明 |
|------|------|------|----------------|------|
| `users` | 1 | **A** | `auth` | 账号、网名、积分余额字段；客户端不可写 |
| `pets` | 1 | **C** | `pets` | 宠物档案；搭搭/主页经云函数过滤 |
| `buddy_posts` | 2 | **C** | `buddy_posts` | 搭子帖；含审核/上下架 |
| `pet_discover_likes` | 2 | **C** | `pet_discover` | 右滑喜欢记录 |
| `pet_discover_daily` | 2 | **C** | `pet_discover` | 每日滑动额度 |
| `social_posts` | 2 | **C** | `social_posts` | 社区动态 |
| `social_comments` | 2 | **C** | `social_comments` | 评论（勿用 B，防刷审） |
| `local_posts` | 2 | **C** | `local_posts` | 同城寻宠/领养/救助 |
| `chat_threads` | 2 | **C** | `chat_threads` | 私信会话；仅参与者经云函数可见 |
| `chat_messages` | 2 | **C** | `chat_messages` | 私信消息；**禁止客户端读**（防越权） |
| `user_follows` | 2 | **C** | `user_follows` | 关注/互关关系 |
| `events` | 3 | **C** | `events` | 活动主表 |
| `event_signups` | 3 | **C** | `events` | 报名、核销码 |
| `event_interests` | 3 | **C** | `events` | 「感兴趣」计数/去重 |
| `event_qualify` | 3 | **C** | `event_qualify` | 发活动资质审核 |
| `map_points` | 4 | **C** | `map_points` | 友好地图标点（含审核） |
| `merchants` | 5 | **C** | `merchants` | 商家资料；列表走 `listFeed` |
| `merchant_applies` | 5 | **C** | `merchants` | 商家入驻申请 |
| `host_applies` | 5 | **C** | `host_applies` | 主理人入驻 |
| `clubs` | 5 | **C** | `clubs` | 俱乐部 |
| `club_members` | 5 | **C** | `clubs` | 成员关系 |
| `pet_certs_public` | 6 | **D** 或 **C** | `pet_certs` | 电子宠证公开快照 |
| `banners` | 6 | **D** 或 **C** | `banners` | 首页轮播 |
| `splash_ads` | 6 | **D** 或 **C** | `splash_ads` | 开屏广告 |
| `points_ledger` | 6 | **C** | `points` | 积分流水 |
| `sensitive_words` | 6 | **C** | 内部 | 敏感词库，严禁客户端读 |
| `admin_users` | 6 | **C** | `admin` | 运营后台账号 |

**统计**：A × 1，C × 23，D × 3（`pet_certs_public`、`banners`、`splash_ads` 可降为 C）。

---

## 四、按阶段配置顺序

1. **阶段 1**：`users` → A；`pets` → C  
2. **阶段 2**：搭子/社区/私信/ **`user_follows`** → 全部 C  
3. **阶段 3**：活动四表（含 **`event_interests`**）→ C  
4. **阶段 4～6**：其余按上表  

每批建完集合后立刻配权限，再部署 `api`，避免空窗期被直连写入。

---

## 五、云存储（与数据库分开配）

路径：**云开发 → 存储 → 安全规则**。

| 路径示例 | 建议 | 说明 |
|----------|------|------|
| `chat/**` | 读：所有用户；写：仅创建者 | 或完全依赖云函数 `getTempFileURL`，与私信 C 类一致 |
| 用户头像/帖子图 | 读：true；写：仅登录用户且路径含 openid | 与上传逻辑一致即可 |

数据库设为 C 后，**媒体仍可能通过 `cloud://` 暴露**，存储规则要单独收紧。

---

## 六、自检

1. 部署 `api` 后 Console：

```javascript
require('./utils/cloud-api').callApi('system', 'checkCollections').then(console.log);
```

`missing` 应为空（含 `user_follows`、`event_interests`）。

2. 在控制台随机抽 3 个 **C** 集合，确认规则为 `read/write: false`。

3. 真机：登录、发帖、私信、关注互关、拉 banner——均正常即表示权限与云函数匹配。

---

## 七、快速粘贴

机器可读清单：**`permissions-map.json`**（`templates` + 每个 `name` 的 `template`）。  
改规则后 **无需** 重新部署云函数；改的是云端集合配置，立即生效。
