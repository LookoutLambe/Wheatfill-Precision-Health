-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "itemType" TEXT NOT NULL,
    "itemId" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "cloverCheckoutSessionId" TEXT,
    "cloverCheckoutHref" TEXT,
    "patientId" TEXT,
    "providerId" TEXT NOT NULL,
    "p2p_memo" TEXT,
    "appointmentId" TEXT,
    "orderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amountCents", "appointmentId", "cloverCheckoutHref", "cloverCheckoutSessionId", "createdAt", "currency", "deletedAt", "id", "itemId", "itemType", "method", "orderId", "patientId", "providerId", "status", "stripeCheckoutSessionId", "stripePaymentIntentId", "stripeSubscriptionId", "updatedAt") SELECT "amountCents", "appointmentId", "cloverCheckoutHref", "cloverCheckoutSessionId", "createdAt", "currency", "deletedAt", "id", "itemId", "itemType", "method", "orderId", "patientId", "providerId", "status", "stripeCheckoutSessionId", "stripePaymentIntentId", "stripeSubscriptionId", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_patientId_createdAt_idx" ON "Payment"("patientId", "createdAt");
CREATE INDEX "Payment_providerId_createdAt_idx" ON "Payment"("providerId", "createdAt");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
