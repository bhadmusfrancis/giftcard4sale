-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "paymentEvidenceFilename" TEXT,
ADD COLUMN     "paymentEvidenceMimeType" TEXT,
ADD COLUMN     "paymentEvidenceUrl" TEXT;
