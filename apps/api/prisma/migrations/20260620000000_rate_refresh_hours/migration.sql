-- AlterTable
ALTER TABLE "RateConfig" ADD COLUMN "noonesRateRefreshHours" INTEGER;

UPDATE "RateConfig"
SET "noonesRateRefreshHours" = GREATEST(1, CEIL("noonesRateRefreshMinutes" / 60.0));

ALTER TABLE "RateConfig" ALTER COLUMN "noonesRateRefreshHours" SET NOT NULL;
ALTER TABLE "RateConfig" ALTER COLUMN "noonesRateRefreshHours" SET DEFAULT 1;

ALTER TABLE "RateConfig" DROP COLUMN "noonesRateRefreshMinutes";
