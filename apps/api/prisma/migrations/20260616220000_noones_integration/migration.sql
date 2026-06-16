-- AlterTable
ALTER TABLE "CardType" ADD COLUMN IF NOT EXISTS "noonesPaymentMethod" TEXT;

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "noonesTradeHash" TEXT;
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "noonesOfferHash" TEXT;
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "noonesStatus" TEXT;
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "noonesError" TEXT;
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "noonesCryptoAmount" DECIMAL(20,8);
ALTER TABLE "Trade" ADD COLUMN IF NOT EXISTS "noonesCryptoCurrency" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Trade_noonesTradeHash_key" ON "Trade"("noonesTradeHash");
CREATE INDEX IF NOT EXISTS "Trade_noonesTradeHash_idx" ON "Trade"("noonesTradeHash");

-- CreateTable
CREATE TABLE IF NOT EXISTS "NoOnesWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "tradeHash" TEXT,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NoOnesWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "NoOnesWebhookEvent_eventType_tradeHash_key" ON "NoOnesWebhookEvent"("eventType", "tradeHash");
CREATE INDEX IF NOT EXISTS "NoOnesWebhookEvent_tradeHash_idx" ON "NoOnesWebhookEvent"("tradeHash");
