-- AlterTable
ALTER TABLE "TradeAttachment" ADD COLUMN "contentHash" TEXT,
ADD COLUMN "imageWidth" INTEGER,
ADD COLUMN "imageHeight" INTEGER,
ADD COLUMN "fileSizeBytes" INTEGER,
ADD COLUMN "perceptualHash" TEXT,
ADD COLUMN "ocrText" TEXT,
ADD COLUMN "extractedCodes" JSONB;

-- CreateTable
CREATE TABLE "SubmittedCardCode" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeLast4" TEXT,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmittedCardCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeAttachment_contentHash_idx" ON "TradeAttachment"("contentHash");

-- CreateIndex
CREATE INDEX "TradeAttachment_imageWidth_imageHeight_fileSizeBytes_idx" ON "TradeAttachment"("imageWidth", "imageHeight", "fileSizeBytes");

-- CreateIndex
CREATE INDEX "TradeAttachment_perceptualHash_idx" ON "TradeAttachment"("perceptualHash");

-- CreateIndex
CREATE INDEX "SubmittedCardCode_codeHash_idx" ON "SubmittedCardCode"("codeHash");

-- CreateIndex
CREATE INDEX "SubmittedCardCode_tradeId_idx" ON "SubmittedCardCode"("tradeId");

-- AddForeignKey
ALTER TABLE "SubmittedCardCode" ADD CONSTRAINT "SubmittedCardCode_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
