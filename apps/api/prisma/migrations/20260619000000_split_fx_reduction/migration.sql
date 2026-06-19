-- Split shared fxReductionPercent into separate USDT and Cedi (GHS) deductions.
ALTER TABLE "RateConfig" ADD COLUMN "usdtReductionPercent" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "RateConfig" ADD COLUMN "ghsReductionPercent" INTEGER NOT NULL DEFAULT 30;

UPDATE "RateConfig"
SET "usdtReductionPercent" = "fxReductionPercent",
    "ghsReductionPercent" = "fxReductionPercent";

ALTER TABLE "RateConfig" DROP COLUMN "fxReductionPercent";
