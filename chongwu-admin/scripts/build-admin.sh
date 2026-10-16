#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env.production ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.production
  set +a
elif [[ -f .env.local ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env.local
  set +a
fi

if [[ -z "${VITE_TCB_ENV:-}" ]]; then
  echo "错误: 未设置 VITE_TCB_ENV。请先配置 .env.local 或 .env.production"
  echo "示例: cp .env.example .env.production && 编辑 VITE_TCB_ENV"
  exit 1
fi

echo "==> 构建 Admin（env: ${VITE_TCB_ENV}）"
npm run build
echo "==> 完成: $ROOT/dist"
