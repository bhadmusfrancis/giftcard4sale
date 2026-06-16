import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, requireVerified, AuthedRequest } from "../lib/auth";
import { applyWalletChange, InsufficientFundsError } from "../services/wallet";
import { notify } from "../services/notify";

export const withdrawalsRouter = Router();

const createSchema = z
  .object({
    currency: z.enum(["USDT", "NGN", "GHS"]),
    amount: z.coerce.number().positive(),
    bankAccountId: z.string().optional(),
    destinationAddress: z.string().optional(),
  })
  .refine(
    (d) => (d.currency === "NGN" ? !!d.bankAccountId : !!d.destinationAddress),
    { message: "Naira requires a saved bank account; USDT/Cedi require a destination address" }
  );

withdrawalsRouter.post(
  "/",
  requireAuth,
  requireVerified(),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(createSchema, req.body);

    if (data.currency === "NGN" && data.bankAccountId) {
      const account = await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } });
      if (!account || account.userId !== req.userId) {
        return res.status(400).json({ error: "Bank account not found" });
      }
    }

    try {
      const withdrawal = await prisma.$transaction(async (tx) => {
        const w = await tx.withdrawal.create({
          data: {
            userId: req.userId!,
            currency: data.currency,
            amount: new Prisma.Decimal(data.amount),
            bankAccountId: data.currency === "NGN" ? data.bankAccountId : null,
            destinationAddress: data.currency !== "NGN" ? data.destinationAddress : null,
            status: "PENDING",
          },
        });
        // Hold funds immediately (debit). Refunded if rejected.
        await applyWalletChange(tx, req.userId!, data.currency, new Prisma.Decimal(-data.amount), "WITHDRAWAL_DEBIT", {
          withdrawalId: w.id,
          description: `Withdrawal request ${w.id}`,
        });
        return w;
      });

      const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
      await Promise.all(
        admins.map((a) =>
          notify({
            userId: a.id,
            title: "New withdrawal request",
            body: `${data.amount} ${data.currency} requested.`,
            link: `/admin/withdrawals`,
          })
        )
      );
      await notify({
        userId: req.userId!,
        title: "Withdrawal request received",
        body: `Your withdrawal of ${data.amount} ${data.currency} is pending approval.`,
        link: `/dashboard/wallet`,
        push: true,
        email: true,
      });

      res.status(201).json({ withdrawal: { id: withdrawal.id, status: withdrawal.status } });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ error: "Insufficient wallet balance" });
      }
      throw err;
    }
  })
);

withdrawalsRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (req: AuthedRequest, res) => {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      include: { bankAccount: true },
    });
    res.json({
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        currency: w.currency,
        amount: Number(w.amount),
        status: w.status,
        destinationAddress: w.destinationAddress,
        bankAccount: w.bankAccount
          ? { bankName: w.bankAccount.bankName, accountNumber: w.bankAccount.accountNumber }
          : null,
        adminNote: w.adminNote,
        createdAt: w.createdAt,
      })),
    });
  })
);
