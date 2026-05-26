# 宠享家·北京同城宠物小程序 - 数据库设计文档

## 版本信息
- 版本：v1.0
- 日期：2025-05-21
- 数据库：PostgreSQL 15
- ORM：Prisma 5.x

---

## 一、数据库概述

### 1.1 数据库选型理由
- **PostgreSQL 15**：支持 JSON、数组、地理位置（PostGIS）、全文搜索，满足宠物平台多样化数据需求
- **Schema 设计**：单数据库单 Schema，试运行阶段简化运维
- **编码**：UTF-8，支持 emoji（宠物名字、动态内容）
- **时区**：UTC 存储，应用层转换北京时间

### 1.2 命名规范
- 表名：蛇形命名，复数形式（如 `users`, `products`）
- 字段名：蛇形命名（如 `created_at`, `phone_number`）
- 主键：`id`，UUID v4 或自增 bigint
- 外键：`[表名]_id`（如 `user_id`, `merchant_id`）
- 索引：`idx_[表名]_[字段]`
- 时间字段：`created_at`, `updated_at`, `deleted_at`（软删除）

### 1.3 公共字段
所有表均包含以下公共字段：
```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
deleted_at TIMESTAMP WITH TIME ZONE,  -- 软删除，NULL 表示未删除
```

---

## 二、ER 关系图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   users     │◄────┤ user_addrs  │     │   pets      │
│  (用户)     │ 1:N │  (用户地址)  │     │  (宠物)     │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                        │
       │ 1:N                                    │ 1:N
       ▼                                        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  merchants  │     │merchants    │     │health_      │
│  (商家)     │     │  _staff     │     │  records    │
└──────┬──────┘     └─────────────┘     └──────┬──────┘
       │                                        │
       │ 1:N                                    │ 1:N
       ▼                                        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  services   │     │  products   │     │health_items │
│  (服务商品)  │     │  (商品)     │     │(健康记录项) │
└──────┬──────┘     └──────┬──────┘     └─────────────┘
       │                   │
       │ 1:N               │ 1:N
       ▼                   ▼
┌─────────────┐     ┌─────────────┐
│service_     │     │product_     │
│  orders     │     │  orders     │
│(服务订单)   │     │(商品订单)   │
└─────────────┘     └──────┬──────┘
                           │
                           │ 1:N
                           ▼
                    ┌─────────────┐
                    │ order_items │
                    │ (订单商品)   │
                    └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ lost_pets   │     │  adoptions  │     │   posts     │
│  (寻宠)     │     │  (领养)     │     │  (动态)     │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                              │
                                              │ 1:N
                                              ▼
                                       ┌─────────────┐
                                       │post_comments│
                                       │  (评论)     │
                                       └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ idle_items  │     │training_    │     │funeral_     │
│ (闲置物品)   │     │  courses    │     │  services   │
│             │     │ (训练课程)   │     │ (殡葬服务)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1:N               │ 1:N               │ 1:N
       ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ idle_orders │     │training_    │     │funeral_     │
│ (闲置订单)   │     │  orders     │     │  orders     │
│             │     │ (课程订单)   │     │ (殡葬订单)   │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  coupons    │     │ memberships │     │ transactions│
│  (优惠券)   │     │  (会员)     │     │ (交易流水)   │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 三、完整建表 SQL

### 3.1 用户与认证模块

```sql
-- ============================================
-- 用户表
-- ============================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    openid VARCHAR(100) UNIQUE NOT NULL,           -- 微信openid
    unionid VARCHAR(100),                          -- 微信unionid（多应用互通）
    nickname VARCHAR(100),                         -- 昵称
    avatar_url TEXT,                               -- 头像URL
    phone VARCHAR(20),                             -- 手机号（AES加密存储）
    phone_encrypted VARCHAR(255),                  -- 加密后的手机号
    real_name VARCHAR(100),                        -- 真实姓名
    id_number VARCHAR(50),                         -- 身份证号（加密）
    id_verified BOOLEAN DEFAULT FALSE,             -- 实名认证状态
    gender SMALLINT DEFAULT 0,                     -- 0未知 1男 2女
    birthday DATE,
    city VARCHAR(50),                              -- 城市
    district VARCHAR(50),                          -- 区县
    address TEXT,                                  -- 详细地址
    longitude DECIMAL(10, 7),                      -- 经度
    latitude DECIMAL(10, 7),                       -- 纬度
    member_level SMALLINT DEFAULT 0,               -- 会员等级 0普通 1高级
    member_expire_at TIMESTAMP WITH TIME ZONE,     -- 会员过期时间
    status SMALLINT DEFAULT 1,                     -- 0禁用 1正常
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.openid IS '微信openid';
COMMENT ON COLUMN users.member_level IS '会员等级：0普通 1高级会员';

CREATE INDEX idx_users_openid ON users(openid);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_member ON users(member_level) WHERE member_level > 0;

-- ============================================
-- 用户地址表
-- ============================================
CREATE TABLE user_addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name VARCHAR(100) NOT NULL,            -- 联系人
    contact_phone VARCHAR(20) NOT NULL,            -- 联系电话
    province VARCHAR(50) NOT NULL,
    city VARCHAR(50) NOT NULL,
    district VARCHAR(50) NOT NULL,
    detail TEXT NOT NULL,                          -- 详细地址
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    is_default BOOLEAN DEFAULT FALSE,              -- 是否默认地址
    tag VARCHAR(20),                               -- 标签：家/公司/学校
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE user_addresses IS '用户地址表';

CREATE INDEX idx_user_addrs_user ON user_addresses(user_id);
CREATE INDEX idx_user_addrs_default ON user_addresses(user_id, is_default) WHERE is_default = TRUE;

-- ============================================
-- 管理员表
-- ============================================
CREATE TABLE admin_users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,           -- bcrypt加密
    nickname VARCHAR(100),
    avatar_url TEXT,
    email VARCHAR(100),
    phone VARCHAR(20),
    role SMALLINT DEFAULT 1,                       -- 1运营 2财务 3技术 9超级管理员
    status SMALLINT DEFAULT 1,                     -- 0禁用 1正常
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE admin_users IS '后台管理员表';

CREATE INDEX idx_admin_users_username ON admin_users(username);
CREATE INDEX idx_admin_users_role ON admin_users(role);
```

### 3.2 商家模块

```sql
-- ============================================
-- 商家表
-- ============================================
CREATE TABLE merchants (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,                    -- 店铺名称
    logo_url TEXT,
    cover_url TEXT,                                -- 封面图
    type SMALLINT NOT NULL,                        -- 1宠物店 2宠物医院 3救助站 4训练机构 5殡葬机构 9个人
    description TEXT,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    business_license VARCHAR(100),                 -- 营业执照号
    business_license_url TEXT,                     -- 营业执照照片
    qualification_urls TEXT[],                     -- 资质证书照片数组
    province VARCHAR(50),
    city VARCHAR(50) DEFAULT '北京市',              -- 固定北京
    district VARCHAR(50) NOT NULL,                 -- 北京行政区
    address TEXT NOT NULL,
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    business_hours JSONB,                          -- {"weekday": "09:00-21:00", "weekend": "10:00-22:00"}
    rating DECIMAL(2, 1) DEFAULT 5.0,              -- 评分 0-5
    review_count INTEGER DEFAULT 0,                -- 评价数
    order_count INTEGER DEFAULT 0,                 -- 订单数
    service_types SMALLINT[],                      -- 提供的服务类型 [1,2,3]
    has_mall BOOLEAN DEFAULT FALSE,                -- 是否开通商城
    status SMALLINT DEFAULT 0,                     -- 0待审核 1正常 2驳回 3关闭
    reject_reason TEXT,                            -- 驳回原因
    commission_rate DECIMAL(4, 2) DEFAULT 0.10,    -- 平台抽成比例
    annual_fee DECIMAL(10, 2) DEFAULT 0,           -- 年费
    annual_fee_expire_at TIMESTAMP WITH TIME ZONE, -- 年费到期时间
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE merchants IS '商家表';

CREATE INDEX idx_merchants_user ON merchants(user_id);
CREATE INDEX idx_merchants_city ON merchants(city);
CREATE INDEX idx_merchants_district ON merchants(district);
CREATE INDEX idx_merchants_status ON merchants(status);
CREATE INDEX idx_merchants_type ON merchants(type);
CREATE INDEX idx_merchants_location ON merchants(longitude, latitude);
CREATE INDEX idx_merchants_service_types ON merchants USING GIN(service_types);

-- ============================================
-- 商家员工表
-- ============================================
CREATE TABLE merchant_staff (
    id BIGSERIAL PRIMARY KEY,
    merchant_id BIGINT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES users(id),           -- 关联用户（可选）
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    avatar_url TEXT,
    role SMALLINT DEFAULT 1,                       -- 1店员 2店长 3管理员
    permissions JSONB,                             -- 权限配置
    status SMALLINT DEFAULT 1,                     -- 0禁用 1正常
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE merchant_staff IS '商家员工表';

CREATE INDEX idx_merchant_staff_merchant ON merchant_staff(merchant_id);
```

### 3.3 宠物与健康档案模块

```sql
-- ============================================
-- 宠物品种表（基础数据）
-- ============================================
CREATE TABLE pet_breeds (
    id SERIAL PRIMARY KEY,
    species SMALLINT NOT NULL,                     -- 1猫 2狗 3其他
    name VARCHAR(100) NOT NULL,                    -- 品种名称
    name_en VARCHAR(100),
    avatar_url TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE pet_breeds IS '宠物品种表';

CREATE INDEX idx_pet_breeds_species ON pet_breeds(species);

-- ============================================
-- 宠物表
-- ============================================
CREATE TABLE pets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    species SMALLINT NOT NULL,                     -- 1猫 2狗 3其他
    breed_id INTEGER REFERENCES pet_breeds(id),
    breed_name VARCHAR(100),                       -- 自定义品种（其他）
    gender SMALLINT,                               -- 0未知 1公 2母
    birthday DATE,
    weight DECIMAL(5, 2),                          -- 体重kg
    color VARCHAR(100),                            -- 毛色
    is_sterilized BOOLEAN DEFAULT FALSE,           -- 是否绝育
    microchip VARCHAR(100),                        -- 芯片号
    medical_history TEXT,                          -- 病史
    allergy_info TEXT,                             -- 过敏信息
    remark TEXT,
    status SMALLINT DEFAULT 1,                     -- 1正常 0已删除
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE pets IS '宠物表';

CREATE INDEX idx_pets_user ON pets(user_id);
CREATE INDEX idx_pets_species ON pets(species);

-- ============================================
-- 健康档案主表
-- ============================================
CREATE TABLE health_records (
    id BIGSERIAL PRIMARY KEY,
    pet_id BIGINT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type SMALLINT NOT NULL,                 -- 1疫苗 2驱虫 3体检 4绝育 5芯片 6年检 7看病 8其他
    item_name VARCHAR(200) NOT NULL,               -- 项目名称（如：狂犬疫苗）
    item_brand VARCHAR(100),                       -- 品牌
    item_batch VARCHAR(100),                       -- 批次号
    done_at DATE NOT NULL,                         -- 完成日期
    valid_until DATE,                              -- 有效期至
    clinic_name VARCHAR(200),                      -- 医院/机构名称
    doctor_name VARCHAR(100),                      -- 医生
    cost DECIMAL(10, 2),                           -- 费用
    photos TEXT[],                                 -- 照片凭证
    remark TEXT,
    remind_before INTEGER DEFAULT 7,               -- 提前几天提醒
    reminded BOOLEAN DEFAULT FALSE,                -- 是否已提醒
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE health_records IS '健康档案记录表';

CREATE INDEX idx_health_records_pet ON health_records(pet_id);
CREATE INDEX idx_health_records_user ON health_records(user_id);
CREATE INDEX idx_health_records_type ON health_records(record_type);
CREATE INDEX idx_health_records_valid ON health_records(valid_until) WHERE valid_until IS NOT NULL;
CREATE INDEX idx_health_records_remind ON health_records(valid_until, reminded) 
    WHERE valid_until IS NOT NULL AND reminded = FALSE;

-- ============================================
-- 健康提醒记录表（已发送的提醒）
-- ============================================
CREATE TABLE health_reminders (
    id BIGSERIAL PRIMARY KEY,
    health_record_id BIGINT NOT NULL REFERENCES health_records(id) ON DELETE CASCADE,
    pet_id BIGINT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    remind_type SMALLINT NOT NULL,                 -- 1疫苗 2驱虫 3年检
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,   -- 提醒时间
    notified BOOLEAN DEFAULT FALSE,                -- 是否已通知
    notification_type SMALLINT DEFAULT 1,          -- 1微信订阅消息
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE health_reminders IS '健康提醒记录表';

CREATE INDEX idx_health_reminders_user ON health_reminders(user_id);
CREATE INDEX idx_health_reminders_notified ON health_reminders(notified, remind_at) WHERE notified = FALSE;
```

### 3.4 同城服务模块

```sql
-- ============================================
-- 服务分类表
-- ============================================
CREATE TABLE service_categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES service_categories(id),
    name VARCHAR(100) NOT NULL,                    -- 分类名称
    icon_url TEXT,                                 -- 图标
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE service_categories IS '服务分类表';

INSERT INTO service_categories (name, sort_order) VALUES
('上门洗护', 1),
('上门喂宠', 2),
('寄养', 3),
('遛狗', 4),
('宠物医院', 5),
('宠物店', 6);

-- ============================================
-- 服务商品表
-- ============================================
CREATE TABLE services (
    id BIGSERIAL PRIMARY KEY,
    merchant_id BIGINT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES service_categories(id),
    name VARCHAR(200) NOT NULL,                    -- 服务名称
    subtitle VARCHAR(500),                         -- 副标题
    description TEXT,                              -- 服务详情
    cover_urls TEXT[],                             -- 封面图数组
    detail_images TEXT[],                          -- 详情图
    price DECIMAL(10, 2) NOT NULL,                 -- 价格
    original_price DECIMAL(10, 2),                 -- 原价
    unit VARCHAR(20) DEFAULT '次',                 -- 单位
    duration INTEGER,                              -- 服务时长（分钟）
    service_area JSONB,                            -- 服务范围 {"districts": ["朝阳区", "海淀区"]}
    need_address BOOLEAN DEFAULT TRUE,             -- 是否需要地址
    need_appointment BOOLEAN DEFAULT TRUE,         -- 是否需要预约
    available_times JSONB,                         -- 可预约时段
    sales_count INTEGER DEFAULT 0,                 -- 销量
    rating DECIMAL(2, 1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,                     -- 0下架 1上架
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE services IS '服务商品表';

CREATE INDEX idx_services_merchant ON services(merchant_id);
CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_price ON services(price);

-- ============================================
-- 服务订单表
-- ============================================
CREATE TABLE service_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(32) UNIQUE NOT NULL,          -- 订单号 SO202505210001
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    service_id BIGINT NOT NULL REFERENCES services(id),
    service_name VARCHAR(200),                     -- 冗余：服务名称
    service_price DECIMAL(10, 2),                  -- 冗余：服务单价
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,          -- 订单总金额
    discount_amount DECIMAL(10, 2) DEFAULT 0,      -- 优惠金额
    pay_amount DECIMAL(10, 2) NOT NULL,            -- 实付金额
    platform_fee DECIMAL(10, 2) DEFAULT 0,         -- 平台抽成
    merchant_amount DECIMAL(10, 2) DEFAULT 0,      -- 商家实得
    coupon_id BIGINT,                              -- 使用的优惠券
    coupon_amount DECIMAL(10, 2) DEFAULT 0,
    pet_id BIGINT REFERENCES pets(id),             -- 关联宠物
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    address_id BIGINT REFERENCES user_addresses(id),
    address TEXT,                                  -- 冗余：完整地址
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    appointment_date DATE,                         -- 预约日期
    appointment_time VARCHAR(20),                  -- 预约时段
    remark TEXT,                                   -- 用户备注
    merchant_remark TEXT,                          -- 商家备注
    status SMALLINT DEFAULT 0,                     -- 0待付款 1已付款 2已接单 3服务中 4已完成 5已取消 6退款中 7已退款
    paid_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    refund_amount DECIMAL(10, 2),
    refund_reason TEXT,
    refund_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE service_orders IS '服务订单表';

CREATE INDEX idx_service_orders_no ON service_orders(order_no);
CREATE INDEX idx_service_orders_user ON service_orders(user_id);
CREATE INDEX idx_service_orders_merchant ON service_orders(merchant_id);
CREATE INDEX idx_service_orders_status ON service_orders(status);
CREATE INDEX idx_service_orders_created ON service_orders(created_at);

-- ============================================
-- 服务评价表
-- ============================================
CREATE TABLE service_reviews (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    service_id BIGINT NOT NULL REFERENCES services(id),
    rating DECIMAL(2, 1) NOT NULL,                 -- 评分 1-5
    content TEXT,                                  -- 评价内容
    images TEXT[],                                 -- 评价图片
    merchant_reply TEXT,                           -- 商家回复
    replied_at TIMESTAMP WITH TIME ZONE,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status SMALLINT DEFAULT 1,                     -- 0隐藏 1显示
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE service_reviews IS '服务评价表';

CREATE INDEX idx_service_reviews_merchant ON service_reviews(merchant_id);
CREATE INDEX idx_service_reviews_service ON service_reviews(service_id);
CREATE INDEX idx_service_reviews_rating ON service_reviews(rating);
```

### 3.5 同城商城模块

```sql
-- ============================================
-- 商品分类表
-- ============================================
CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES product_categories(id),
    name VARCHAR(100) NOT NULL,
    icon_url TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_categories IS '商品分类表';

INSERT INTO product_categories (name, sort_order) VALUES
('主粮', 1),
('猫砂', 2),
('零食', 3),
('驱虫', 4),
('洗护', 5),
('玩具', 6),
('日用品', 7);

-- ============================================
-- 商品表（SPU）
-- ============================================
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    merchant_id BIGINT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES product_categories(id),
    name VARCHAR(200) NOT NULL,
    subtitle VARCHAR(500),
    description TEXT,
    detail_html TEXT,                              -- 富文本详情
    cover_urls TEXT[],                             -- 主图数组
    video_url TEXT,                                -- 视频
    brand VARCHAR(100),                            -- 品牌
    origin VARCHAR(100),                           -- 产地
    weight_info VARCHAR(100),                      -- 重量规格
    is_prescription BOOLEAN DEFAULT FALSE,         -- 是否处方药（禁止上架）
    delivery_type SMALLINT DEFAULT 1,              -- 1自提 2同城配送 3都支持
    sales_count INTEGER DEFAULT 0,
    rating DECIMAL(2, 1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 0,                     -- 0待审核 1上架 2下架 3驳回
    reject_reason TEXT,
    is_top BOOLEAN DEFAULT FALSE,                  -- 是否置顶
    top_expire_at TIMESTAMP WITH TIME ZONE,        -- 置顶过期时间
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE products IS '商品表（SPU）';

CREATE INDEX idx_products_merchant ON products(merchant_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_top ON products(is_top) WHERE is_top = TRUE;

-- ============================================
-- 商品规格表（SKU）
-- ============================================
CREATE TABLE product_skus (
    id BIGSERIAL PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    sku_code VARCHAR(100),                         -- SKU编码
    specs JSONB NOT NULL,                          -- 规格 {"规格": "1.5kg", "口味": "鸡肉"}
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    stock INTEGER NOT NULL DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    image_url TEXT,                                -- SKU图片
    status SMALLINT DEFAULT 1,                     -- 1正常 0无货
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE product_skus IS '商品SKU表';

CREATE INDEX idx_product_skus_product ON product_skus(product_id);
CREATE INDEX idx_product_skus_status ON product_skus(status);

-- ============================================
-- 商品订单表
-- ============================================
CREATE TABLE product_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(32) UNIQUE NOT NULL,          -- PO202505210001
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,         -- 配送费
    pay_amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) DEFAULT 0,
    merchant_amount DECIMAL(10, 2) DEFAULT 0,
    coupon_id BIGINT,
    coupon_amount DECIMAL(10, 2) DEFAULT 0,
    delivery_type SMALLINT NOT NULL,               -- 1自提 2同城配送
    address_id BIGINT REFERENCES user_addresses(id),
    receiver_name VARCHAR(100),
    receiver_phone VARCHAR(20),
    address TEXT,
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    remark TEXT,
    status SMALLINT DEFAULT 0,                     -- 0待付款 1已付款 2已接单 3配送中/待自提 4已完成 5已取消 6退款中 7已退款
    paid_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,           -- 发货/开始配送时间
    received_at TIMESTAMP WITH TIME ZONE,          -- 收货时间
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancel_reason TEXT,
    refund_amount DECIMAL(10, 2),
    refund_reason TEXT,
    refund_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE product_orders IS '商品订单表';

CREATE INDEX idx_product_orders_no ON product_orders(order_no);
CREATE INDEX idx_product_orders_user ON product_orders(user_id);
CREATE INDEX idx_product_orders_merchant ON product_orders(merchant_id);
CREATE INDEX idx_product_orders_status ON product_orders(status);
CREATE INDEX idx_product_orders_created ON product_orders(created_at);

-- ============================================
-- 订单商品明细表
-- ============================================
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES product_orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    sku_id BIGINT NOT NULL REFERENCES product_skus(id),
    product_name VARCHAR(200),                     -- 冗余
    sku_specs JSONB,                               -- 冗余规格信息
    sku_image TEXT,                                -- 冗余SKU图
    price DECIMAL(10, 2) NOT NULL,                 -- 下单时价格
    quantity INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE order_items IS '订单商品明细表';

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);
```

### 3.6 社交模块

```sql
-- ============================================
-- 寻宠发布表
-- ============================================
CREATE TABLE lost_pets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pet_id BIGINT REFERENCES pets(id),             -- 关联宠物档案（可选）
    type SMALLINT NOT NULL,                        -- 1寻宠 2寻主
    pet_name VARCHAR(100),
    species SMALLINT,                              -- 1猫 2狗 3其他
    breed VARCHAR(100),
    gender SMALLINT,
    color VARCHAR(100),
    age VARCHAR(50),                               -- 年龄描述
    weight VARCHAR(50),
    feature TEXT,                                  -- 特征描述
    photos TEXT[],                                 -- 照片
    lost_at TIMESTAMP WITH TIME ZONE,              -- 丢失时间
    lost_location TEXT,                            -- 丢失地点
    lost_district VARCHAR(50),                     -- 丢失区县
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    reward_amount DECIMAL(10, 2),                  -- 悬赏金额
    is_top BOOLEAN DEFAULT FALSE,                  -- 是否置顶
    top_expire_at TIMESTAMP WITH TIME ZONE,
    view_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,                     -- 0已找回 1寻找中 2已关闭
    found_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE lost_pets IS '寻宠发布表';

CREATE INDEX idx_lost_pets_user ON lost_pets(user_id);
CREATE INDEX idx_lost_pets_district ON lost_pets(lost_district);
CREATE INDEX idx_lost_pets_status ON lost_pets(status);
CREATE INDEX idx_lost_pets_top ON lost_pets(is_top) WHERE is_top = TRUE;
CREATE INDEX idx_lost_pets_location ON lost_pets(longitude, latitude);

-- ============================================
-- 领养信息表
-- ============================================
CREATE TABLE adoptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT REFERENCES merchants(id),   -- 救助站
    pet_name VARCHAR(100) NOT NULL,
    species SMALLINT NOT NULL,
    breed VARCHAR(100),
    gender SMALLINT,
    age VARCHAR(50),
    health_status TEXT,                            -- 健康状况
    photos TEXT[],
    description TEXT,                              -- 领养说明
    requirements TEXT,                             -- 领养要求
    location TEXT,
    district VARCHAR(50),
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    view_count INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 0,                     -- 0待审核 1可领养 2已领养 3已关闭
    adopted_at TIMESTAMP WITH TIME ZONE,
    adopter_id BIGINT REFERENCES users(id),        -- 领养人
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE adoptions IS '领养信息表';

CREATE INDEX idx_adoptions_status ON adoptions(status);
CREATE INDEX idx_adoptions_district ON adoptions(district);
CREATE INDEX idx_adoptions_merchant ON adoptions(merchant_id);

-- ============================================
-- 圈子动态表
-- ============================================
CREATE TABLE posts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type SMALLINT DEFAULT 1,                       -- 1普通动态 2遛宠活动 3晒宠 4问答
    content TEXT NOT NULL,
    images TEXT[],
    video_url TEXT,
    location TEXT,
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_top BOOLEAN DEFAULT FALSE,                  -- 置顶
    status SMALLINT DEFAULT 1,                     -- 0审核中 1正常 2隐藏
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE posts IS '圈子动态表';

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_type ON posts(type);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at);

-- ============================================
-- 动态评论表
-- ============================================
CREATE TABLE post_comments (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    parent_id BIGINT REFERENCES post_comments(id), -- 回复评论
    content TEXT NOT NULL,
    like_count INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1,                     -- 0审核中 1正常 2隐藏
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE post_comments IS '动态评论表';

CREATE INDEX idx_post_comments_post ON post_comments(post_id);
CREATE INDEX idx_post_comments_parent ON post_comments(parent_id);

-- ============================================
-- 动态点赞表
-- ============================================
CREATE TABLE post_likes (
    id BIGSERIAL PRIMARY KEY,
    post_id BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id)                       -- 唯一点赞
);

COMMENT ON TABLE post_likes IS '动态点赞表';

CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);

-- ============================================
-- 线下活动表
-- ============================================
CREATE TABLE activities (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),  -- 发起人
    title VARCHAR(200) NOT NULL,
    description TEXT,
    cover_url TEXT,
    images TEXT[],
    location TEXT,
    district VARCHAR(50),
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE,
    max_participants INTEGER,                      -- 人数上限
    fee DECIMAL(10, 2) DEFAULT 0,                  -- 报名费
    status SMALLINT DEFAULT 0,                     -- 0报名中 1进行中 2已结束 3已取消
    participant_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE activities IS '线下活动表';

CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_district ON activities(district);
CREATE INDEX idx_activities_start ON activities(start_at);

-- ============================================
-- 活动报名表
-- ============================================
CREATE TABLE activity_participants (
    id BIGSERIAL PRIMARY KEY,
    activity_id BIGINT NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    pet_ids BIGINT[],                              -- 携带宠物
    remark TEXT,
    status SMALLINT DEFAULT 0,                     -- 0待审核 1已通过 2已拒绝 3已签到 4已取消
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(activity_id, user_id)
);

COMMENT ON TABLE activity_participants IS '活动报名表';

CREATE INDEX idx_activity_participants_activity ON activity_participants(activity_id);
```

### 3.7 预留模块

```sql
-- ============================================
-- 闲置物品表
-- ============================================
CREATE TABLE idle_items (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL,                  -- 1食品 2日用品 3笼具 4服饰 5玩具 6保健 7其他
    title VARCHAR(200) NOT NULL,
    description TEXT,
    images TEXT[],
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),                 -- 原价
    condition_level SMALLINT NOT NULL,             -- 1全新 2几乎全新 3轻微使用 4明显使用
    usage_desc TEXT,                               -- 使用情况
    trade_type SMALLINT DEFAULT 1,                 -- 1自提 2同城快递 3都支持
    location TEXT,
    district VARCHAR(50),
    longitude DECIMAL(10, 7),
    latitude DECIMAL(10, 7),
    view_count INTEGER DEFAULT 0,
    collect_count INTEGER DEFAULT 0,
    is_top BOOLEAN DEFAULT FALSE,
    top_expire_at TIMESTAMP WITH TIME ZONE,
    status SMALLINT DEFAULT 0,                     -- 0待审核 1在售 2已售 3已下架
    sold_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE idle_items IS '闲置物品表';

CREATE INDEX idx_idle_items_user ON idle_items(user_id);
CREATE INDEX idx_idle_items_category ON idle_items(category_id);
CREATE INDEX idx_idle_items_status ON idle_items(status);
CREATE INDEX idx_idle_items_district ON idle_items(district);

-- ============================================
-- 闲置订单表
-- ============================================
CREATE TABLE idle_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(32) UNIQUE NOT NULL,
    buyer_id BIGINT NOT NULL REFERENCES users(id),
    seller_id BIGINT NOT NULL REFERENCES users(id),
    idle_item_id BIGINT NOT NULL REFERENCES idle_items(id),
    item_title VARCHAR(200),
    item_price DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) DEFAULT 0,         -- 平台担保费
    pay_amount DECIMAL(10, 2) NOT NULL,
    seller_amount DECIMAL(10, 2),
    delivery_type SMALLINT NOT NULL,               -- 1自提 2快递
    address TEXT,
    tracking_no VARCHAR(100),                      -- 快递单号
    status SMALLINT DEFAULT 0,                     -- 0待付款 1已付款（平台托管）2已发货 3已收货 4已完成 5退款中 6已退款 7已取消
    paid_at TIMESTAMP WITH TIME ZONE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    refund_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE idle_orders IS '闲置订单表';

CREATE INDEX idx_idle_orders_buyer ON idle_orders(buyer_id);
CREATE INDEX idx_idle_orders_seller ON idle_orders(seller_id);
CREATE INDEX idx_idle_orders_status ON idle_orders(status);

-- ============================================
-- 训练课程表
-- ============================================
CREATE TABLE training_courses (
    id BIGSERIAL PRIMARY KEY,
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    category_id INTEGER NOT NULL,                  -- 1幼犬定点 2社会化 3纠正行为 4猫咪行为 5上门训犬
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(500),
    description TEXT,
    cover_url TEXT,
    detail_images TEXT[],
    trainer_name VARCHAR(100),                     -- 讲师
    trainer_avatar TEXT,
    trainer_qualification TEXT,                    -- 资质
    target_pets SMALLINT[],                        -- 适用宠物 [1,2]
    course_type SMALLINT DEFAULT 1,                -- 1线上 2线下 3混合
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    class_hours INTEGER,                           -- 课时
    class_size INTEGER,                            -- 班级人数
    location TEXT,                                 -- 上课地点
    schedule_desc TEXT,                            -- 时间安排
    refund_policy TEXT,                            -- 退款规则
    rating DECIMAL(2, 1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 0,                     -- 0待审核 1上架 2下架
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE training_courses IS '训练课程表';

CREATE INDEX idx_training_courses_merchant ON training_courses(merchant_id);
CREATE INDEX idx_training_courses_category ON training_courses(category_id);
CREATE INDEX idx_training_courses_status ON training_courses(status);

-- ============================================
-- 课程订单表
-- ============================================
CREATE TABLE training_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(32) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    course_id BIGINT NOT NULL REFERENCES training_courses(id),
    course_name VARCHAR(200),
    price DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) NOT NULL,
    pay_amount DECIMAL(10, 2) NOT NULL,
    pet_id BIGINT REFERENCES pets(id),
    class_time TIMESTAMP WITH TIME ZONE,           -- 上课时间
    remark TEXT,
    status SMALLINT DEFAULT 0,                     -- 0待付款 1已付款 2已确认 3已完成 4已取消 5退款中 6已退款
    paid_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    refund_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE training_orders IS '课程订单表';

-- ============================================
-- 殡葬服务表
-- ============================================
CREATE TABLE funeral_services (
    id BIGSERIAL PRIMARY KEY,
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    category_id INTEGER NOT NULL,                  -- 1遗体接送 2火化 3骨灰寄存 4纪念饰品 5告别仪式 6树葬
    name VARCHAR(200) NOT NULL,
    description TEXT,
    cover_url TEXT,
    detail_images TEXT[],
    process_desc TEXT,                             -- 服务流程
    duration VARCHAR(100),                         -- 时长
    supplies TEXT,                                 -- 包含用品
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2),
    rating DECIMAL(2, 1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE funeral_services IS '殡葬服务表';

CREATE INDEX idx_funeral_services_merchant ON funeral_services(merchant_id);

-- ============================================
-- 殡葬订单表
-- ============================================
CREATE TABLE funeral_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(32) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT NOT NULL REFERENCES merchants(id),
    service_id BIGINT NOT NULL REFERENCES funeral_services(id),
    service_name VARCHAR(200),
    price DECIMAL(10, 2),
    total_amount DECIMAL(10, 2) NOT NULL,
    pay_amount DECIMAL(10, 2) NOT NULL,
    pet_name VARCHAR(100),                         -- 宠物名字
    pet_species SMALLINT,
    appointment_date DATE,
    appointment_time VARCHAR(20),
    address TEXT,
    contact_name VARCHAR(100),
    contact_phone VARCHAR(20),
    remark TEXT,
    status SMALLINT DEFAULT 0,                     -- 0待付款 1已付款（定金）2已确认 3服务中 4已完成 5已取消
    paid_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE funeral_orders IS '殡葬订单表';
```

### 3.8 营销与会员模块

```sql
-- ============================================
-- 优惠券表
-- ============================================
CREATE TABLE coupons (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE,                       -- 优惠券码（可选）
    name VARCHAR(200) NOT NULL,
    type SMALLINT NOT NULL,                        -- 1平台券 2商家券
    merchant_id BIGINT REFERENCES merchants(id),   -- 商家券时必填
    scope SMALLINT NOT NULL,                       -- 1全场通用 2指定分类 3指定商品 4指定服务
    target_ids BIGINT[],                           -- 指定目标ID数组
    discount_type SMALLINT NOT NULL,               -- 1满减 2折扣 3直减
    threshold_amount DECIMAL(10, 2),               -- 门槛金额
    discount_amount DECIMAL(10, 2),                -- 减免金额
    discount_percent DECIMAL(3, 2),                -- 折扣比例 0.85=85折
    max_discount DECIMAL(10, 2),                   -- 最大减免
    total_quantity INTEGER NOT NULL,               -- 总数量
    remaining_quantity INTEGER NOT NULL,
    per_user_limit INTEGER DEFAULT 1,              -- 每人限领
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    status SMALLINT DEFAULT 1,                     -- 0未开始 1进行中 2已结束 3已作废
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE coupons IS '优惠券表';

CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_merchant ON coupons(merchant_id);

-- ============================================
-- 用户优惠券表
-- ============================================
CREATE TABLE user_coupons (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id BIGINT NOT NULL REFERENCES coupons(id),
    status SMALLINT DEFAULT 0,                     -- 0未使用 1已使用 2已过期 3已作废
    used_at TIMESTAMP WITH TIME ZONE,
    used_order_no VARCHAR(32),
    expire_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, coupon_id)
);

COMMENT ON TABLE user_coupons IS '用户优惠券表';

CREATE INDEX idx_user_coupons_user ON user_coupons(user_id);
CREATE INDEX idx_user_coupons_status ON user_coupons(status);

-- ============================================
-- 会员订阅表
-- ============================================
CREATE TABLE memberships (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type SMALLINT NOT NULL DEFAULT 1,              -- 1高级健康会员
    duration_type SMALLINT NOT NULL,               -- 1月卡 2季卡 3年卡
    price DECIMAL(10, 2) NOT NULL,
    pay_amount DECIMAL(10, 2) NOT NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_renew BOOLEAN DEFAULT FALSE,              -- 自动续费
    status SMALLINT DEFAULT 1,                     -- 1有效 0已过期 2已取消
    cancelled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE memberships IS '会员订阅表';

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_end ON memberships(end_at);
```

### 3.9 交易与消息模块

```sql
-- ============================================
-- 交易流水表
-- ============================================
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    transaction_no VARCHAR(32) UNIQUE NOT NULL,    -- 流水号
    user_id BIGINT NOT NULL REFERENCES users(id),
    merchant_id BIGINT REFERENCES merchants(id),
    order_no VARCHAR(32),                          -- 关联订单号
    order_type SMALLINT,                           -- 1服务订单 2商品订单 3闲置订单 4课程订单 5殡葬订单 6会员 7充值
    type SMALLINT NOT NULL,                        -- 1支付 2退款 3分账 4提现
    channel SMALLINT NOT NULL DEFAULT 1,           -- 1微信支付 2余额
    amount DECIMAL(10, 2) NOT NULL,
    fee DECIMAL(10, 2) DEFAULT 0,                  -- 手续费
    status SMALLINT DEFAULT 0,                     -- 0处理中 1成功 2失败
    third_party_no VARCHAR(100),                   -- 第三方流水号
    remark TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE transactions IS '交易流水表';

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_id);
CREATE INDEX idx_transactions_order ON transactions(order_no);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- ============================================
-- 消息通知表
-- ============================================
CREATE TABLE messages (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type SMALLINT NOT NULL,                        -- 1系统通知 2订单通知 3活动通知 4私信
    title VARCHAR(200) NOT NULL,
    content TEXT,
    data JSONB,                                    -- 扩展数据 {"order_no": "xxx", "url": "/pages/order/detail?id=1"}
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    sender_id BIGINT REFERENCES users(id),         -- 私信时发送者
    sender_type SMALLINT DEFAULT 1,                -- 1用户 2系统 3商家
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE messages IS '消息通知表';

CREATE INDEX idx_messages_user ON messages(user_id);
CREATE INDEX idx_messages_read ON messages(is_read);
CREATE INDEX idx_messages_type ON messages(type);
CREATE INDEX idx_messages_created ON messages(created_at);

-- ============================================
-- 微信订阅消息记录表
-- ============================================
CREATE TABLE wx_subscriptions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(100) NOT NULL,             -- 微信模板ID
    scene SMALLINT NOT NULL,                       -- 场景：1健康提醒 2订单通知 3预约提醒
    subscribed BOOLEAN DEFAULT TRUE,               -- 是否已订阅
    subscribed_at TIMESTAMP WITH TIME ZONE,
    unsubscribed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, template_id, scene)
);

COMMENT ON TABLE wx_subscriptions IS '微信订阅消息记录表';

CREATE INDEX idx_wx_subscriptions_user ON wx_subscriptions(user_id);
```

### 3.10 系统配置模块

```sql
-- ============================================
-- Banner表
-- ============================================
CREATE TABLE banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200),
    image_url TEXT NOT NULL,
    link_type SMALLINT DEFAULT 1,                  -- 1无跳转 2页面 3服务 4商品 5H5
    link_url TEXT,
    target_id BIGINT,                              -- 目标ID
    sort_order INTEGER DEFAULT 0,
    start_at TIMESTAMP WITH TIME ZONE,
    end_at TIMESTAMP WITH TIME ZONE,
    status SMALLINT DEFAULT 1,                     -- 0禁用 1启用
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE banners IS 'Banner表';

CREATE INDEX idx_banners_status ON banners(status);
CREATE INDEX idx_banners_sort ON banners(sort_order);

-- ============================================
-- 应用配置表
-- ============================================
CREATE TABLE app_configs (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(500),
    updated_by BIGINT REFERENCES admin_users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE app_configs IS '应用配置表';

-- 初始化配置
INSERT INTO app_configs (config_key, config_value, description) VALUES
('service_platform_fee', '0.12', '服务订单平台抽成比例'),
('mall_platform_fee', '0.08', '商城订单平台抽成比例'),
('idle_platform_fee', '0.05', '闲置订单平台抽成比例'),
('member_month_price', '19.9', '会员月卡价格'),
('member_year_price', '99', '会员年卡价格'),
('new_user_coupon_amount', '10', '新用户优惠券金额'),
('beijing_only', 'true', '是否仅限北京地区'),
('lost_pet_top_price_daily', '9.9', '寻宠置顶日费'),
('lost_pet_top_price_3day', '29.9', '寻宠置顶3天费用'),
('lost_pet_urgent_push_price', '49.9', '寻宠紧急推送费用');

-- ============================================
-- 北京行政区表（基础数据）
-- ============================================
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(50) NOT NULL,
    parent_code VARCHAR(20),
    level SMALLINT NOT NULL,                       -- 1省 2市 3区
    sort_order INTEGER DEFAULT 0,
    status SMALLINT DEFAULT 1
);

COMMENT ON TABLE regions IS '地区表';

-- 初始化北京行政区
INSERT INTO regions (code, name, parent_code, level) VALUES
('110000', '北京市', '', 2),
('110101', '东城区', '110000', 3),
('110102', '西城区', '110000', 3),
('110105', '朝阳区', '110000', 3),
('110106', '丰台区', '110000', 3),
('110107', '石景山区', '110000', 3),
('110108', '海淀区', '110000', 3),
('110109', '门头沟区', '110000', 3),
('110111', '房山区', '110000', 3),
('110112', '通州区', '110000', 3),
('110113', '顺义区', '110000', 3),
('110114', '昌平区', '110000', 3),
('110115', '大兴区', '110000', 3),
('110116', '怀柔区', '110000', 3),
('110117', '平谷区', '110000', 3),
('110118', '密云区', '110000', 3),
('110119', '延庆区', '110000', 3);
```

---

## 四、Prisma Schema 完整定义

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id              BigInt    @id @default(autoincrement())
  openid          String    @unique @db.VarChar(100)
  unionid         String?   @db.VarChar(100)
  nickname        String?   @db.VarChar(100)
  avatarUrl       String?
  phone           String?   @db.VarChar(20)
  phoneEncrypted  String?   @db.VarChar(255)
  realName        String?   @db.VarChar(100)
  idNumber        String?   @db.VarChar(50)
  idVerified      Boolean   @default(false)
  gender          Int?      @db.SmallInt
  birthday        DateTime? @db.Date
  city            String?   @db.VarChar(50)
  district        String?   @db.VarChar(50)
  address         String?
  longitude       Decimal?  @db.Decimal(10, 7)
  latitude        Decimal?  @db.Decimal(10, 7)
  memberLevel     Int       @default(0) @db.SmallInt
  memberExpireAt  DateTime? @db.Timestamptz()
  status          Int       @default(1) @db.SmallInt
  lastLoginAt     DateTime? @db.Timestamptz()
  createdAt       DateTime  @default(now()) @db.Timestamptz()
  updatedAt       DateTime  @updatedAt @db.Timestamptz()
  deletedAt       DateTime? @db.Timestamptz()

  addresses     UserAddress[]
  pets          Pet[]
  healthRecords HealthRecord[]
  merchants     Merchant[]
  posts         Post[]
  messages      Message[]

  @@index([openid])
  @@index([phone])
  @@index([city])
  @@index([status])
  @@map("users")
}

model UserAddress {
  id            BigInt    @id @default(autoincrement())
  userId        BigInt    @map("user_id")
  contactName   String    @db.VarChar(100)
  contactPhone  String    @db.VarChar(20)
  province      String    @db.VarChar(50)
  city          String    @db.VarChar(50)
  district      String    @db.VarChar(50)
  detail        String
  longitude     Decimal?  @db.Decimal(10, 7)
  latitude      Decimal?  @db.Decimal(10, 7)
  isDefault     Boolean   @default(false) @map("is_default")
  tag           String?   @db.VarChar(20)
  createdAt     DateTime  @default(now()) @db.Timestamptz()
  updatedAt     DateTime  @updatedAt @db.Timestamptz()
  deletedAt     DateTime? @db.Timestamptz()

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, isDefault])
  @@map("user_addresses")
}

model Pet {
  id            BigInt    @id @default(autoincrement())
  userId        BigInt    @map("user_id")
  name          String    @db.VarChar(100)
  avatarUrl     String?
  species       Int       @db.SmallInt // 1猫 2狗 3其他
  breedId       Int?      @map("breed_id")
  breedName     String?   @db.VarChar(100)
  gender        Int?      @db.SmallInt
  birthday      DateTime? @db.Date
  weight        Decimal?  @db.Decimal(5, 2)
  color         String?   @db.VarChar(100)
  isSterilized  Boolean   @default(false) @map("is_sterilized")
  microchip     String?   @db.VarChar(100)
  medicalHistory String?  @map("medical_history")
  allergyInfo   String?   @map("allergy_info")
  remark        String?
  status        Int       @default(1) @db.SmallInt
  createdAt     DateTime  @default(now()) @db.Timestamptz()
  updatedAt     DateTime  @updatedAt @db.Timestamptz()
  deletedAt     DateTime? @db.Timestamptz()

  user          User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  healthRecords HealthRecord[]

  @@index([userId])
  @@index([species])
  @@map("pets")
}

model HealthRecord {
  id            BigInt    @id @default(autoincrement())
  petId         BigInt    @map("pet_id")
  userId        BigInt    @map("user_id")
  recordType    Int       @db.SmallInt @map("record_type")
  itemName      String    @db.VarChar(200) @map("item_name")
  itemBrand     String?   @db.VarChar(100) @map("item_brand")
  itemBatch     String?   @db.VarChar(100) @map("item_batch")
  doneAt        DateTime  @db.Date @map("done_at")
  validUntil    DateTime? @db.Date @map("valid_until")
  clinicName    String?   @db.VarChar(200) @map("clinic_name")
  doctorName    String?   @db.VarChar(100) @map("doctor_name")
  cost          Decimal?  @db.Decimal(10, 2)
  photos        String[]
  remark        String?
  remindBefore  Int       @default(7) @map("remind_before")
  reminded      Boolean   @default(false)
  createdAt     DateTime  @default(now()) @db.Timestamptz()
  updatedAt     DateTime  @updatedAt @db.Timestamptz()
  deletedAt     DateTime? @db.Timestamptz()

  pet  Pet  @relation(fields: [petId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([petId])
  @@index([userId])
  @@index([recordType])
  @@index([validUntil])
  @@map("health_records")
}

model Merchant {
  id                  BigInt    @id @default(autoincrement())
  userId              BigInt    @map("user_id")
  name                String    @db.VarChar(200)
  logoUrl             String?
  coverUrl            String?
  type                Int       @db.SmallInt
  description         String?
  contactName         String?   @db.VarChar(100)
  contactPhone        String?   @db.VarChar(20)
  businessLicense     String?   @db.VarChar(100) @map("business_license")
  businessLicenseUrl  String?   @map("business_license_url")
  qualificationUrls   String[]  @map("qualification_urls")
  province            String?   @db.VarChar(50)
  city                String?   @default("北京市") @db.VarChar(50)
  district            String    @db.VarChar(50)
  address             String
  longitude           Decimal?  @db.Decimal(10, 7)
  latitude            Decimal?  @db.Decimal(10, 7)
  businessHours       Json?     @map("business_hours")
  rating              Decimal   @default(5.0) @db.Decimal(2, 1)
  reviewCount         Int       @default(0) @map("review_count")
  orderCount          Int       @default(0) @map("order_count")
  serviceTypes        Int[]     @map("service_types")
  hasMall             Boolean   @default(false) @map("has_mall")
  status              Int       @default(0) @db.SmallInt
  rejectReason        String?   @map("reject_reason")
  commissionRate      Decimal   @default(0.10) @db.Decimal(4, 2) @map("commission_rate")
  annualFee           Decimal   @default(0) @db.Decimal(10, 2) @map("annual_fee")
  annualFeeExpireAt   DateTime? @db.Timestamptz() @map("annual_fee_expire_at")
  createdAt           DateTime  @default(now()) @db.Timestamptz()
  updatedAt           DateTime  @updatedAt @db.Timestamptz()
  deletedAt           DateTime? @db.Timestamptz()

  user User @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([city])
  @@index([district])
  @@index([status])
  @@index([type])
  @@map("merchants")
}

// ... 更多模型定义
```

> 注：完整 Prisma Schema 较长，上述为核心模型示例。完整版请参考项目中的 `prisma/schema.prisma` 文件。

---

## 五、索引设计说明

### 5.1 索引设计原则
1. **主键索引**：所有表使用 `BIGSERIAL` 自增主键，天然有聚簇索引
2. **外键索引**：所有外键字段自动创建索引，加速 JOIN 查询
3. **查询索引**：根据业务查询场景创建单列/复合索引
4. **部分索引**：针对特定状态的数据创建部分索引，减少索引大小
5. **GIN 索引**：数组类型字段使用 GIN 索引

### 5.2 核心查询场景索引

| 查询场景 | 索引 | 说明 |
|---------|------|------|
| 微信登录 | `idx_users_openid` | openid 唯一查询 |
| 商家列表（按区县） | `idx_merchants_district` | 同城服务筛选 |
| 附近商家 | `idx_merchants_location` | 地理位置查询 |
| 健康到期提醒 | `idx_health_records_remind` | 部分索引，仅未提醒 |
| 订单列表 | `idx_service_orders_user + status` | 用户订单筛选 |
| 商品搜索 | `idx_products_name` (需添加) | 全文搜索 |
| 动态列表 | `idx_posts_created` | 时间倒序 |
| 消息未读 | `idx_messages_user + is_read` | 未读消息数 |

### 5.3 待补充索引（根据实际查询优化）
```sql
-- 商品名称全文搜索（中文）
CREATE INDEX idx_products_name_fts ON products USING gin(to_tsvector('chinese', name));

-- 服务名称搜索
CREATE INDEX idx_services_name_fts ON services USING gin(to_tsvector('chinese', name));

-- 寻宠按时间倒序
CREATE INDEX idx_lost_pets_created ON lost_pets(created_at DESC);

-- 订单复合索引
CREATE INDEX idx_service_orders_user_status ON service_orders(user_id, status);
```

---

## 六、数据库迁移策略

### 6.1 初始化迁移
```bash
# 1. 初始化 Prisma
npx prisma init

# 2. 生成首次迁移
npx prisma migrate dev --name init

# 3. 生成 Prisma Client
npx prisma generate
```

### 6.2 后续变更
```bash
# 修改 schema.prisma 后
npx prisma migrate dev --name add_xx_feature

# 生产环境
npx prisma migrate deploy
```

### 6.3 数据种子
```bash
# 导入基础数据
npx prisma db seed
```

---

## 七、备份策略

### 7.1 自动备份
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/data/backups/petchongwu"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="petchongwu_${DATE}.sql"

# PostgreSQL 备份
pg_dump -h localhost -U user -d petchongwu -F custom -f "${BACKUP_DIR}/${FILENAME}"

# 保留最近 30 天备份
find ${BACKUP_DIR} -name "petchongwu_*.sql" -mtime +30 -delete

# 上传到对象存储（可选）
# coscli cp ${BACKUP_DIR}/${FILENAME} cos://backup/petchongwu/
```

### 7.2 备份定时任务
```bash
# crontab -e
0 3 * * * /data/scripts/backup.sh >> /var/log/petchongwu/backup.log 2>>1
```

---

**文档结束**
