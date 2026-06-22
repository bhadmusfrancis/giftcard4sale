-- CreateTable
CREATE TABLE "InsightPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDesc" TEXT,
    "excerpt" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "cardTypeId" TEXT NOT NULL,
    "batchDate" DATE NOT NULL,
    "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightRotationState" (
    "id" TEXT NOT NULL,
    "featuredIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightRotationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsightPost_slug_key" ON "InsightPost"("slug");

-- CreateIndex
CREATE INDEX "InsightPost_batchDate_published_idx" ON "InsightPost"("batchDate", "published");

-- CreateIndex
CREATE INDEX "InsightPost_cardTypeId_idx" ON "InsightPost"("cardTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "InsightPost_cardTypeId_batchDate_key" ON "InsightPost"("cardTypeId", "batchDate");

-- AddForeignKey
ALTER TABLE "InsightPost" ADD CONSTRAINT "InsightPost_cardTypeId_fkey" FOREIGN KEY ("cardTypeId") REFERENCES "CardType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
