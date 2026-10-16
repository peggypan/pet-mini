# 宠头头运营后台 · 部署手册

本后台是 **Vite 静态 SPA**，通过 **`@cloudbase/js-sdk`** 在浏览器里调用与小程序相同的云函数 **`api`**。无需启动 `server/`（Node BFF）。

---

## 一、前置条件

| 项 | 说明 |
|----|------|
| 云开发环境 | 与小程序 `chongwu/apps/wxapp/config/cloud-env.js` 的 **`envId`** 一致 |
| 云函数 `api` | 代码目录 `chongwu/apps/wxapp/cloudfunctions/api`，需 **上传并部署：云端安装依赖** |
| 数据库集合 | 参考 `chongwu/apps/wxapp/database/`；至少含 `admin_users` 及业务集合 |
| Node.js | 建议 18+（本地构建 Admin） |

---

## 二、环境变量（Admin 前端）

Vite 只暴露以 **`VITE_`** 开头的变量。

### 本地开发

```bash
cd chongwu-admin
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# 必填：与 wxapp config/cloud-env.js 的 envId 一致
VITE_TCB_ENV=cloud1-d8gnokqshc15dc3ae

# 强烈建议：Publishable Key（配置后 Admin 可不依赖控制台「匿名登录」）
# VITE_TCB_ACCESS_KEY=your-publishable-key

# 可选，默认 ap-shanghai
# VITE_TCB_REGION=ap-shanghai
```

### 生产构建

生产环境使用 **`.env.production`** 或 **`.env.production.local`**（不要提交含密钥的文件到 Git）：

```bash
cp .env.example .env.production
# 填入正式 VITE_TCB_ENV、VITE_TCB_ACCESS_KEY
```

构建时 Vite 会自动加载 `.env.production`。

| 变量 | 必填 | 说明 |
|------|------|------|
| `VITE_TCB_ENV` | 是 | 云开发环境 ID |
| `VITE_TCB_ACCESS_KEY` | 建议 | Publishable Key；与匿名登录配合使用，**不能单独**替代 `signInAnonymously` |
| `VITE_TCB_REGION` | 否 | 默认 `ap-shanghai` |

---

## 三、云开发控制台配置（必做）

1. 打开 [云开发控制台](https://console.cloud.tencent.com/tcb) → 选择环境 `VITE_TCB_ENV`。
2. **Web 端域名白名单**（控制台文案可能是 **「跨域域名」**，与文档 **「安全来源 / 安全域名」** 是同一类配置，不是静态托管里的 Referer 防盗链）：
   - 路径常见：**环境配置 → 安全配置 / 安全来源** → **添加跨域域名**（或「添加域名」）
   - 填写 **不要带** `http://` / `https://`，可带端口，例如：
     - 本地 Vite：`localhost:5173`、`127.0.0.1:5173`
     - 生产：`你的域名.tcloudbaseapp.com` 或自定义域名
   - 保存后约 1～2 分钟生效（个别环境更久）
3. **匿名登录（Admin Web 必开）**：**登录授权 → 身份源列表**（或 **身份认证 → 登录方式**）→ 开启 **匿名登录**。  
   Publishable Key **不能替代**匿名登录；SDK 调 `callFunction('api')` 前仍需 `signInAnonymously()` 建立会话。
4. **Publishable Key（建议）**：**API Key** → **Publishable Key** → 写入 `VITE_TCB_ACCESS_KEY`（与匿名登录同时使用）。
5. **云函数调用权限（遇 `EXCEED_AUTHORITY` 必查）** — 与身份认证里「所有 APIs」是**两套**机制：  
   - **A. 身份认证 → 权限控制 → 匿名用户**：建议额外添加 **资源类型「网关」→ 云函数**（`FunctionsHttpApiAllow`），不要只依赖「所有 APIs / APIs 类型」。  
   - **B. 云函数安全规则（常见根因）** — 环境级 JSON，与「身份认证 → 匿名用户」不是同一页。入口因控制台版本不同：  
     - **方式 1（微信小程序云环境，优先）**：微信开发者工具打开 `chongwu/apps/wxapp` → **云开发** → **云函数** → 页顶 **「安全规则」/「权限控制」**（或 **设置 → 权限设置** 里链接到安全规则）。  
     - **方式 2（旧版腾讯云控制台）**：[console.cloud.tencent.com/tcb](https://console.cloud.tencent.com/tcb) → 选环境 → 左侧 **云函数**（不是「云函数/托管」子菜单）→ 函数列表页**顶部按钮「权限控制」**（文档：[云函数安全规则](https://docs.cloudbase.net/cloud-function/security-rules)）。  
     - **方式 3（新版云开发平台）**：左侧 **云函数/托管 → 函数管理** → 进入函数列表后看**页面顶部**是否有 **权限控制**；若只有「新建/层管理/在线开发」而没有权限按钮，请改用方式 1 或 2。  
     - 规则示例：[`docs/cloud-function-invoke-rules.example.json`](./cloud-function-invoke-rules.example.json)（为 **`api` 配置 `"invoke": true`**）。  
   - **C. 微信开发者工具**：**云开发 → 设置 → 权限设置 → 未登录用户访问云资源** 打开（[说明](https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/guide/functions/security-rules)）。  
   文档：[EXCEED_AUTHORITY](https://docs.cloudbase.net/error-code/service/EXCEED_AUTHORITY)、[云函数安全规则](https://docs.cloudbase.net/cloud-function/security-rules)
6. **云函数 `api`**：确认已部署最新代码（含 `admin_feed.*`、`admin.login` 等路由）。

### 管理员账号

- 集合 **`admin_users`** 为空时，首次可用云函数 **`admin.login`** 的默认账号 **`admin` / `demo`**（见云函数实现）。
- **上线前务必改密**并在库中维护正式管理员。

---

## 四、本地运行与编译

```bash
cd chongwu-admin
npm install
npm run dev          # http://localhost:5173
npm run build        # 产物 dist/
npm run preview      # 本地预览 dist
npm run lint         # oxlint
```

或使用脚本（见第五节）：

```bash
./scripts/build-admin.sh
```

---

## 五、脚本说明

| 脚本 | 作用 |
|------|------|
| `scripts/build-admin.sh` | 检查 `VITE_TCB_ENV` 后执行 `npm run build` |
| `scripts/deploy-admin-static.sh` | 构建 + 使用 CloudBase CLI 上传到 **静态网站托管** |
| `scripts/deploy-cloud-api.sh` | 打印云函数 `api` 部署步骤（微信开发者工具为主） |

### 5.1 仅编译 Admin

```bash
cd chongwu-admin
chmod +x scripts/build-admin.sh
./scripts/build-admin.sh
```

### 5.2 编译并上传静态站（CloudBase CLI）

```bash
npm install -g @cloudbase/cli
cloudbase login

cd chongwu-admin
chmod +x scripts/deploy-admin-static.sh
export TCB_ENV_ID=cloud1-your-env-id   # 或与 .env.production 中 VITE_TCB_ENV 相同
./scripts/deploy-admin-static.sh
```

CLI 常见命令（版本略有差异，以 `cloudbase hosting --help` 为准）：

```bash
cloudbase hosting deploy dist -e "$TCB_ENV_ID"
# 或历史命令：tcb hosting deploy dist -e "$TCB_ENV_ID"
```

上传完成后，在控制台 **静态网站托管** 中查看访问地址，并 **将该域名加入 Web 安全域名**。

### 5.3 部署云函数 `api`（小程序侧）

**推荐：微信开发者工具**

1. 打开项目：`chongwu/apps/wxapp`
2. 云开发 → 云函数 → 选中 **`api`**
3. 右键 → **上传并部署：云端安装依赖**
4. 修改 `handlers/` 或 `router.js` 后需重复上传

**可选：CloudBase CLI**（需已在该环境关联函数）

```bash
cd chongwu/apps/wxapp/cloudfunctions/api
cloudbase functions:deploy api -e "$TCB_ENV_ID"
```

具体子命令以当前 CLI 文档为准；团队若统一用开发者工具，可忽略 CLI。

---

## 六、部署检查清单

- [ ] `VITE_TCB_ENV` 与小程序 `cloud-env.js` 一致  
- [ ] 生产构建已注入 `VITE_TCB_ACCESS_KEY`（如使用）  
- [ ] Web 安全域名包含 **localhost**（开发）与 **静态站域名**（生产）  
- [ ] 云函数 **`api`** 已部署最新版  
- [ ] `admin.login` 可登录；`admin_feed.summaryCounts` 工作台有数据  
- [ ] 已修改默认 **admin/demo** 密码  

---

## 七、常见问题

**Web 登录 / callFunction 失败**

- 检查 `VITE_TCB_ENV`、跨域域名、匿名登录是否开启  
- 浏览器控制台看 `ensureCloudbaseReady` 报错文案  

**`EXCEED_AUTHORITY` / Request exceeds granted authority**

- 表示 Web **调云函数**被拦（不是 admin 密码错）  
- 若身份认证里「匿名用户」已是「所有 APIs 允许」仍报错 → 几乎一定是 **云函数安全规则** 未放行 `api`（或规则为「禁止 ANONYMOUS」）  
- 按第三节第 5 步 **B + C**，保存后等数分钟再试  

**登录成功但列表为空**

- 云库是否有数据；集合权限是否允许云函数读写（云函数端通常用管理员权限）  

**角标不准**

- 侧边栏待办来自 `admin_feed.summaryCounts`，进入具体列表页后会以列表内 pending 数覆盖该菜单项  

---

## 八、相关文档

- [admin-database-integration.md](./admin-database-integration.md) — 页面与云 API 映射  
- [../README.md](../README.md) — 项目概览  
- 小程序数据库：`chongwu/apps/wxapp/database/README.md`
