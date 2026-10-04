# 全功能测试用例（按云数据库集合）

照着本清单 **从 0 到 1 走一遍**，可覆盖小程序 + 云函数 `api` 与 **27 个集合** 的主路径。

**建议时长**：单人约 3～4 小时；含双号私信/互关再加 1 小时。

**上线前快速过一遍**：见同目录 **[`TEST-CASES-P0-1H.md`](./TEST-CASES-P0-1H.md)**（约 1 小时，仅 P0）。

---

## 0. 测试准备（全部用例的前置）

| 编号 | 步骤 | 预期 |
|------|------|------|
| PRE-01 | 开发者工具打开 **`chongwu/apps/wxapp`**，`config/cloud-env.js`：`useCloud: true`，`envId` 与控制台一致 | 编译无 cloud 初始化报错 |
| PRE-02 | 点选 **`cloudfunctions`** → 选择云环境 → **`api` 上传并部署：云端安装依赖** | 部署成功 |
| PRE-03 | AppService Console：`wx.cloud.callFunction({ name:'api', data:{ module:'system', action:'ping' }})` | `code: 0`，含 version |
| PRE-04 | 同上，`checkCollections`（不传 phase） | `missing: []`（27 个集合齐全） |
| PRE-05 | 各集合权限按 **`permissions.md`** 配好（users=A，其余 mostly C） | — |
| PRE-06 | 准备 **账号 A**（主测机/主微信号）；**账号 B**（第二台真机或另一微信号，测私信/互关/他人视角） | — |
| PRE-07 | 云开发控制台可改文档（用于商家/地图等 **无 admin 审核接口** 时的数据放行） | — |

**记录模板**（每段测完打勾）：

```
日期：____  环境 ID：____  测试人：____
A openid（截断）：____  B openid：____
```

---

## 1. 全局 / 基础设施（不单独占集合）

| ID | 操作路径 | 步骤 | 预期 |
|----|----------|------|------|
| SYS-01 | 冷启动 | 清除缓存后进入小程序 → 隐私弹窗同意 | 进入开屏/首页，无白屏 |
| SYS-02 | `splash_ads` | 控制台 `splash_ads` 插入一条 `active` 记录（或已有）→ 冷启动 | 开屏页展示；跳过/倒计时正常 |
| SYS-03 | 无开屏 | 无有效开屏配置时冷启动 | 直接进入首页 Tab |
| SYS-04 | 城市 | 首页/切换 **`city-picker`** | 城市写入本地，首页推荐随城市刷新 |
| SYS-05 | 搜索 | **`pages/search/search`** 输入关键词 | 有结果或空态，不报错 |
| SYS-06 | 敏感词 | 任一带 UGC 发布页输入控制台 `sensitive_words` 里有的词 | 提交被拦或提示（与线上一致） |
| SYS-07 | Tab | 依次点：首页 / 搭搭 / 社区 / 消息 / 我的 | 自定义 TabBar 正常，无 404 |

---

## 2. `users` — 账号与资料

| ID | 页面/入口 | 步骤 | 预期（库表） |
|----|-----------|------|----------------|
| USER-01 | 首次进入 | 同意隐私后任意触发登录（如进「我的」） | `users` 新增 1 条，含 `openid`、默认昵称 |
| USER-02 | 我的 | 查看头像、网名展示 | 与 `users` 或本地合并展示一致 |
| USER-03 | **`profile-edit`** | 改签名/头像（若开放）并保存 | `auth.updateProfile` 成功；`users.updatedAt` 变化 |
| USER-04 | 我的 | 手机号授权（若入口存在） | `auth.bindPhone` 成功；`users.phone` 有值 |
| USER-05 | 换机/清缓存 | 仅保留云账号：清本地 Storage → 再进「我的」登录 | `auth.me` 拉回网名/积分等 |
| USER-06 | 控制台 | 直接改 `users.points` 为 100 → 我的页下拉刷新 | 积分展示更新（走 `points_ledger` 同步逻辑） |

**Console 抽检**：

```javascript
const cloudApi = require('./utils/cloud-api.js');
cloudApi.login().then(r => console.log(r));
cloudApi.callApi('auth', 'me').then(r => console.log(r));
```

---

## 3. `pets` — 宠物档案

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| PET-01 | **`pet-form`** | 新建宠物：名、品种、性别、头像 | `pets` 新增；`pets.listMine` 含该条 |
| PET-02 | **`pet-form`** | 编辑已有宠物并保存 | 同 `_id` 更新；`auditStatus` 仍为 `approved`（默认） |
| PET-03 | **`profile`** / 档案切换 | 多宠物时切换当前宠物 | 各页展示跟随当前宠物 |
| PET-04 | 档案守卫 | 未建档时进搭子发布/部分互动 | 引导去 **`pet-form`** |
| PET-05 | 控制台 | 将某宠物 `auditStatus` 改为 `rejected` | **`pet-cert`** 显示驳回条；二维码区隐藏 |
| PET-06 | 控制台 | 改回 `approved` | 宠证页恢复正常 |

---

## 4. `buddy_posts` — 搭子广场

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| BUD-01 | **`buddy-publish`** | 发布普通搭子（图+文案+区域） | `buddy_posts` 新增；`auditStatus: approved` |
| BUD-02 | **`buddy`** | 下拉刷新列表 | 刚发内容出现在广场（A 可见） |
| BUD-03 | **`buddy-detail`** | 点进详情：点赞/分享/收藏（若有） | 本地互动正常；分享卡片 path 带 id |
| BUD-04 | **`buddy-detail`** | 非本人：点 **关注** | 见 **`user_follows`** 用例 |
| BUD-05 | **`buddy-detail`** | 非本人：点 **私信/聊天** | 进入 **`chat_*`** 流程 |
| BUD-06 | **`buddy-detail`** | 本人：删除搭子 | 云侧 `buddy_posts.remove`；广场不再见 |
| BUD-07 | **`buddy`** | 分区：match / healing 发布（若测） | 对应 zone 字段正确； healing 说明弹窗 |
| BUD-08 | **`home`** | 首页搭子卡片 → 详情 | id 跳转正确 |
| BUD-09 | 账号 B | B 打开 A 的搭子详情 | 可读；不可删；可关注/聊天 |

---

## 5. `pet_discover_likes` + `pet_discover_daily` — 搭搭卡片

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| DIS-01 | Tab **搭搭** **`pet-discover`** | 右滑「喜欢」一只宠物 | `pet_discover_likes` 有记录；额度减少 |
| DIS-02 | 搭搭 | 左滑跳过 | 不重复推荐同一只（同会话内） |
| DIS-03 | 搭搭 | 查看「喜欢列表/汇总」入口（若有） | `getSummary` / `listMine` 与操作一致 |
| DIS-04 | 搭搭 | 当日额度用尽后再滑 | 提示额度不足 |
| DIS-05 | 搭搭 | 分享加次数（若 UI 有） | `addShareBonus` 后额度增加 |
| DIS-06 | **`pet-discover-detail`** | 从卡片进详情 | 展示正常；可跳搭子/宠证相关页 |

**前置**：A 至少 1 只 **`pets`** 且搭搭 feed 有可对 slide 的对象（自己或他人宠物档案）。

---

## 6. `social_posts` + `social_comments` — 社区

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| SOC-01 | Tab **社区** **`social`** | 下拉刷新 | `social_posts.listFeed` 有数据或空态 |
| SOC-02 | **`social-post`** | 发图文/话题动态 | `social_posts` 新增 |
| SOC-03 | **`social-detail`** | 看详情、点赞（本地/store） | 详情与列表一致 |
| SOC-04 | **`social-detail`** | 发表评论 | `social_comments` 新增；列表可见 |
| SOC-05 | **`social-detail`** | 删自己的评论（若有） | `social_comments.remove` |
| SOC-06 | **`social-detail`** | 删自己的帖子 | `social_posts.remove` |
| SOC-07 | 账号 B | B 看 A 的帖并评论 | 评论可见；B 不能删 A 的帖 |

---

## 7. `local_posts` — 同城寻宠/领养/救助

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| LOC-01 | **`home`** → **`local`** | 切换 tab：寻宠/领养/救助（若有） | `local_posts.listFeed` 按类型过滤 |
| LOC-02 | **`lost-publish`** | 发布寻宠 | `local_posts` type=lost |
| LOC-03 | **`adopt-publish`** / **`lost-publish`** | 发布领养 | type=adopt |
| LOC-04 | **`pet-rescue`** | 救助相关发布/列表 | 对应 type；列表可点详情 |
| LOC-05 | 详情 | 打开一条同城帖 | `local_posts.get`；非作者且未审核通过则 404 |

---

## 8. `user_follows` — 关注 / 互关

| ID | 角色 | 步骤 | 预期 |
|----|------|------|------|
| FOL-01 | A | 在 **`buddy-detail`** 关注 B 的作者 | `user_follows`：`followerOpenid=A`，`targetOpenid=B`，`status=1` |
| FOL-02 | A | 再点取消关注 | 记录删除或 `status=0` |
| FOL-03 | A→B | A 关注 B | A 侧 following=true |
| FOL-04 | B→A | B 再关注 A | 双方 **`chat`** 页显示 **互关好友**（或等价文案） |
| FOL-05 | A | 点自己的搭子帖 | **无关注按钮** / 不可关注自己 |
| FOL-06 | **`profile`** | 点关注/粉丝/喜欢等统计 | Bottom sheet 列表正常；进聊天带 `peerOpenid` |

---

## 9. `chat_threads` + `chat_messages` — 私信

| ID | 角色 | 步骤 | 预期 |
|----|------|------|------|
| CHAT-01 | A | **`messages`** 列表 | `chat_threads.listMine`；同一人不重复多条脏标题 |
| CHAT-02 | A | 从搭子详情发起聊天 | `chat_threads.ensure` 有 `threadId` |
| CHAT-03 | A | 发送文字 + 表情 | `chat_messages` 新增；A 气泡在右 |
| CHAT-04 | B | B 打开同一会话 | 2～3s 内轮询收到 A 的消息；头像左右正确 |
| CHAT-05 | B | B 回复 | A 端轮询收到 |
| CHAT-06 | A | 返回消息列表 | 最后一条预览、未读数更新（`markRead`） |
| CHAT-07 | 异常 | 未 ensure 线程时发送（若可复现） | 应提示缺少 threadId，不应静默失败 |
| CHAT-08 | 媒体 | 当前版本仅文案+表情（语音/图入口隐藏） | 无崩溃；旧 cloud:// 消息若存在，换链后可读 |

**双号必测**：CHAT-03～06 + FOL-04。

---

## 10. `events` + `event_interests` + `event_signups` + `event_qualify`

### 10.1 资质 `event_qualify`

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| EVT-Q1 | **`event-qualify`** | 个人资质提交 | `event_qualify` 有记录 |
| EVT-Q2 | **`event-qualify`** | 商家资质提交（role=merchant） | 字段写入完整 |
| EVT-Q3 | 再次进入 | 查看已提交状态 | `getMine` 展示 pending/状态 |

### 10.2 活动 `events` + 感兴趣 `event_interests`

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| EVT-01 | **`events`** / 首页活动 | 列表刷新 | 已审核活动可见 |
| EVT-02 | **`event-publish`** | 发布一场免费活动 | `events` 新增；`auditStatus: approved` |
| EVT-03 | **`event-detail`** | 打开详情 | 时间、地点、主理人信息正确 |
| EVT-04 | **`event-detail`** | 点「感兴趣」 | `event_interests` 去重记录；重复点不 duplicated |
| EVT-05 | **`event-poster`** | 生成分享海报/小程序码 | `system.getWxacode` 或页面生成成功 |
| EVT-06 | **`my-events`** | 我发布的活动 | `events.listMine` 含 EVT-02 |
| EVT-07 | 本人 | 删除/下架自己的活动（若有） | `events.remove` |

### 10.3 报名 `event_signups`

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| EVT-S1 | **`event-detail`** | B 报名（填联系人/宠物等） | `event_signups` 新增；展示 **核销码 + 二维码** |
| EVT-S2 | **`event-detail`** | B 再看已报名活动 | `getMyByEvent` 同一条 |
| EVT-S3 | **`my-events`** | B「我参加的」 | `event_signups.listMine` |
| EVT-S4 | **`event-host-signups`** | A（主办方）查看报名列表 | `listByEvent` 含 B |
| EVT-S5 | **`event-host-signups`** | A **输入核销码**核销 | `checkIn` 成功；重复核销提示已核销 |
| EVT-S6 | **`event-host-signups`** | A 扫码核销（相机权限） | 扫 B 的报名码成功或给出明确错误 |

---

## 11. `map_points` — 友好地图

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| MAP-01 | **`friendly-map`**（同城/首页入口） | 打开地图 | 已审核点 `auditStatus=approved` 显示 |
| MAP-02 | **`map-submit`** | 提交新标点 | 新增 `auditStatus: pending` |
| MAP-03 | 地图 | pending 点 | **他人不可见**；本人 `listMine` 可见 |
| MAP-04 | **控制台** | 将 MAP-02 的文档改为 `auditStatus: approved` | 地图上出现该点 |
| MAP-05 | 地图 | 点 marker 进搭子/详情（若绑定 buddyId） | 跳转正确 |

> 说明：`admin.reviewMapPoint` 云接口尚未实现，测试放行靠 **控制台改字段**。

---

## 12. `merchants` + `merchant_applies` — 商家

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| MER-01 | **`event-qualify`** 或商家入驻页 | 提交 **`merchant_applies`** | `auditStatus: pending` |
| MER-02 | 重复提交 | 再次点提交 | 提示审核中/已通过，不重复脏数据 |
| MER-03 | 撤回 | pending 时撤回（若有入口） | `merchant_applies.remove` |
| MER-04 | **控制台** | 手动在 **`merchants`** 建店或改 **`bizStatus: 1`** | — |
| MER-05 | **`service`** / 首页服务 | 门店列表 | `merchants.listFeed` 仅 `bizStatus=1` |
| MER-06 | **`merchant-detail`** | 进店详情 | `merchants.get` 成功 |
| MER-07 | **`service-book`** | 预约下单（若开放） | 本地 **`store` 订单** 有记录（订单不一定入云库） |

> 入驻 **审核通过** 无 admin 接口时：需在控制台把 apply 改为 approved 并关联 `merchantId`，或直接在 `merchants` 写入营业中门店。

---

## 13. `host_applies` + `clubs` + `club_members` — 主理人 / 俱乐部

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| CLB-01 | **`club-apply`** | 提交主理人申请 | `host_applies` pending |
| CLB-02 | **`my-clubs`** | 我创建的俱乐部 tab | `clubs.listMine` |
| CLB-03 | **`my-clubs`** | 我加入的 tab | `club_members.listMine` |
| CLB-04 | 俱乐部详情 | 加入俱乐部 | `club_members.join` |
| CLB-05 | 俱乐部详情 | 退出 | `club_members.leave` |
| CLB-06 | 广场 | 俱乐部列表 feed | 仅 `onlineStatus: online` 可见 |
| CLB-07 | **控制台** | 新 club 设 `onlineStatus: online` | CLB-06 可见 |

---

## 14. `pet_certs_public` — 电子宠证

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| CERT-01 | **`pet-cert`** | 档案完整且审核通过 | 展示 QR；无「微信扫一扫或」冗余文案 |
| CERT-02 | **`pet-cert`** | 点发布/同步公开（若有） | `pet_certs_public.publish` |
| CERT-03 | **`pet-cert-poster`** | 生成海报 | 图片可保存相册（授权） |
| CERT-04 | **`pet-cert-verify`** | 扫码/验真入口 | 能查到公开快照或合理空态 |

---

## 15. `banners` — 首页轮播

| ID | 步骤 | 预期 |
|----|------|------|
| BAN-01 | 控制台 `banners` 加 1～2 条（图链、跳转 path） | — |
| BAN-02 | **`home`** 下拉刷新 | 轮播展示；点击跳对应页 |

---

## 16. `splash_ads` — 开屏（见 SYS-02）

| ID | 步骤 | 预期 |
|----|------|------|
| SPL-01 | `splash_ads.getActive` 有有效广告 | **`splash-ad`** 展示 |
| SPL-02 | 点击广告跳转 | path 正确（如地图/活动） |
| SPL-03 | 无广告 | 跳过开屏 |

---

## 17. `points_ledger` — 积分

| ID | 页面 | 步骤 | 预期 |
|----|------|------|------|
| PTS-01 | **我的** | 查看积分 | 与 `users.points` 一致 |
| PTS-02 | 触发积分任务（签到/邀请等，若有入口） | 积分变化 | `points_ledger` 新增流水 |
| PTS-03 | 积分明细页（若有） | 打开列表 | `points_ledger.listMine` |

---

## 18. `sensitive_words` — 敏感词

| ID | 步骤 | 预期 |
|----|------|------|
| SW-01 | 控制台添加词条 `测试违禁词_xyz` | — |
| SW-02 | 搭子/社区/同城发布含该词 | 发布失败或前端提示 |
| SW-03 | Console：`sensitive_words.check` | 命中返回违规 |

---

## 19. `admin_users` — 运营后台（可选）

| ID | 步骤 | 预期 |
|----|------|------|
| ADM-01 | 云函数 Console 调 `admin.login`（`admin`/`demo` 仅开发） | 返回 adminToken |
| ADM-02 | `admin.me` | 身份正确 |
| ADM-03 | **上线前** | 改默认密码、设 `ADMIN_TOKEN_SECRET`；禁用 demo 自动建号 |

> 小程序内 **无完整运营后台 UI** 时，本段仅验证 API；审核商家/地图仍靠控制台改库。

---

## 20. 我的页聚合（跨多表）

| ID | 入口 | 步骤 | 预期 |
|----|------|------|------|
| PRO-01 | **`profile`** | 登录态展示宠物卡、积分、入口宫格 | 无报错 |
| PRO-02 | **`profile-edit`** | 改用户/宠物相关项 | 云同步成功 |
| PRO-03 | **`profile`** | Tab：我的活动 / 参加 / 搭子 / 社区 | 与 store + 云列表一致 |
| PRO-04 | **`profile`** | 俱乐部、主理人、订单（本地）入口 | 跳转正确 |

---

## 21. 推荐执行顺序（一条线走完全部）

```text
PRE → SYS → USER → PET → BAN/SPL
→ BUD → DIS → SOC → LOC
→ FOL + CHAT（A+B 双号）
→ EVT-Q → EVT → EVT-S（A 主办 + B 报名）
→ MAP → MER → CLB → CERT → PTS → SW
→ PRO 回归 → ADM（可选）
```

---

## 22. 缺陷记录表（测时随手填）

| 用例 ID | 现象 | 复现步骤 | 严重程度 | 备注 |
|---------|------|----------|----------|------|
| | | | P0/P1/P2 | |

**P0**：无法登录、无法发消息、报名/核销失败、云函数 500  
**P1**：列表缺数据、互关不准、媒体不显示  
**P2**：文案、样式、非主路径

---

## 23. 云侧快速核对（测完扫一眼控制台）

| 集合 | 你应能看到 |
|------|------------|
| `users` | A、B 各 ≥1 条 |
| `pets` | ≥1 宠物 |
| `buddy_posts` / `social_posts` / `local_posts` | 至少各 1 条测试帖 |
| `user_follows` | 互关测试时有 2 条方向或 status 正确 |
| `chat_threads` / `chat_messages` | 双号会话 + 若干 message |
| `events` / `event_signups` / `event_interests` | 发布 + 报名 + 感兴趣 |
| `map_points` | pending + approved 各测 1 |
| `merchant_applies` / `merchants` | 申请 +（手动）营业门店 |
| `host_applies` / `clubs` / `club_members` | 按是否测俱乐部 |
| `pet_certs_public` | 若执行了 publish |
| `banners` / `splash_ads` | 若配置了运营位 |
| `points_ledger` | 若有积分变动 |
| `sensitive_words` | 测试词条 |

---

## 24. 已知限制（测时不要误判为 Bug）

1. **商家入驻、地图标点**：无 `admin.review*` 小程序端时，需 **控制台改 `auditStatus` / `bizStatus` / `onlineStatus`** 才会在广场/地图/门店列表出现。  
2. **`useCloud: true`** 时，部分列表 **不再合并 MOCK 数据**，空列表请先 **自己发帖** 或控制台 seed。  
3. **搭子详情 `findBuddy`** 优先本地 store；云帖需从 **广场进详情** 或先 sync 到 store（以你当前版本行为为准，若仅 id 从分享进不来，记 P1）。  
4. **订单 `service-book`** 可能仅本地 **`store`**，不要求 `merchants` 外还有订单集合。  
5. **语音/图片私信** 入口已隐藏，用例以 **文字+表情** 为准。

---

文档位置：`chongwu/apps/wxapp/database/TEST-CASES.md`  
权限对照：`permissions.md` · 集合名单：`collections.json`
