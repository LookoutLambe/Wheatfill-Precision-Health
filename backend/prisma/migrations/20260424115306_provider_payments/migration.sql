-- AlterTable
ALTER TABLE "User" ADD COLUMN "activePaymentProvider" TEXT;
ALTER TABLE "User" ADD COLUMN "cloverEnv" TEXT;
ALTER TABLE "User" ADD COLUMN "cloverMerchantId" TEXT;
ALTER TABLE "User" ADD COLUMN "cloverPrivateKeyEnc" TEXT;
ALTER TABLE "User" ADD COLUMN "cloverPrivateKeyIv" TEXT;
ALTER TABLE "User" ADD COLUMN "cloverPrivateKeyTag" TEXT;
