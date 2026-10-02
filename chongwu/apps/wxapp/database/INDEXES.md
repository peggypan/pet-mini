# 推荐索引（控制台创建）

云开发控制台 → **数据库** → 选中集合 → **索引管理** → **添加索引**。

## users

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_unique` | `openid` 升序 | ✅ 是 | 按 openid 查用户、登录 |

## pets

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_updated` | `_openid` 升序 + `updatedAt` 降序 | 否 | 我的宠物列表 |
| `audit_updated` | `auditStatus` 升序 + `updatedAt` 降序 | 否 | 运营审核列表（后续 admin） |

> `_openid` 与业务字段 `openid` 建议云函数写入时保持一致。

## splash_ads

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `status_sort` | `status` + `sortOrder` 降序 | 否 | 取当前生效开屏 |
| `status_updated` | `status` + `updatedAt` 降序 | 否 | 运营列表 |

## banners

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `status_sort` | `status` + `sortOrder` 升序 | 否 | 首页轮播列表 |
| `city_status` | `city` + `status` | 否 | 按城市投放（可选） |

## pet_certs_public

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `petId_unique` | `petId` 升序 | ✅ 是 | 按宠物查公开宠证 |
| `openid_updated` | `_openid` + `updatedAt` 降序 | 否 | 我发布的宠证 |

## club_members

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `club_openid` | `clubId` + `_openid` | 否 | 是否已加入某俱乐部 |
| `openid_joined` | `_openid` + `joinedAt` 降序 | 否 | 我加入的俱乐部 |
| `club_joined` | `clubId` + `joinedAt` 降序 | 否 | 某俱乐部成员列表 |

## clubs

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `online_updated` | `onlineStatus` + `updatedAt` 降序 | 否 | 推荐/广场俱乐部 |
| `city_online` | `city` + `onlineStatus` | 否 | 按城市筛选 |
| `openid_updated` | `_openid` + `updatedAt` 降序 | 否 | 我管理的俱乐部 |

## host_applies

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_updated` | `_openid` + `updatedAt` 降序 | 否 | 我的最新主理人申请 |
| `audit_updated` | `auditStatus` + `updatedAt` 降序 | 否 | 运营审核列表 |

## merchant_applies

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_updated` | `_openid` + `updatedAt` 降序 | 否 | 我的最新申请 |
| `audit_updated` | `auditStatus` + `updatedAt` 降序 | 否 | 运营入驻审核列表 |

## merchants

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `biz_updated` | `bizStatus` + `updatedAt` 降序 | 否 | 营业中门店列表 |
| `city_biz` | `city` + `bizStatus` | 否 | 按城市筛选 |
| `openid_updated` | `_openid` + `updatedAt` 降序 | 否 | 我的门店 |

## map_points

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `feed_created` | `auditStatus` + `createdAt` 降序 | 否 | 已审核点位列表 |
| `city_created` | `city` + `createdAt` 降序 | 否 | 按城市筛选（可选） |
| `openid_created` | `_openid` + `createdAt` 降序 | 否 | 我的投稿 |

## event_qualify

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_role` | `_openid` + `role` | 否 | 按角色查我的资质（业务上每人每角色一条） |
| `status_updated` | `verifyStatus` + `updatedAt` 降序 | 否 | 运营审核列表（后续 admin） |

## event_signups

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `event_openid` | `eventId` + `_openid` | 否 | 同一活动我的报名 |
| `openid_created` | `_openid` + `createdAt` 降序 | 否 | 我报名的活动 |
| `ticket_unique` | `ticketCode` 升序 | ✅ 是 | 核销码唯一（可选） |

## events

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `feed_created` | `auditStatus` + `createdAt` 降序 | 否 | 活动广场 |
| `openid_created` | `_openid` + `createdAt` 降序 | 否 | 我发起的活动 |

## local_posts

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `feed_created` | `type` + `createdAt` 降序 | 否 | 同城列表（可选 `city` 条件） |
| `openid_created` | `_openid` + `createdAt` 降序 | 否 | 我的发布 |

## social_comments

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `post_created` | `postId` 升序 + `createdAt` 降序 | 否 | 某帖评论列表 |

## buddy_posts

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `feed_created` | `auditStatus` + `createdAt` 降序 | 否 | 广场列表（可选，无则云函数内存排序） |
| `openid_created` | `_openid` + `createdAt` 降序 | 否 | 我的搭子 |

## chat_threads

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_peer` | `openid` + `peerId` | ✅ 是 | 同用户同搭子一条会话 |
| `openid_updated` | `openid` + `updatedAt` 降序 | 否 | 私信列表排序 |

## chat_messages

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `thread_created` | `threadId` + `createdAt` 升序 | 否 | 会话内消息时间序 |

## pet_discover_likes

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_target` | `openid` + `targetId` | ✅ 是 | 同用户对同一搭子只记一条喜欢 |
| `openid_liked` | `openid` + `likedAt` 降序 | 否 | 我的喜欢列表 |

## pet_discover_daily

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_date` | `openid` + `date` | ✅ 是 | 每日额度一条 |

## admin_users

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `username_unique` | `username` 升序 | ✅ 是 | 登录账号 |
| `status_created` | `status` + `createdAt` 降序 | 否 | 管理员列表 |

## sensitive_words

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `word_unique` | `word` 升序 | ✅ 是 | 词条去重 |
| `status_created` | `status` + `createdAt` 降序 | 否 | 启用词列表 |

## points_ledger

| 索引名称 | 字段 | 唯一 | 说明 |
|----------|------|------|------|
| `openid_created` | `_openid` + `createdAt` 降序 | 否 | 我的积分流水 |
| `refId_openid` | `refId` + `_openid` | 否 | 幂等入账（同一 ref 不重复记） |

## CLI（可选）

部分 CloudBase CLI 版本支持：

```bash
export TCB_ENV_ID=cloud1-d8gnokqshc15dc3ae
# 以控制台为准；CLI 命令因版本而异，失败请用手动创建
```
