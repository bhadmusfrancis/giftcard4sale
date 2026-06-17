-- How often NoOnes-sourced card rates may be refreshed (admin-configurable).
ALTER TABLE "RateConfig" ADD COLUMN "noonesRateRefreshMinutes" INTEGER NOT NULL DEFAULT 15;
