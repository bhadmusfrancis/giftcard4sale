CREATE TABLE "CardCurrencyReduction" (
    "id" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "nairaReductionPercent" INTEGER,
    "usdtReductionPercent" INTEGER,
    "ghsReductionPercent" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardCurrencyReduction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CardCurrencyReduction_cardTypeId_currency_key" ON "CardCurrencyReduction"("cardTypeId", "currency");
CREATE INDEX "CardCurrencyReduction_cardTypeId_idx" ON "CardCurrencyReduction"("cardTypeId");

ALTER TABLE "CardCurrencyReduction" ADD CONSTRAINT "CardCurrencyReduction_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
