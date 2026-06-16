import { Prisma, PayoutCurrency, TxnType } from "@prisma/client";

type Tx = Prisma.TransactionClient;

const BALANCE_FIELD: Record<PayoutCurrency, "balanceUsdt" | "balanceNgn" | "balanceGhs"> = {
  USDT: "balanceUsdt",
  NGN: "balanceNgn",
  GHS: "balanceGhs",
};

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient funds");
    this.name = "InsufficientFundsError";
  }
}

interface MoveOpts {
  tradeId?: string;
  withdrawalId?: string;
  description?: string;
}

/**
 * Apply a signed amount to a user's wallet (positive = credit, negative = debit),
 * write the ledger entry, and return the resulting balance. Must run inside a
 * prisma transaction to stay consistent.
 */
export async function applyWalletChange(
  tx: Tx,
  userId: string,
  currency: PayoutCurrency,
  signedAmount: Prisma.Decimal.Value,
  type: TxnType,
  opts: MoveOpts = {}
): Promise<Prisma.Decimal> {
  const field = BALANCE_FIELD[currency];
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const current = new Prisma.Decimal(user[field] as unknown as Prisma.Decimal.Value);
  const delta = new Prisma.Decimal(signedAmount);
  const next = current.add(delta);

  if (next.isNegative()) throw new InsufficientFundsError();

  await tx.user.update({ where: { id: userId }, data: { [field]: next } as any });

  await tx.walletTransaction.create({
    data: {
      userId,
      type,
      currency,
      amount: delta,
      balanceAfter: next,
      description: opts.description,
      tradeId: opts.tradeId,
      withdrawalId: opts.withdrawalId,
    },
  });

  return next;
}
