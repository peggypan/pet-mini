# 集合权限建议

云开发控制台 → **数据库** → 点集合名 → **权限设置** → 自定义安全规则。

云函数端拥有管理员权限，**不受**下列规则限制；规则主要约束小程序客户端直连 `wx.cloud.database()`（本项目中业务写入应尽量走 `api` 云函数）。

## A. 用户私有（users）

```json
{
  "read": "doc._openid == auth.openid",
  "write": false
}
```

## B. 用户创建的内容（pets、buddy_posts、social_posts、local_posts 等）

发布者 `_openid` 写在文档上时：

```json
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

审核流字段（如 `auditStatus`）变更建议**仅云函数**写，客户端 write 可先设 `false`，全部走 `api`。

## C. 仅云函数读写（推荐用于审核队列、积分、敏感词、admin）

```json
{
  "read": false,
  "write": false
}
```

适用：`event_qualify`、`merchants`（待审/下架）、`merchant_applies`、`host_applies` 待审、`clubs`（未上线）、`club_members`、`points_ledger`、`sensitive_words`、`admin_users`、`pet_discover_likes`、`pet_discover_daily`、`chat_threads`、`chat_messages`、未上架的 `map_points` 等（读列表仍走云函数聚合）。

已营业门店（`bizStatus: 1`）的列表与详情仍建议**只走 `merchants.listFeed` / `get` 云函数**，客户端集合权限保持 read/write false。

## D. 公开只读配置（banners、splash_ads、pet_certs_public 读）

```json
{
  "read": true,
  "write": false
}
```

写由运营后台 / 管理员云函数完成。

## E. 评论（social_comments）

```json
{
  "read": true,
  "write": "doc._openid == auth.openid"
}
```

---

**第一期最少配置**：`users` 用 A；新建 `pets` 用 B 或暂时 B 且 write false（只走云函数）。
