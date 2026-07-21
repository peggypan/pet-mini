# 微信云托管部署指南

## 前置条件

1. 已开通微信云开发：https://cloud.tencent.com/product/tcb
2. 已有微信小程序，获取到 AppID 和 AppSecret
3. 安装微信开发者工具

## 部署步骤

### 1. 开通云托管

1. 登录 [微信云开发控制台](https://console.cloud.tencent.com/tcb)
2. 选择你的小程序环境
3. 进入「云托管」页面，开通服务

### 2. 创建云数据库

微信云托管推荐使用云数据库 MySQL/PostgreSQL：

1. 在云开发控制台，进入「数据库」
2. 新建数据库，选择 PostgreSQL
3. 记录数据库连接信息（在「数据库」->「连接管理」中获取）

**数据库连接格式：**
```
postgresql://username:password@host:port/database
```

### 3. 配置环境变量

在云托管服务中配置以下环境变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| DATABASE_URL | 数据库连接 | `postgresql://user:pass@host:5432/db` |
| JWT_SECRET | JWT 密钥 | 自定义字符串 |
| JWT_EXPIRES_IN | JWT 过期时间 | `7d` |
| WX_APPID | 小程序 AppID | `wxXXXXXXXXXXXXXXXX` |
| WX_SECRET | 小程序 AppSecret | 在微信公众平台获取 |
| COS_SECRET_ID | 腾讯云密钥 ID | 在腾讯云访问管理获取 |
| COS_SECRET_KEY | 腾讯云密钥 Key | 在腾讯云访问管理获取 |
| COS_BUCKET | COS 存储桶名称 | `bucket-name` |
| COS_REGION | COS 区域 | `ap-guangzhou` |

### 4. 部署到云托管

#### 方式一：通过微信开发者工具

1. 打开微信开发者工具，打开你的小程序项目
2. 点击「云开发」->「云托管」
3. 创建服务，选择「容器」
4. 上传代码（chongwu 目录）
5. 配置环境变量
6. 部署

#### 方式二：通过 CloudBase CLI

```bash
# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 登录
cloudbase login

# 初始化（如果还没配置）
cloudbase init

# 部署
cd chongwu
cloudbase hosting deploy docker
```

### 5. 获取访问地址

部署完成后，在云托管服务详情页可以看到：
- 服务访问地址（如：`https://service-xxx.gz.apigw.tencentcs.com`）
- API 网关地址

### 6. 小程序配置 API 地址

在小程序代码中配置后端 API 地址：

```javascript
// config.js
const BASE_URL = 'https://your-service-url.tencentcs.com'
```

### 7. 数据库迁移

首次部署后，需要执行数据库迁移：

```bash
# 在云托管中，启动命令会自动执行
npx prisma migrate deploy
```

## 费用说明

微信云托管按量计费：

| 资源 | 免费额度 | 超出费用 |
|------|----------|----------|
| CPU | 0.5核 * 15小时/月 | ¥0.00007/核/秒 |
| 内存 | 1GB * 15小时/月 | ¥0.000017/GB/秒 |
| 数据库 | 1GB 存储 | ¥0.04/GB/天 |

## 常见问题

### 1. Dockerfile 路径问题
确保 Dockerfile 在 chongwu 目录根目录

### 2. 数据库连接失败
- 检查 DATABASE_URL 格式
- 确认数据库已开通外网访问
- 检查安全组规则

### 3. 端口配置
云托管会自动分配端口，应用监听 3000 端口即可

## 下一步

- [ ] 开通云托管
- [ ] 创建云数据库
- [ ] 获取数据库连接信息
- [ ] 配置环境变量
- [ ] 部署服务
- [ ] 测试 API 连接
