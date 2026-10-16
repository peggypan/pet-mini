#!/usr/bin/env bash
# 云函数 api 部署说明（主路径：微信开发者工具）
set -euo pipefail

API_DIR="$(cd "$(dirname "$0")/../../chongwu/apps/wxapp/cloudfunctions/api" && pwd)"

cat <<EOF
========================================
  云函数 api 部署（宠头头小程序）
========================================

代码目录:
  $API_DIR

【推荐】微信开发者工具:
  1. 打开小程序: chongwu/apps/wxapp
  2. 云开发 → 云函数 → api
  3. 右键 → 上传并部署：云端安装依赖

【可选】CloudBase CLI（需已 login 且环境正确）:
  npm install -g @cloudbase/cli
  cloudbase login
  cd "$API_DIR"
  cloudbase functions:deploy api -e YOUR_ENV_ID

部署后验证:
  - 小程序 cloudApi.ping() 或 admin 登录页能调 admin.login
  - 控制台云函数日志无 MODULE_NOT_FOUND

Admin 依赖的路由示例:
  admin.login, admin_feed.listUsers, admin_feed.summaryCounts, ...

EOF
