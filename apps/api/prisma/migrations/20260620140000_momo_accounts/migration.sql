-- CreateTable
CREATE TABLE "MoMoAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoMoAccount_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN "momoAccountId" TEXT;

-- CreateIndex
CREATE INDEX "MoMoAccount_userId_idx" ON "MoMoAccount"("userId");

-- AddForeignKey
ALTER TABLE "MoMoAccount" ADD CONSTRAINT "MoMoAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_momoAccountId_fkey" FOREIGN KEY ("momoAccountId") REFERENCES "MoMoAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
