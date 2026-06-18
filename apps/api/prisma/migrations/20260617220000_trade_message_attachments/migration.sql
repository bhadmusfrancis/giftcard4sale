ALTER TABLE "TradeMessage" ALTER COLUMN "body" SET DEFAULT '';

ALTER TABLE "TradeMessage" ADD COLUMN "attachmentUrl" TEXT;
ALTER TABLE "TradeMessage" ADD COLUMN "attachmentFilename" TEXT;
ALTER TABLE "TradeMessage" ADD COLUMN "attachmentMimeType" TEXT;
