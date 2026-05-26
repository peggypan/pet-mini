-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "openid" TEXT NOT NULL,
    "nickname" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "realName" TEXT,
    "gender" INTEGER,
    "city" TEXT,
    "district" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "pets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "species" INTEGER NOT NULL,
    "breedName" TEXT,
    "gender" INTEGER,
    "birthday" TEXT,
    "weight" REAL,
    "color" TEXT,
    "isSterilized" BOOLEAN NOT NULL DEFAULT false,
    "microchip" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "petId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "recordType" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemBrand" TEXT,
    "doneAt" TEXT NOT NULL,
    "validUntil" TEXT,
    "clinicName" TEXT,
    "cost" REAL,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "health_records_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "health_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "merchants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "type" INTEGER NOT NULL,
    "description" TEXT,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "rating" REAL NOT NULL DEFAULT 5.0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "commissionRate" REAL NOT NULL DEFAULT 0.10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "merchants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "merchantId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "price" REAL NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '次',
    "duration" INTEGER,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 5.0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    CONSTRAINT "services_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "services_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNo" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "serviceName" TEXT,
    "servicePrice" REAL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" REAL NOT NULL,
    "payAmount" REAL NOT NULL,
    "platformFee" REAL NOT NULL DEFAULT 0,
    "merchantAmount" REAL NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "appointmentDate" TEXT,
    "appointmentTime" TEXT,
    "remark" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "service_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_orders_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_orders_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "idle_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "images" TEXT NOT NULL DEFAULT '',
    "price" REAL NOT NULL,
    "originalPrice" REAL,
    "conditionLevel" INTEGER NOT NULL,
    "usageDesc" TEXT,
    "tradeType" INTEGER NOT NULL DEFAULT 1,
    "district" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "idle_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "idle_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNo" TEXT NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "sellerId" INTEGER NOT NULL,
    "idleItemId" INTEGER NOT NULL,
    "itemTitle" TEXT,
    "itemPrice" REAL,
    "totalAmount" REAL NOT NULL,
    "platformFee" REAL NOT NULL DEFAULT 0,
    "payAmount" REAL NOT NULL,
    "sellerAmount" REAL NOT NULL,
    "deliveryType" INTEGER NOT NULL,
    "address" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    CONSTRAINT "idle_orders_idleItemId_fkey" FOREIGN KEY ("idleItemId") REFERENCES "idle_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "idle_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionNo" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "orderNo" TEXT,
    "orderType" INTEGER,
    "type" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "banners" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkType" INTEGER NOT NULL DEFAULT 1,
    "targetId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_openid_key" ON "users"("openid");

-- CreateIndex
CREATE UNIQUE INDEX "service_orders_orderNo_key" ON "service_orders"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "idle_orders_orderNo_key" ON "idle_orders"("orderNo");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_transactionNo_key" ON "transactions"("transactionNo");
