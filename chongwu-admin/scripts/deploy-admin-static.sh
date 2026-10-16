#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_ID="${TCB_ENV_ID:-${VITE_TCB_ENV:-}}"

if [[ -z "$ENV_ID" ]]; then
  if [[ -f .env.production ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env.production
    set +a
    ENV_ID="${VITE_TCB_ENV:-}"
  fi
fi

if [[ -z "$ENV_ID" ]]; then
  echo "错误: 请设置 TCB_ENV_ID 或 .env.production 中的 VITE_TCB_ENV"
  exit 1
fi

if ! command -v cloudbase >/dev/null 2>&1 && ! command -v tcb >/dev/null 2>&1; then
  echo "错误: 未安装 CloudBase CLI。执行: npm install -g @cloudbase/cli && cloudbase login"
  exit 1
fi

"$ROOT/scripts/build-admin.sh"

CLI="cloudbase"
if ! command -v cloudbase >/dev/null 2>&1; then
  CLI="tcb"
fi

echo "==> 上传 dist/ 到静态网站托管（环境: $ENV_ID）"
if [[ "$CLI" == "cloudbase" ]]; then
  cloudbase hosting deploy dist -e "$ENV_ID"
else
  tcb hosting deploy dist -e "$ENV_ID"
fi

echo "==> 上传完成。请在云开发控制台将静态站域名加入 Web 安全域名。"
