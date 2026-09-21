-- Per-card deduction overrides; NULL means the RateConfig platform default applies.
ALTER TABLE "CardType" ADD COLUMN "nairaReductionPercent" INTEGER;
ALTER TABLE "CardType" ADD COLUMN "usdtReductionPercent" INTEGER;
ALTER TABLE "CardType" ADD COLUMN "ghsReductionPercent" INTEGER;
