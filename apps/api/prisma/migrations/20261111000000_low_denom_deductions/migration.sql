-- AlterTable
ALTER TABLE "RateConfig" ADD COLUMN "lowDenomMax" INTEGER;
ALTER TABLE "RateConfig" ADD COLUMN "lowNairaReductionPercent" INTEGER;
ALTER TABLE "RateConfig" ADD COLUMN "lowUsdtReductionPercent" INTEGER;
ALTER TABLE "RateConfig" ADD COLUMN "lowGhsReductionPercent" INTEGER;

-- AlterTable
ALTER TABLE "RateDeductionBand" ADD COLUMN "lowDenomEnabled" BOOLEAN NOT NULL DEFAULT false;
