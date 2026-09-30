-- Per-user caps for saved payout accounts (bank / MoMo).
ALTER TABLE "RateConfig" ADD COLUMN "maxBankAccounts" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "RateConfig" ADD COLUMN "maxMomoAccounts" INTEGER NOT NULL DEFAULT 5;
