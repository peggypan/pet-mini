# 宠头头 · 运营后台

对应小程序 `chongwu/apps/wxapp` 的管理端。浏览器通过 **`@cloudbase/js-sdk`** 调用云函数 **`api`**（与小程序同一套 `module.action`），无需自建 Node BFF。

## 功能模块（与小程序对齐）

| 模块 | 说明 |
|------|------|
| 工作台 | 待办汇总、核心指标 |
| 用户与宠物 | C 端用户、宠物档案、电子宠证快照 |
| 社区动态 | 帖子审核、评论、话题、分区 |
| 搭子广场 | 遛狗/社交邀约帖（**已接云** `admin_feed.listBuddyPosts`） |
| 活动 | 活动列表、报名核销、活动发布资质（无保证金） |
| 友好地图 | 用户标点审核、积分发放 |
| 寻宠救助 | 走失/招领/领养/救助信息 |
| 商家 | 入驻审核、门店与服务 |
| 主理人与俱乐部 | 成为主理人审核、活动发布资质、俱乐部管理、成员 |
| 内容运营 | 首页 Banner、开机广告 |
| 积分 | 积分流水与规则 |
| 系统设置 | 敏感词、社区分区 |

## 本地运行

```bash
cd chongwu-admin
cp .env.example .env.local
# 编辑 VITE_TCB_ENV=cloud1-xxx（与 wxapp config/cloud-env.js 一致）
npm install
npm run dev
```

- 访问 http://localhost:5173  
- 登录：云函数 `admin.login`；`admin_users` 为空时首次可用 **`admin` / `demo`**（仅开发环境表单预填，上线前改密）。  
- 云开发控制台需允许 **Web 安全域名**（本地含 `localhost`）；可选配置 **Publishable Key** → `VITE_TCB_ACCESS_KEY`。  
- 侧边栏待办角标来自 **`admin_feed.summaryCounts`**（约 60 秒刷新；进入列表页后以列表 pending 为准）。

## 部署（完整步骤）

**详见 [docs/DEPLOY.md](./docs/DEPLOY.md)** — 环境变量、控制台配置、编译与上传脚本。

快捷命令：

```bash
npm run build              # 编译 → dist/
npm run build:check-env    # 校验 VITE_TCB_ENV 后编译
npm run deploy:static      # 编译 + CloudBase CLI 上传静态托管（需 cloudbase login）
npm run deploy:api:help    # 云函数 api 部署说明
```

## 代码入口

| 文件 | 作用 |
|------|------|
| `src/services/cloudbase-client.ts` | 初始化 SDK、匿名登录、`callFunction('api')` |
| `src/services/cloud-api.ts` | `callApi(module, action)` + `adminToken` |
| `src/services/buddy.ts` | 搭子列表示例 |
| `src/services/auth.ts` | `admin.login` |

## 可选：Node BFF

`server/` 为早期 **SecretId/Key 转发** 方案，**默认不必启动**。仅当 Web SDK 调云函数受限时可作备用。

## 对接文档

详见 **[docs/admin-database-integration.md](./docs/admin-database-integration.md)**。
