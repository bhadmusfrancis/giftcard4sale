-- Cache NoOnes offer counts for popularity sorting on the card catalog.
ALTER TABLE "CardType" ADD COLUMN "offerCount" INTEGER NOT NULL DEFAULT 0;
