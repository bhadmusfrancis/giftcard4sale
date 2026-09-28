-- Extra rate reduction for Euro Apple/iTunes denominations not divisible by 5 or 50.
ALTER TABLE "RateConfig" ADD COLUMN "euroAppleOddDenomReductionPercent" INTEGER NOT NULL DEFAULT 15;
