-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_senderId_fkey";

-- DropIndex
DROP INDEX "Follow_receiverId_status_idx";

-- DropIndex
DROP INDEX "Follow_senderId_createdAt_idx";

-- CreateIndex
CREATE INDEX "Follow_senderId_status_createdAt_idx" ON "Follow"("senderId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Follow_receiverId_status_createdAt_idx" ON "Follow"("receiverId", "status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
