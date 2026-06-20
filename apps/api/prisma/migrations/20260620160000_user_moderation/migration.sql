-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "suspendedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "suspensionReason" TEXT;
ALTER TABLE "User" ADD COLUMN "maxConcurrentTrades" INTEGER;
ALTER TABLE "User" ADD COLUMN "adminNotes" TEXT;

-- AlterTable
ALTER TABLE "RateConfig" ADD COLUMN "defaultMaxConcurrentTrades" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "RateConfig" ADD COLUMN "autoSuspendRejectThreshold" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "RateConfig" ADD COLUMN "autoSuspendRejectWindowDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "RateConfig" ADD COLUMN "autoSuspendDurationDays" INTEGER NOT NULL DEFAULT 7;

-- CreateTable
CREATE TABLE "UserModerationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "adminId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "suspendedUntil" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserModerationEvent_userId_createdAt_idx" ON "UserModerationEvent"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserModerationEvent" ADD CONSTRAINT "UserModerationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModerationEvent" ADD CONSTRAINT "UserModerationEvent_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
