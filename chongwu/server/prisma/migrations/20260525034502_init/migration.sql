/*
  Warnings:

  - You are about to drop the column `userId` on the `idle_orders` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `services` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `banners` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `health_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `idle_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `idle_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `merchants` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `pets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `service_orders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `transactions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "address" TEXT;
ALTER TABLE "users" ADD COLUMN "birthday" TEXT;
ALTER TABLE "users" ADD COLUMN "lastLoginAt" DATETIME;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_banners" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT,
    "imageUrl" TEXT NOT NULL,
    "linkType" INTEGER NOT NULL DEFAULT 1,
    "linkUrl" TEXT,
    "targetId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_banners" ("createdAt", "id", "imageUrl", "linkType", "sortOrder", "status", "targetId", "title") SELECT "createdAt", "id", "imageUrl", "linkType", "sortOrder", "status", "targetId", "title" FROM "banners";
DROP TABLE "banners";
ALTER TABLE "new_banners" RENAME TO "banners";
CREATE TABLE "new_health_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "petId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "recordType" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemBrand" TEXT,
    "itemBatch" TEXT,
    "doneAt" TEXT NOT NULL,
    "validUntil" TEXT,
    "clinicName" TEXT,
    "doctorName" TEXT,
    "cost" REAL,
    "photos" TEXT NOT NULL DEFAULT '',
    "remark" TEXT,
    "remindBefore" INTEGER NOT NULL DEFAULT 7,
    "reminded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "health_records_petId_fkey" FOREIGN KEY ("petId") REFERENCES "pets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "health_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_health_records" ("clinicName", "cost", "createdAt", "doneAt", "id", "itemBrand", "itemName", "petId", "recordType", "remark", "userId", "validUntil") SELECT "clinicName", "cost", "createdAt", "doneAt", "id", "itemBrand", "itemName", "petId", "recordType", "remark", "userId", "validUntil" FROM "health_records";
DROP TABLE "health_records";
ALTER TABLE "new_health_records" RENAME TO "health_records";
CREATE TABLE "new_idle_items" (
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
    "location" TEXT,
    "district" TEXT,
    "longitude" REAL,
    "latitude" REAL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "collectCount" INTEGER NOT NULL DEFAULT 0,
    "isTop" BOOLEAN NOT NULL DEFAULT false,
    "topExpireAt" DATETIME,
    "status" INTEGER NOT NULL DEFAULT 0,
    "soldAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "idle_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_idle_items" ("categoryId", "conditionLevel", "createdAt", "description", "district", "id", "images", "originalPrice", "price", "status", "title", "tradeType", "usageDesc", "userId") SELECT "categoryId", "conditionLevel", "createdAt", "description", "district", "id", "images", "originalPrice", "price", "status", "title", "tradeType", "usageDesc", "userId" FROM "idle_items";
DROP TABLE "idle_items";
ALTER TABLE "new_idle_items" RENAME TO "idle_items";
CREATE TABLE "new_idle_orders" (
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
    "trackingNo" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "shippedAt" DATETIME,
    "receivedAt" DATETIME,
    "completedAt" DATETIME,
    "refundReason" TEXT,
    "refundAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "idle_orders_idleItemId_fkey" FOREIGN KEY ("idleItemId") REFERENCES "idle_items" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_idle_orders" ("address", "buyerId", "createdAt", "deliveryType", "id", "idleItemId", "itemPrice", "itemTitle", "orderNo", "paidAt", "payAmount", "platformFee", "sellerAmount", "sellerId", "status", "totalAmount") SELECT "address", "buyerId", "createdAt", "deliveryType", "id", "idleItemId", "itemPrice", "itemTitle", "orderNo", "paidAt", "payAmount", "platformFee", "sellerAmount", "sellerId", "status", "totalAmount" FROM "idle_orders";
DROP TABLE "idle_orders";
ALTER TABLE "new_idle_orders" RENAME TO "idle_orders";
CREATE UNIQUE INDEX "idle_orders_orderNo_key" ON "idle_orders"("orderNo");
CREATE TABLE "new_merchants" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "coverUrl" TEXT,
    "type" INTEGER NOT NULL,
    "description" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "businessLicense" TEXT,
    "businessLicenseUrl" TEXT,
    "qualificationUrls" TEXT NOT NULL DEFAULT '',
    "province" TEXT,
    "city" TEXT DEFAULT '北京市',
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "longitude" REAL,
    "latitude" REAL,
    "businessHours" TEXT,
    "rating" REAL NOT NULL DEFAULT 5.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "serviceTypes" TEXT NOT NULL DEFAULT '',
    "hasMall" BOOLEAN NOT NULL DEFAULT false,
    "status" INTEGER NOT NULL DEFAULT 0,
    "rejectReason" TEXT,
    "commissionRate" REAL NOT NULL DEFAULT 0.10,
    "annualFee" REAL NOT NULL DEFAULT 0,
    "annualFeeExpireAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "merchants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_merchants" ("address", "commissionRate", "createdAt", "description", "district", "id", "logoUrl", "name", "rating", "status", "type", "userId") SELECT "address", "commissionRate", "createdAt", "description", "district", "id", "logoUrl", "name", "rating", "status", "type", "userId" FROM "merchants";
DROP TABLE "merchants";
ALTER TABLE "new_merchants" RENAME TO "merchants";
CREATE TABLE "new_pets" (
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
    "remark" TEXT,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "pets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_pets" ("birthday", "breedName", "color", "createdAt", "gender", "id", "isSterilized", "microchip", "name", "species", "status", "userId", "weight") SELECT "birthday", "breedName", "color", "createdAt", "gender", "id", "isSterilized", "microchip", "name", "species", "status", "userId", "weight" FROM "pets";
DROP TABLE "pets";
ALTER TABLE "new_pets" RENAME TO "pets";
CREATE TABLE "new_service_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNo" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "serviceName" TEXT,
    "servicePrice" REAL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "totalAmount" REAL NOT NULL,
    "discountAmount" REAL NOT NULL DEFAULT 0,
    "payAmount" REAL NOT NULL,
    "platformFee" REAL NOT NULL DEFAULT 0,
    "merchantAmount" REAL NOT NULL DEFAULT 0,
    "couponId" INTEGER,
    "couponAmount" REAL NOT NULL DEFAULT 0,
    "petId" INTEGER,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "addressId" INTEGER,
    "address" TEXT,
    "longitude" REAL,
    "latitude" REAL,
    "appointmentDate" TEXT,
    "appointmentTime" TEXT,
    "remark" TEXT,
    "merchantRemark" TEXT,
    "status" INTEGER NOT NULL DEFAULT 0,
    "paidAt" DATETIME,
    "acceptedAt" DATETIME,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "cancelledAt" DATETIME,
    "cancelReason" TEXT,
    "refundAmount" REAL,
    "refundReason" TEXT,
    "refundAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "service_orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_orders_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_orders_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_service_orders" ("address", "appointmentDate", "appointmentTime", "contactName", "contactPhone", "createdAt", "id", "merchantAmount", "merchantId", "orderNo", "paidAt", "payAmount", "platformFee", "quantity", "remark", "serviceId", "serviceName", "servicePrice", "status", "totalAmount", "userId") SELECT "address", "appointmentDate", "appointmentTime", "contactName", "contactPhone", "createdAt", "id", "merchantAmount", "merchantId", "orderNo", "paidAt", "payAmount", "platformFee", "quantity", "remark", "serviceId", "serviceName", "servicePrice", "status", "totalAmount", "userId" FROM "service_orders";
DROP TABLE "service_orders";
ALTER TABLE "new_service_orders" RENAME TO "service_orders";
CREATE UNIQUE INDEX "service_orders_orderNo_key" ON "service_orders"("orderNo");
CREATE TABLE "new_services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "merchantId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "coverUrls" TEXT NOT NULL DEFAULT '',
    "detailImages" TEXT NOT NULL DEFAULT '',
    "price" REAL NOT NULL,
    "originalPrice" REAL,
    "unit" TEXT NOT NULL DEFAULT '次',
    "duration" INTEGER,
    "serviceArea" TEXT,
    "needAddress" BOOLEAN NOT NULL DEFAULT true,
    "needAppointment" BOOLEAN NOT NULL DEFAULT true,
    "availableTimes" TEXT,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "rating" REAL NOT NULL DEFAULT 5.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "services_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_services" ("categoryId", "createdAt", "description", "duration", "id", "merchantId", "name", "price", "rating", "salesCount", "status", "subtitle", "unit") SELECT "categoryId", "createdAt", "description", "duration", "id", "merchantId", "name", "price", "rating", "salesCount", "status", "subtitle", "unit" FROM "services";
DROP TABLE "services";
ALTER TABLE "new_services" RENAME TO "services";
CREATE TABLE "new_transactions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "transactionNo" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "merchantId" INTEGER,
    "orderNo" TEXT,
    "orderType" INTEGER,
    "type" INTEGER NOT NULL,
    "channel" INTEGER NOT NULL DEFAULT 1,
    "amount" REAL NOT NULL,
    "fee" REAL NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "thirdPartyNo" TEXT,
    "remark" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_transactions" ("amount", "createdAt", "id", "orderNo", "orderType", "status", "transactionNo", "type", "userId") SELECT "amount", "createdAt", "id", "orderNo", "orderType", "status", "transactionNo", "type", "userId" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
CREATE UNIQUE INDEX "transactions_transactionNo_key" ON "transactions"("transactionNo");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
