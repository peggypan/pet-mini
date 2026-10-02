# 集合字段说明（users / pets）

微信云数据库 **没有** MySQL 式的「建表 SQL」。集合建好后是 **无模式（Schemaless）** 的：

- 字段在 **第一次写入文档** 时自动出现；
- 本项目用 **本文档 + 云函数写入规范** 作为「表结构」；
- 控制台可为常用查询 **建索引**（见 `../INDEXES.md`）。

云函数 `auth.login` 已按 `users.schema.json` 写入用户；`pets.save` / `buddy_posts.save` 按对应 schema 写入。

## 文件

| 文件 | 集合 |
|------|------|
| `users.schema.json` | users |
| `pets.schema.json` | pets |
| `buddy_posts.schema.json` | buddy_posts |
| `../examples/users.document.json` | 单条 users 示例（勿直接导入生产） |
| `../examples/pets.document.json` | 单条 pets 示例 |

## 你需要做什么

1. **不必**在控制台「建字段」——保持集合空表即可。  
2. 阅读两个 schema 文件，确认与产品一致。  
3. 按 `../INDEXES.md` 在控制台为 `openid`、`pets._openid` 等建索引（推荐）。  
4. **重新上传** 云函数 `api`（含 `pets`  handler 后）。  
5. 小程序登录 → 自动写入 `users`；保存档案 → 调用 `pets.save` 写入 `pets`。
