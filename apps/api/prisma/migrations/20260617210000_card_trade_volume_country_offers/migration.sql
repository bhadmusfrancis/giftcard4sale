-- Cached NoOnes completed-trade volume for catalog sorting.
ALTER TABLE "CardType" ADD COLUMN "tradeVolume" INTEGER NOT NULL DEFAULT 0;

-- Cached offer count per country/currency tier (display when >= 10).
ALTER TABLE "Rate" ADD COLUMN "countryOfferCount" INTEGER;
