# 云数据库集合创建指南

微信云开发使用的是 **集合（Collection）**，不是 MySQL 那种「表」。本项目一共 **21 个集合**，名称见 `collections.json`。

当前环境 ID：`cloud1-d8gnokqshc15dc3ae`

---

## 一、一共要建多少？

| 统计 | 数量 |
|------|------|
| 集合总数 | **21** |
| 你可能已有 | `users`（登录过则已有数据） |
| 建议今天先建 | 阶段 **1** 共 2 个：`users` + `pets` |
| 业务全量前 | 阶段 **1～6** 全部建齐 |

完整名单见 `collections.json` → `allNames`。

---

## 二、先创建什么？（分 6 期）

| 阶段 | 集合 | 说明 |
|------|------|------|
| **1** | `users`, `pets` | 登录、宠物档案（**最先**） |
| **2** | `buddy_posts`, `social_posts`, `social_comments`, `local_posts` | 搭搭、社区、同城 |
| **3** | `events`, `event_signups`, `event_qualify` | 活动 |
| **4** | `map_points` | 友好地图 |
| **5** | `merchants`, `merchant_applies`, `host_applies`, `clubs`, `club_members` | 商家与主理人 |
| **6** | `pet_certs_public`, `banners`, `splash_ads`, `points_ledger`, `sensitive_words`, `admin_users` | 运营配置 |

---

## 三、创建方式 A：控制台（最稳妥）

适合第一次、不装 CLI。

1. 打开 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html) → **云开发** → 进入环境 `cloud1-d8gnokqshc15dc3ae`。
2. 或浏览器打开 [云开发控制台](https://console.cloud.tencent.com/tcb) → 选择该环境。
3. 左侧 **数据库** → **集合** → **添加集合**。
4. 输入集合名（必须**完全一致**，全小写、下划线），例如 `pets` → 确定。
5. 重复直到本阶段集合建完。
6. 点进每个集合 → **权限设置** → 按 `permissions.md` 粘贴规则 → 保存。

**阶段 1 手动清单（今天）**

- [ ] `users`（若已有可跳过）
- [ ] `pets`

---

## 四、创建方式 B：CLI 清单脚本（不自动建表）

**CloudBase CLI 3.x 已移除 `tcb db createCollection`**，微信云开发的集合仍需在 **控制台手动添加**。

脚本只打印待建集合名称，方便逐项勾选：

```bash
cd chongwu/apps/wxapp/database
chmod +x init-collections.sh

./init-collections.sh 1      # 阶段 1：users、pets
./init-collections.sh 1-3    # 到活动模块为止
./init-collections.sh all    # 全部 21 个名称
```

指定环境：

```bash
TCB_ENV_ID=cloud1-d8gnokqshc15dc3ae ./init-collections.sh 2
```

CLI 文档库命令（查询/导入导出，**不能**建集合名）：

```bash
tcb db nosql --help
tcb db nosql execute --help
```

---

## 五、创建后必做：权限

1. 打开每个新建集合 → **权限设置**。
2. 对照 `permissions.md`：
   - `users` → 模板 A  
   - `pets` → 模板 B（或 write 先设 false，只走云函数）  
   - 运营/审核类 → 模板 C  

3. 保存后，在小程序 Console 再测一次 `require('./utils/cloud-api').login()`，确认 `users` 仍可写入。

---

## 六、字段 / 「表结构」在哪里？

云数据库**没有建字段界面**。字段定义见：

- **`schemas/users.schema.json`**、**`schemas/pets.schema.json`**（完整说明）  
- **`examples/*.document.json`**（单条文档长什么样）  
- **`INDEXES.md`**（推荐索引）  

写入规范：`auth.login` 自动按 users schema 写；`pets.save` 云函数按 pets schema 写。

## 七、建议你的实际操作顺序（今天）

1. 确认 `users`、`pets` 集合已创建。  
2. 阅读 **`schemas/README.md`**，对照字段。  
3. 给 `users`、`pets` 配权限（见 `permissions.md`）。  
4. 为 `users.openid`、`pets._openid` 建索引（见 **`INDEXES.md`**）。  
5. **重新上传部署** 云函数 `api`（含 `pets.listMine` / `pets.get` / `pets.save`）。  
6. 登录后 Console：`require('./utils/cloud-api').listMyPets()` 应返回 `{ list: [] }`。  

不必一次性建满 21 个集合；**按阶段建**即可。
