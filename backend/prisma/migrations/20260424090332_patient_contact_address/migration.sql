-- AlterTable
ALTER TABLE "User" ADD COLUMN "address1" TEXT;
ALTER TABLE "User" ADD COLUMN "address2" TEXT;
ALTER TABLE "User" ADD COLUMN "city" TEXT;
ALTER TABLE "User" ADD COLUMN "country" TEXT DEFAULT 'US';
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "postalCode" TEXT;
ALTER TABLE "User" ADD COLUMN "state" TEXT;

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
