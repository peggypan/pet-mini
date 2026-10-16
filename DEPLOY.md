# 宠头头 · 部署指南

Admin 运营后台与微信小程序共用同一云开发环境、同一云函数 **`api`** 与云数据库。数据打通后，按下列顺序部署即可。

---

## 0. 环境与一次性配置

| 项 | 说明 |
|----|------|
| **环境 ID** | 与 `chongwu/apps/wxapp/config/cloud-env.js` 的 `envId` 一致（当前示例：`cloud1-d8gnokqshc15dc3ae`） |
| **跨域域名** | 云开发控制台 → 安全配置 → **添加跨域域名**（勿带 `http://`）：本地 `localhost:5173`、`127.0.0.1:5173`；生产 Admin 静态站域名 |
| **匿名登录** | 身份认证 → **登录方式 / 身份源** → 开启 **匿名登录**（Admin Web 调云函数前需匿名会话） |
| **云函数网关权限** | 身份认证 → 权限控制 → **匿名用户** → 添加 **网关 → 云函数**（`FunctionsHttpApiAllow`） |
| **未登录访问云资源** | 微信开发者工具 → 云开发 → **设置 → 权限设置** → 开启 **未登录用户访问云资源** |
| **云函数安全规则** | 云函数 `api` 的环境级安全规则：允许 Web 调用 `api`（示例见 `chongwu-admin/docs/cloud-function-invoke-rules.example.json`） |
| **Publishable Key** | 云开发 → API Key → 写入 Admin 的 `VITE_TCB_ACCESS_KEY`（与匿名登录配合使用） |
| **管理员** | 上线前修改默认 `admin/demo`；维护 `admin_users` 集合 |

更细的 Admin 控制台说明见：[chongwu-admin/docs/DEPLOY.md](chongwu-admin/docs/DEPLOY.md)  
页面与云 API 映射见：[chongwu-admin/docs/admin-database-integration.md](chongwu-admin/docs/admin-database-integration.md)

---

## 1. 部署云函数 `api`（最先执行）

**代码目录：** `chongwu/apps/wxapp/cloudfunctions/api`  
Admin 与小程序均通过 `wx.cloud.callFunction({ name: 'api', ... })` / Web SDK 调用。

### 推荐：微信开发者工具

1. 打开小程序项目：`chongwu/apps/wxapp`
2. 确认云环境为上述 `envId`
3. **云开发 → 云函数 → `api`**
4. 右键 → **上传并部署：云端安装依赖**

### 可选：CloudBase CLI

```bash
npm install -g @cloudbase/cli
cloudbase login
cd chongwu/apps/wxapp/cloudfunctions/api
cloudbase functions:deploy api -e cloud1-d8gnokqshc15dc3ae
```

（子命令以当前 CLI 文档为准；团队若统一用开发者工具，可忽略 CLI。）

### 验证

- 小程序：首页 Banner、列表、发帖等正常
- Admin：能 `admin.login`，工作台 `summaryCounts` 有数据
- 云函数日志无 `MODULE_NOT_FOUND` 等错误

脚本说明（仅打印步骤）：

```bash
cd chongwu-admin && npm run deploy:api:help
```

---

## 2. 发布微信小程序（C 端）

1. 开发者工具 **预览 / 真机调试**，验证首页、社区、活动等
2. **上传** 代码（填写版本号与备注）
3. 微信公众平台 → **提交审核 → 发布**（或先 **体验版** 给内测成员）

小程序不单独「部署数据库」；数据已在云开发环境中，与 Admin 共用。

---

## 3. 部署运营后台 Admin（静态网站托管）

Admin 为 Vite 构建的 SPA，通过 `@cloudbase/js-sdk` 调用云函数，**无需**启动 `chongwu-admin/server/`。

### 3.1 生产环境变量

```bash
cd chongwu-admin
cp .env.example .env.production.local
```

编辑 `.env.production.local`（**勿提交 Git**）：

```env
VITE_TCB_ENV=cloud1-d8gnokqshc15dc3ae
VITE_TCB_ACCESS_KEY=你的 Publishable Key
VITE_TCB_REGION=ap-shanghai
```

本地开发使用 `.env.local`，见 `chongwu-admin/.env.example`。

### 3.2 构建

```bash
cd chongwu-admin
npm install
npm run build:check-env
# 或 ./scripts/build-admin.sh
```

产物目录：`chongwu-admin/dist/`。

### 3.3 上传到静态托管

```bash
npm install -g @cloudbase/cli
cloudbase login

cd chongwu-admin
export TCB_ENV_ID=cloud1-d8gnokqshc15dc3ae
chmod +x scripts/deploy-admin-static.sh
./scripts/deploy-admin-static.sh
```

或手动：

```bash
cloudbase hosting deploy dist -e cloud1-d8gnokqshc15dc3ae
```

### 3.4 上线后

1. 控制台 **静态网站托管** 查看访问域名（如 `*.tcloudbaseapp.com`）
2. 将该域名加入 **跨域域名** 白名单
3. 浏览器打开 Admin URL，登录并抽查 Banner、列表、审核操作

本地开发：`cd chongwu-admin && npm run dev` → http://localhost:5173

---

## 4. 推荐发布顺序

```text
1. 上传部署 cloudfunctions/api（云端安装依赖）
2. 小程序体验版 / 真机验证
3. Admin：build + 静态托管上传
4. 跨域域名加入 Admin 生产域名
5. 小程序提审 / 正式发布（按业务节奏）
```

**仅运营内测 Admin、小程序暂不对外：** 完成 **第 1 + 第 3 步** 即可；C 端需体验版或已发布版小程序访问同一云环境。

---

## 5. 上线自检（约 5 分钟）

- [ ] `VITE_TCB_ENV` 与 `cloud-env.js` 一致
- [ ] 云函数 `api` 为最新部署
- [ ] Admin 可登录，工作台与列表有数据
- [ ] Admin 修改 Banner 上线后，小程序首页可见（需已部署含 `banners.listFeed` 的 `api`）
- [ ] 跨域域名含 Admin 生产域名与本地开发域名
- [ ] 已修改默认管理员密码
- [ ] 小程序核心流程抽测通过

---

## 6. 常见问题

| 现象 | 处理 |
|------|------|
| Admin：身份源 / 匿名登录 | 开启匿名登录；配置 `VITE_TCB_ACCESS_KEY`；见 Admin DEPLOY 第三节 |
| Admin：`EXCEED_AUTHORITY` | 匿名用户网关云函数策略 + `api` 安全规则 + 未登录访问云资源 |
| Admin 登录成功但列表空 | 云库是否有数据；是否部署最新 `admin_feed` |
| 小程序 Banner 不显示 | 部署最新 `api`；Banner `status=1`；见 `banners.listFeed` 与城市/schedule 逻辑 |
| 跨域报错 | 控制台「跨域域名」，不是静态托管 Referer 防盗链 |

---

## 7. 仓库内相关路径

| 路径 | 说明 |
|------|------|
| `chongwu/apps/wxapp/` | 小程序 + 云函数 `api` |
| `chongwu/apps/wxapp/config/cloud-env.js` | 云环境 ID |
| `chongwu/apps/wxapp/database/` | 集合与权限说明 |
| `chongwu-admin/` | 运营后台前端 |
| `chongwu-admin/docs/DEPLOY.md` | Admin 详细部署与控制台配置 |
| `chongwu-admin/docs/cloud-function-invoke-rules.example.json` | `api` 安全规则示例 |
