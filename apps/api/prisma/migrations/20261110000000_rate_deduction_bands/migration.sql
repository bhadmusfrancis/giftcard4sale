-- CreateTable
CREATE TABLE "RateDeductionBand" (
    "id" TEXT NOT NULL,
    "minRateCount" INTEGER NOT NULL,
    "maxRateCount" INTEGER,
    "nairaReductionPercent" INTEGER NOT NULL,
    "usdtReductionPercent" INTEGER NOT NULL,
    "ghsReductionPercent" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateDeductionBand_pkey" PRIMARY KEY ("id")
);

-- Move every card onto the new band-based deductions: clear all existing
-- per-card Naira/USDT/Cedi overrides. Admins can re-set individual cards after.
UPDATE "CardType" SET "nairaReductionPercent" = NULL, "usdtReductionPercent" = NULL, "ghsReductionPercent" = NULL;
