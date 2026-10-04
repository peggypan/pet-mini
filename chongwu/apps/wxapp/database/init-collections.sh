#!/usr/bin/env bash
# 微信云开发 · 集合创建清单
#
# CloudBase CLI 3.x 已移除 tcb db createCollection，集合请在
# 「微信开发者工具 → 云开发 → 数据库 → 添加集合」中手动创建。
# 本脚本只输出待建集合名称，便于对照勾选。
#
# 用法：
#   ./init-collections.sh          # 全部 25 个
#   ./init-collections.sh 1        # 第 1 阶段
#   ./init-collections.sh 1-3

set -euo pipefail

ENV_ID="${TCB_ENV_ID:-cloud1-d8gnokqshc15dc3ae}"
PHASE_ARG="${1:-all}"

PHASE1=(users pets)
PHASE2=(buddy_posts pet_discover_likes pet_discover_daily social_posts social_comments local_posts chat_threads chat_messages user_follows)
PHASE3=(events event_signups event_interests event_qualify)
PHASE4=(map_points)
PHASE5=(merchants merchant_applies host_applies clubs club_members)
PHASE6=(pet_certs_public banners splash_ads points_ledger sensitive_words admin_users)

ALL=("${PHASE1[@]}" "${PHASE2[@]}" "${PHASE3[@]}" "${PHASE4[@]}" "${PHASE5[@]}" "${PHASE6[@]}")

pick_list() {
  case "$PHASE_ARG" in
    all) printf '%s\n' "${ALL[@]}" ;;
    1) printf '%s\n' "${PHASE1[@]}" ;;
    2) printf '%s\n' "${PHASE2[@]}" ;;
    3) printf '%s\n' "${PHASE3[@]}" ;;
    4) printf '%s\n' "${PHASE4[@]}" ;;
    5) printf '%s\n' "${PHASE5[@]}" ;;
    6) printf '%s\n' "${PHASE6[@]}" ;;
    1-2) printf '%s\n' "${PHASE1[@]}" "${PHASE2[@]}" ;;
    1-3) printf '%s\n' "${PHASE1[@]}" "${PHASE2[@]}" "${PHASE3[@]}" ;;
    1-4) printf '%s\n' "${PHASE1[@]}" "${PHASE2[@]}" "${PHASE3[@]}" "${PHASE4[@]}" ;;
    1-5) printf '%s\n' "${PHASE1[@]}" "${PHASE2[@]}" "${PHASE3[@]}" "${PHASE4[@]}" "${PHASE5[@]}" ;;
    *)
      echo "未知参数: $PHASE_ARG （可用 all | 1 | 2 | … | 6 | 1-3 等）" >&2
      exit 1
      ;;
  esac
}

echo "环境 ID: ${ENV_ID}"
echo "范围: ${PHASE_ARG}"
echo ""
echo "⚠️  tcb db createCollection 在 CLI 3.x 中已不存在，请用控制台创建："
echo "    微信开发者工具 → 云开发 → 数据库 → 添加集合"
echo ""
echo "待创建 / 核对的集合（名称需完全一致）："
echo "---"

while IFS= read -r col; do
  [[ -z "$col" ]] && continue
  echo "  [ ] ${col}"
done < <(pick_list)

echo "---"
echo "共 $(pick_list | wc -l | tr -d ' ') 个"
echo ""
echo "创建后请配置权限: database/permissions.md"
echo "字段说明: database/schemas/*.schema.json"

if command -v tcb >/dev/null 2>&1; then
  echo ""
  echo "（可选）当前 CLI 版本: $(tcb --version 2>/dev/null | head -1 || echo 'unknown')"
  echo "文档库管理命令: tcb db nosql --help （无 createCollection，仅 query/insert 等）"
fi
