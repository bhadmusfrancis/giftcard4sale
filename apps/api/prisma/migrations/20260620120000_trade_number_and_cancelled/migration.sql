-- AlterEnum
ALTER TYPE "TradeStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "tradeNumber" TEXT;

-- Backfill existing trades with unique reference numbers.
UPDATE "Trade"
SET "tradeNumber" = 'GC4S-' || to_char("createdAt", 'YYYYMMDD') || '-' || upper(substr(md5("id"), 1, 6))
WHERE "tradeNumber" IS NULL;

ALTER TABLE "Trade" ALTER COLUMN "tradeNumber" SET NOT NULL;

CREATE UNIQUE INDEX "Trade_tradeNumber_key" ON "Trade"("tradeNumber");
