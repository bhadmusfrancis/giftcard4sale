-- % off the SafeTheTrade physical rate used as the e-code rate when no offer for the card accepts e-codes.
ALTER TABLE "RateConfig" ADD COLUMN "sttEcodeReductionPercent" INTEGER NOT NULL DEFAULT 20;
