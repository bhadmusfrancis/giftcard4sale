-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "otherCountryName" TEXT;
ALTER TABLE "Trade" ADD COLUMN "cardDenominations" TEXT;
ALTER TABLE "Trade" ADD COLUMN "noonesAwaitingSend" BOOLEAN NOT NULL DEFAULT false;
