-- A withdrawal can have multiple ledger entries (debit on creation + refund on
-- rejection/deletion), so withdrawalId can't be unique.
-- DropIndex
DROP INDEX "WalletTransaction_withdrawalId_key";

CREATE INDEX "WalletTransaction_withdrawalId_idx" ON "WalletTransaction"("withdrawalId");
