# 微信云开发接入规划

## 建议集合（云数据库）

| 集合 | 用途 |
|------|------|
| `users` | 用户 openid、昵称、phone、city、deviceModel、ipRegion、status |
| `pets` | 宠物档案（保存即 `approved`，无待审门禁）、rejectReason（运营隐藏/违规）、avatarUrl、galleryPhotos、vaccineProofUrl、vaccineStatus、`emergencyContactName`、`emergencyContactPhone`、常活动区域；列表展示主人 `users.phone` |
| `pet_certs_public` | 电子宠证公开快照（扫码查验） |
| `social_posts` | 社区动态；含 `lostType`（寻宠/招领/救助/领养）、`zone`、媒体；用户删帖保留 `userDeleted` |
| `social_comments` | 评论 |
| `buddy_posts` | 搭子帖（Tab 搭搭）；`zone` normal/match/healing、`buddyType`、`userDeleted`；档案疗愈卡片可虚拟 id `hp_{petId}` |
| `events` | 活动：`category` 含「疗愈活动」、`mediaList` 头图≤6、`detailContent`、`detailMediaList` 详情配图≤6、`role` personal/merchant；`status` 含 user_deleted |
| `event_signups` | 报名与核销码：`contactName`、`petName`、`petBreed`、`ticketCode` |
| `event_qualify` | 活动发布身份认证（通过即可发活动，无保证金） |
| `map_points` | 友好地图标点（含审核状态、`images` 场景图） |
| `local_posts` | 寻宠/领养/救助 |
| `merchants` / `merchant_applies` | 商家与入驻申请 |
| `host_applies` | 成为主理人 · club-apply 入驻 |
| `clubs` | 我的俱乐部（主理人档案） |
| `club_members` | 加入的俱乐部成员 |
| `banners` | 首页轮播 |
| `splash_ads` | 开机全屏广告（频次、跳过、投放期） |
| `points_ledger` | 积分流水 |
| `sensitive_words` | 敏感词 |
| `admin_users` | 后台管理员 |

## 云函数（示例）

- `admin.login` / `admin.me` — 管理员登录与鉴权（`adminToken`）  
- `admin_users.listFeed` / `save` / `remove` — 管理员账号维护（super）  
- `moderatePost` — 帖子上下架/精华（规划 `admin.moderatePost`）  
- `reviewMapPoint` — 标点有效 → 写积分流水（规划 `admin.reviewMapPoint`）  
- `reviewMerchantApply` — 商家审核（规划 `admin.reviewMerchantApply`）  

## 本仓库替换点

- `src/mock/*.ts` → 删除或仅 dev 使用  
- 新增 `src/services/cloud.ts` 封装调用  
- 页面中 `useEffect` 拉数改为 service 层  

## 小程序云开发（已搭骨架）

- 配置：`chongwu/apps/wxapp/config/cloud-env.js`（见 `cloud-env.example.js`）  
- 云函数：`chongwu/apps/wxapp/cloudfunctions/api`（统一 `module.action` 路由）  
- 客户端：`chongwu/apps/wxapp/utils/cloud-api.js`  
- 操作文档：`chongwu/docs/wechat-cloud-dev.md`  
- 已实现：`system.ping`、`auth.*`、`pets.*`、`buddy_posts.listFeed|listMine|get|save|remove`；其余模块在 `router.js` 中按序追加  
