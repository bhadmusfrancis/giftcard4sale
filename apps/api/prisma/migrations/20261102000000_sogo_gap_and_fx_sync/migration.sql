-- AlterTable
ALTER TABLE "RateConfig" ADD COLUMN "sogoMaxGapPercent" INTEGER NOT NULL DEFAULT 25;
ALTER TABLE "RateConfig" ADD COLUMN "sttFallbackReductionPercent" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "RateConfig" ADD COLUMN "ngnPerUsdtAutoSync" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RateConfig" ADD COLUMN "ngnPerUsdtReductionPercent" INTEGER NOT NULL DEFAULT 8;

-- CreateTable
CREATE TABLE "FxRateState" (
    "id" TEXT NOT NULL,
    "ngnPerUsd" DECIMAL(20,4),
    "rateDate" TEXT,
    "source" TEXT,
    "fetchedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "lastError" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FxRateState_pkey" PRIMARY KEY ("id")
);
