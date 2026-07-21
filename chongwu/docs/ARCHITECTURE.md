# 宠享家·北京同城宠物小程序 - 架构设计文档

## 版本信息
- 版本：v1.0
- 日期：2025-05-21
- 状态：试运行架构设计

---

## 一、技术栈选型

### 1.1 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| 微信小程序原生 | 基础库 2.30+ | 用户端 + 商家端 |
| React 18 | - | 管理后台（可选 Vue 3） |
| Ant Design 5 | - | 管理后台 UI 组件库 |
| 腾讯地图 SDK | - | 地图、定位、距离计算 |
| 微信支付 SDK | - | 小程序支付 |

### 1.2 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20 LTS | 运行时 |
| NestJS | 10.x | Web 框架 |
| TypeScript | 5.x | 开发语言 |
| Prisma | 5.x | ORM + 数据库迁移 |
| Swagger | - | API 文档自动生成 |
| JWT | - | 认证授权 |
| class-validator | - | 请求参数校验 |

### 1.3 数据存储
| 技术 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 15 | 主数据库 |
| Redis | 7 | 缓存 + 会话 + 消息队列 |
| 腾讯云 COS | - | 图片/文件存储 |

### 1.4 基础设施
| 技术 | 版本 | 用途 |
|------|------|------|
| Docker | 24+ | 容器化部署 |
| Docker Compose | - | 本地开发/测试环境编排 |
| Nginx | - | 反向代理 + SSL + 静态资源 |
| PM2 | - | 生产环境 Node.js 进程管理 |

---

## 二、系统架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ 微信小程序    │  │ 微信小程序    │  │ React Admin      │  │
│  │  (用户端)     │  │  (商家端)     │  │  (管理后台)       │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┼────────────────────┘            │
│                           │ HTTPS                           │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      网关层                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Nginx                                                  ││
│  │  - SSL 终止                                             ││
│  │  - 静态资源服务                                         ││
│  │  - 反向代理 → API 服务                                  ││
│  │  - 限流/防刷                                            ││
│  └─────────────────────────────────────────────────────────┘│
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    API 服务层（NestJS）                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Auth    │ │ User    │ │ Merchant│ │ Service │          │
│  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Health  │ │ Mall    │ │ Social  │ │ Payment │          │
│  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│  │ Message │ │ Admin   │ │ Common  │ │ Config  │          │
│  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│                                                             │
│  公共组件：                                                  │
│  - 全局异常过滤器（Global Exception Filter）                 │
│  - JWT 认证守卫（JwtAuthGuard）                             │
│  - 角色守卫（RolesGuard）                                    │
│  - 请求日志拦截器（LoggingInterceptor）                      │
│  - 响应格式化拦截器（TransformInterceptor）                  │
│  - 地域限制中间件（BeijingOnlyMiddleware）                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌────────▼────────┐  ┌──────▼──────┐
│   PostgreSQL  │  │     Redis       │  │ 腾讯云 COS  │
│   (主数据库)   │  │  (缓存/会话/队列) │  │ (对象存储)   │
│               │  │                 │  │             │
│  - 主从复制    │  │  - 缓存热点数据  │  │  - 用户头像  │
│  - 自动备份    │  │  - 用户 Session │  │  - 商品图片  │
│  - 定时任务    │  │  - 限流计数器   │  │  - 动态图片  │
│               │  │  - 消息队列     │  │  - 资质文件  │
└───────────────┘  └─────────────────┘  └─────────────┘
```

---

## 三、项目目录结构

```
petchongwu/
├── apps/
│   ├── wxapp/                          # 微信小程序源码
│   │   ├── pages/
│   │   │   ├── index/                  # 首页
│   │   │   ├── service/                # 同城服务
│   │   │   ├── health/                 # 健康档案
│   │   │   ├── social/                 # 寻宠·领养·社交
│   │   │   ├── mall/                   # 商城
│   │   │   ├── idle/                   # 闲置交易（预留）
│   │   │   ├── training/               # 行为训练（预留）
│   │   │   ├── funeral/                # 宠物殡葬（预留）
│   │   │   ├── message/                # 消息中心
│   │   │   └── profile/                # 我的页面
│   │   ├── components/                 # 公共组件
│   │   ├── utils/                      # 工具函数
│   │   ├── services/                   # API 请求封装
│   │   └── app.json                    # 小程序配置
│   │
│   ├── merchant/                       # 商家端小程序
│   │   ├── pages/
│   │   │   ├── dashboard/              # 数据看板
│   │   │   ├── services/               # 服务管理
│   │   │   ├── products/               # 商品管理
│   │   │   ├── orders/                 # 订单管理
│   │   │   └── profile/                # 店铺信息
│   │   └── ...
│   │
│   └── admin/                          # 管理后台（React）
│       ├── src/
│       │   ├── pages/                  # 页面
│       │   ├── components/             # 组件
│       │   └── services/               # API 请求
│       └── ...
│
├── server/                             # 后端服务（NestJS）
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                   # 认证模块
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── strategies/
│   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   └── wx.strategy.ts
│   │   │   │   └── guards/
│   │   │   │       ├── jwt-auth.guard.ts
│   │   │   │       └── roles.guard.ts
│   │   │   │
│   │   │   ├── user/                   # 用户模块
│   │   │   ├── merchant/               # 商家模块
│   │   │   ├── service/                # 同城服务模块
│   │   │   ├── health/                 # 健康档案模块
│   │   │   ├── social/                 # 社交模块
│   │   │   ├── mall/                   # 商城模块
│   │   │   ├── payment/                # 支付模块
│   │   │   ├── message/                # 消息模块
│   │   │   ├── admin/                  # 后台管理模块
│   │   │   └── common/                 # 公共模块
│   │   │       ├── filters/            # 异常过滤器
│   │   │       ├── interceptors/       # 拦截器
│   │   │       ├── decorators/         # 装饰器
│   │   │       ├── pipes/              # 管道
│   │   │       └── middleware/         # 中间件
│   │   │           └── beijing-only.middleware.ts
│   │   │
│   │   ├── prisma/                     # Prisma 配置
│   │   │   ├── schema.prisma           # 数据模型定义
│   │   │   └── migrations/             # 数据库迁移文件
│   │   │
│   │   ├── config/                     # 配置文件
│   │   │   ├── database.config.ts
│   │   │   ├── redis.config.ts
│   │   │   ├── wx.config.ts
│   │   │   └── cos.config.ts
│   │   │
│   │   ├── main.ts                     # 应用入口
│   │   └── app.module.ts               # 根模块
│   │
│   ├── test/                           # 测试文件
│   ├── Dockerfile                      # Docker 构建
│   └── package.json
│
├── docker/                             # Docker 配置
│   ├── docker-compose.yml              # 开发环境编排
│   ├── docker-compose.prod.yml         # 生产环境编排
│   ├── nginx/
│   │   └── nginx.conf                  # Nginx 配置
│   └── init-scripts/                   # 初始化脚本
│
├── docs/                               # 文档
│   ├── ARCHITECTURE.md                 # 本文件
│   ├── DATABASE.md                     # 数据库设计文档
│   └── API.md                          # API 接口文档
│
└── scripts/                            # 部署脚本
    ├── deploy.sh
    └── backup.sh
```

---

## 四、核心模块设计

### 4.1 认证模块（Auth）

**微信登录流程：**
```
小程序前端          后端服务          微信服务器          数据库
    │                │                  │                │
    │ ──wx.login()──►│                  │                │
    │ ◄──code────────│                  │                │
    │                │──auth.code2Session──►│             │
    │                │◄──openid+session_key──│            │
    │                │                                    │
    │                │────查询/创建用户────►│             │
    │                │◄────用户信息─────────│             │
    │                │                                    │
    │◄──JWT Token────│                                    │
```

**接口设计：**
- `POST /auth/wx-login` - 微信小程序登录
- `POST /auth/refresh` - 刷新 Token
- `POST /auth/logout` - 退出登录

**Token 策略：**
- Access Token：JWT，有效期 2 小时
- Refresh Token：存储于 Redis，有效期 30 天

### 4.2 地域限制中间件

**实现方案：**
```typescript
// beijing-only.middleware.ts
@Injectable()
export class BeijingOnlyMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const userId = req.user?.id;
    const userLocation = await this.getUserLocation(userId);
    
    // 非北京用户限制操作
    if (!userLocation || userLocation.city !== '北京市') {
      const restrictedPaths = [
        '/api/services',
        '/api/products',
        '/api/orders',
        '/api/posts',
        '/api/lost-pets',
      ];
      
      if (restrictedPaths.some(path => req.path.startsWith(path))) {
        // GET 请求允许浏览，POST/PUT/DELETE 拦截
        if (req.method !== 'GET') {
          throw new ForbiddenException('该功能仅限北京地区使用');
        }
      }
    }
    
    next();
  }
}
```

### 4.3 支付模块（Payment）

**微信支付流程：**
```
用户                小程序              后端              微信支付
 │                   │                  │                  │
 │──选择商品/服务────►│                  │                  │
 │◄──展示订单────────│                  │                  │
 │──确认支付────────►│                  │                  │
 │                  │──创建订单────────►│                  │
 │                  │◄──订单信息────────│                  │
 │                  │                  │──统一下单────────►│
 │                  │                  │◄──prepay_id───────│
 │◄──调起支付────────│                  │                  │
 │──输入密码支付────►│                  │                  │
 │                  │                  │◄──支付结果回调────│
 │                  │                  │──更新订单状态────►│
 │◄──支付成功────────│                  │                  │
```

**分账逻辑：**
- 服务订单：平台抽成 8-12%，剩余转商家
- 商城订单：平台抽成 5-8%，剩余转商家
- 使用微信支付「服务商分账」功能

### 4.4 消息通知模块（Message）

**通知类型：**
1. **微信订阅消息**（免费，需用户授权）
   - 疫苗/驱虫到期提醒
   - 订单状态变更
   - 预约提醒
2. **站内消息**（数据库存储）
   - 系统公告
   - 私信
3. **短信通知**（付费，关键场景）
   - 验证码
   - 紧急寻宠推送

---

## 五、API 设计规范

### 5.1 统一响应格式
```typescript
// 成功响应
{
  "code": 200,
  "message": "success",
  "data": { ... },
  "timestamp": "2025-05-21T10:00:00.000Z"
}

// 分页响应
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [ ... ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}

// 错误响应
{
  "code": 400,
  "message": "参数错误",
  "errors": [
    { "field": "phone", "message": "手机号格式不正确" }
  ],
  "timestamp": "2025-05-21T10:00:00.000Z"
}
```

### 5.2 接口路径规范
```
/api/v1/auth/...        # 认证相关
/api/v1/users/...       # 用户相关
/api/v1/merchants/...   # 商家相关
/api/v1/services/...    # 同城服务
/api/v1/health/...      # 健康档案
/api/v1/social/...      # 社交模块
/api/v1/mall/...        # 商城模块
/api/v1/payment/...     # 支付模块
/api/v1/admin/...       # 后台管理
```

### 5.3 关键接口列表

#### 首页
- `GET /api/v1/home/banner` - 获取 Banner
- `GET /api/v1/home/categories` - 获取功能分类
- `GET /api/v1/home/recommendations` - 获取推荐内容

#### 同城服务
- `GET /api/v1/services/categories` - 服务分类
- `GET /api/v1/services` - 服务列表（支持筛选）
- `GET /api/v1/services/:id` - 服务详情
- `POST /api/v1/services/orders` - 创建服务订单
- `GET /api/v1/services/orders` - 我的服务订单

#### 健康档案
- `GET /api/v1/health/pets` - 我的宠物列表
- `POST /api/v1/health/pets` - 添加宠物
- `GET /api/v1/health/records/:petId` - 宠物健康记录
- `POST /api/v1/health/records` - 添加健康记录
- `GET /api/v1/health/reminders` - 到期提醒列表

#### 寻宠社交
- `GET /api/v1/social/lost-pets` - 寻宠列表
- `POST /api/v1/social/lost-pets` - 发布寻宠
- `GET /api/v1/social/adoptions` - 领养列表
- `GET /api/v1/social/posts` - 圈子动态
- `POST /api/v1/social/posts` - 发布动态

#### 商城
- `GET /api/v1/mall/categories` - 商品分类
- `GET /api/v1/mall/products` - 商品列表
- `GET /api/v1/mall/products/:id` - 商品详情
- `POST /api/v1/mall/orders` - 创建商品订单
- `GET /api/v1/mall/orders` - 我的商城订单

#### 支付
- `POST /api/v1/payment/unified-order` - 统一下单
- `POST /api/v1/payment/notify` - 支付回调
- `POST /api/v1/payment/refund` - 申请退款

---

## 六、部署方案

### 6.1 开发环境（Docker Compose）

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/petchongwu
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    volumes:
      - ./server:/app
      - /app/node_modules

  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=petchongwu
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./apps/admin/dist:/usr/share/nginx/html/admin
    depends_on:
      - app

volumes:
  postgres_data:
  redis_data:
```

### 6.2 生产环境部署架构

```
┌──────────────────────────────────────────────────┐
│                   阿里云/腾讯云                    │
│                                                   │
│  ┌─────────────┐                                 │
│  │   CDN       │  静态资源加速（图片、小程序资源）│
│  └──────┬──────┘                                 │
│         │                                         │
│  ┌──────▼──────┐  ┌─────────────┐  ┌──────────┐ │
│  │   SLB       │  │  云数据库    │  │ 云Redis  │ │
│  │  (负载均衡)  │  │ PostgreSQL  │  │          │ │
│  └──────┬──────┘  └─────────────┘  └──────────┘ │
│         │                                         │
│  ┌──────▼──────┐  ┌─────────────┐                │
│  │  ECS 1      │  │  ECS 2      │                │
│  │  NestJS     │  │  NestJS     │                │
│  │  + Nginx    │  │  + Nginx    │                │
│  └─────────────┘  └─────────────┘                │
│                                                   │
│  ┌─────────────┐  ┌─────────────┐                │
│  │ 腾讯云COS   │  │  云监控      │                │
│  │ 对象存储    │  │  + 日志服务  │                │
│  └─────────────┘  └─────────────┘                │
└──────────────────────────────────────────────────┘
```

### 6.3 部署脚本

```bash
#!/bin/bash
# deploy.sh

# 1. 构建镜像
docker build -t petchongwu:latest ./server

# 2. 推送镜像到仓库
docker tag petchongwu:latest registry.cn-beijing.aliyuncs.com/petchongwu/app:latest
docker push registry.cn-beijing.aliyuncs.com/petchongwu/app:latest

# 3. 执行数据库迁移
docker run --rm \
  -e DATABASE_URL="${DATABASE_URL}" \
  petchongwu:latest npx prisma migrate deploy

# 4. 重启服务
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# 5. 健康检查
curl -f http://localhost:3000/health || exit 1

echo "部署完成"
```

---

## 七、安全方案

### 7.1 认证安全
- JWT Secret 定期轮换
- Refresh Token 存储于 Redis，支持单点登出
- 敏感操作需重新验证（修改手机号、支付密码）

### 7.2 接口安全
- 全局接口限流（基于 Redis）
  - 普通接口：60 次/分钟
  - 登录接口：10 次/分钟
  - 支付接口：20 次/分钟
- SQL 注入防护：使用 Prisma ORM，禁止原生 SQL
- XSS 防护：输入过滤 + 输出转义

### 7.3 数据安全
- 密码/支付密码：bcrypt 加密存储
- 手机号：AES 加密存储
- 微信敏感数据：使用 session_key 解密
- 数据库连接：SSL 加密
- 定期自动备份（每日凌晨 3 点）

### 7.4 合规安全
- 实名认证信息脱敏存储
- 用户数据删除支持 GDPR/个人信息保护法
- 日志审计记录关键操作

---

## 八、性能优化方案

### 8.1 缓存策略
| 数据类型 | 缓存位置 | 过期时间 |
|---------|---------|---------|
| 用户信息 | Redis | 30 分钟 |
| 首页 Banner | Redis | 10 分钟 |
| 商品详情 | Redis | 5 分钟 |
| 服务列表 | Redis | 3 分钟 |
| 健康提醒计算 | Redis | 1 小时 |

### 8.2 数据库优化
- 建立合理的索引（详见数据库设计文档）
- 分页查询限制最大 100 条
- 复杂查询使用数据库视图
- 定期 ANALYZE 更新统计信息

### 8.3 图片优化
- 上传时生成多尺寸缩略图（缩略图、中图、原图）
- CDN 加速图片访问
- 懒加载 + 占位图

---

## 九、监控与日志

### 9.1 日志规范
```typescript
// 使用 Winston 日志库
{
  "timestamp": "2025-05-21T10:00:00.000Z",
  "level": "info|warn|error",
  "context": "ServiceController",
  "message": "创建服务订单",
  "traceId": "uuid",
  "userId": "123",
  "duration": 120,
  "data": { ... }
}
```

### 9.2 监控指标
- API 响应时间（P50/P95/P99）
- 错误率（5xx 比例）
- 业务指标（日活、订单量、转化率）
- 系统资源（CPU、内存、磁盘）

### 9.3 告警规则
- 错误率 > 1%：立即告警
- API 响应时间 P95 > 2s：告警
- 数据库连接数 > 80%：告警
- 磁盘使用率 > 85%：告警

---

## 十、开发规范

### 10.1 Git 分支策略
```
main          生产分支（仅接受合并请求）
  │
  ├── develop  开发分支（功能集成）
  │    │
  │    ├── feature/service-module   功能分支
  │    ├── feature/health-module
  │    └── feature/mall-module
  │
  └── hotfix/fix-payment-bug        热修复分支
```

### 10.2 代码提交规范
```
feat: 新增功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式（不影响功能）
refactor: 重构
test: 测试相关
chore: 构建/工具相关
```

### 10.3 开发环境启动
```bash
# 1. 克隆代码
git clone <repo>

# 2. 启动基础设施
cd docker
docker-compose up -d

# 3. 安装依赖
cd ../server
npm install

# 4. 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 5. 执行数据库迁移
npx prisma migrate dev

# 6. 生成 Prisma Client
npx prisma generate

# 7. 启动开发服务器
npm run start:dev

# 8. 查看 API 文档
open http://localhost:3000/api/docs
```

---

## 十一、迭代计划

### 阶段一：MVP 试运行（32天）
- ✅ 基础框架搭建
- ✅ 微信登录/用户体系
- ✅ 首页 + 我的页面
- ✅ 同城服务模块
- ✅ 健康档案模块
- ✅ 寻宠·领养·社交模块
- ✅ 同城商城模块
- ✅ 商家入驻 + 商家端
- ✅ 管理后台
- ✅ 支付结算
- ⚪ 闲置交易（预留入口）
- ⚪ 行为训练（预留入口）
- ⚪ 宠物殡葬（预留入口）

### 阶段二：功能完善（3个月后）
- 闲置交易模块
- 行为训练课程模块
- 宠物纪念殡葬模块
- 会员体系优化
- 数据看板完善

### 阶段三：规模扩展
- 微服务拆分
- 多城市扩展
- 智能推荐系统
- 数据分析平台

---

**文档结束**
