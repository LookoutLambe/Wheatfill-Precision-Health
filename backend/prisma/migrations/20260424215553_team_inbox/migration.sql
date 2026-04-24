-- CreateTable
CREATE TABLE "TeamInboxItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "fromName" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "meta" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "TeamInboxItem_status_createdAt_idx" ON "TeamInboxItem"("status", "createdAt");
