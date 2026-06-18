CREATE TABLE "CardCurrencyMeta" (
    "id" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "offerCount" INTEGER NOT NULL DEFAULT 0,
    "denomRanges" JSONB NOT NULL DEFAULT '[]',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardCurrencyMeta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CardCurrencyMeta_cardTypeId_currency_key" ON "CardCurrencyMeta"("cardTypeId", "currency");
CREATE INDEX "CardCurrencyMeta_cardTypeId_idx" ON "CardCurrencyMeta"("cardTypeId");

ALTER TABLE "CardCurrencyMeta" ADD CONSTRAINT "CardCurrencyMeta_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
