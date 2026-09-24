-- AlterTable
ALTER TABLE "InsightRotationState" ALTER COLUMN "id" SET DEFAULT 'default';

-- AlterTable
ALTER TABLE "RateSyncState" ALTER COLUMN "id" SET DEFAULT 'singleton';

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN     "cardPins" TEXT;
