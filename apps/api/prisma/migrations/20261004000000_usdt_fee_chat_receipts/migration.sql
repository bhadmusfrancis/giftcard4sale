-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN "fee" DECIMAL(20,6) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TradeMessage" ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "readAt" TIMESTAMP(3);
