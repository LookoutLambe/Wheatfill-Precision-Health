-- CreateTable
CREATE TABLE "PharmacyPartner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PharmacyProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "strength" TEXT NOT NULL DEFAULT '',
    "size" TEXT NOT NULL DEFAULT '',
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PharmacyProduct_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PharmacyPartner" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "partnerSlug" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "item" TEXT,
    "request" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "dosageNote" TEXT NOT NULL DEFAULT '',
    "providerNote" TEXT NOT NULL DEFAULT '',
    "pharmacyPartnerId" TEXT,
    "shippingAddress1" TEXT NOT NULL DEFAULT '',
    "shippingAddress2" TEXT NOT NULL DEFAULT '',
    "shippingCity" TEXT NOT NULL DEFAULT '',
    "shippingState" TEXT NOT NULL DEFAULT '',
    "shippingPostalCode" TEXT NOT NULL DEFAULT '',
    "shippingCountry" TEXT NOT NULL DEFAULT 'US',
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "shippingInsuranceCents" INTEGER NOT NULL DEFAULT 0,
    "agreedToShippingTerms" BOOLEAN NOT NULL DEFAULT false,
    "contactPermission" BOOLEAN NOT NULL DEFAULT false,
    "signatureName" TEXT NOT NULL DEFAULT '',
    "signatureDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "patientId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    CONSTRAINT "Order_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("category", "createdAt", "deletedAt", "dosageNote", "id", "item", "patientId", "providerId", "providerNote", "request", "status", "updatedAt") SELECT "category", "createdAt", "deletedAt", "dosageNote", "id", "item", "patientId", "providerId", "providerNote", "request", "status", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyPartner_slug_key" ON "PharmacyPartner"("slug");

-- CreateIndex
CREATE INDEX "PharmacyProduct_partnerId_isActive_sortOrder_idx" ON "PharmacyProduct"("partnerId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacyProduct_partnerId_sku_key" ON "PharmacyProduct"("partnerId", "sku");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
