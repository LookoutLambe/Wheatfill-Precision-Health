-- AlterTable
ALTER TABLE "User" ADD COLUMN "supabaseAuthUserId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAuthUserId_key" ON "User"("supabaseAuthUserId");
