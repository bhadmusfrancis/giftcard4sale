-- AlterTable
ALTER TABLE "RateConfig" ADD COLUMN "ngnPerGhsAutoSync" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "RateConfig" ADD COLUMN "ngnPerGhsIncrementPercent" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "FxRateState" ADD COLUMN "ngnPerGhs" DECIMAL(20,4);
ALTER TABLE "FxRateState" ADD COLUMN "ghsRateDate" TEXT;
ALTER TABLE "FxRateState" ADD COLUMN "ghsSource" TEXT;
ALTER TABLE "FxRateState" ADD COLUMN "ghsFetchedAt" TIMESTAMP(3);
ALTER TABLE "FxRateState" ADD COLUMN "ghsLastAttemptAt" TIMESTAMP(3);
ALTER TABLE "FxRateState" ADD COLUMN "ghsLastError" TEXT;
