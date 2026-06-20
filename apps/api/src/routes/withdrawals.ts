import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { asyncHandler, validate } from "../lib/http";
import { requireAuth, requireVerified, requireActiveAccount, AuthedRequest } from "../lib/auth";
import { applyWalletChange, InsufficientFundsError } from "../services/wallet";
import { notify, notifyAdmins } from "../services/notify";
import { getRateConfig, minWithdrawalForCurrency } from "../services/rateConfig";

export const withdrawalsRouter = Router();

const createSchema = z
  .object({
    currency: z.enum(["USDT", "NGN", "GHS"]),
    amount: z.coerce.number().positive(),
    bankAccountId: z.string().optional(),
    momoAccountId: z.string().optional(),
    destinationAddress: z.string().optional(),
  })
  .refine(
    (d) => {
      if (d.currency === "NGN") return !!d.bankAccountId;
      if (d.currency === "GHS") return !!d.momoAccountId;
      return !!d.destinationAddress;
    },
    { message: "Naira requires a saved bank account; Cedi requires saved MoMo details; USDT requires a wallet address" }
  );

withdrawalsRouter.post(
  "/",
  requireAuth,
  requireVerified(),
  requireActiveAccount(),
  asyncHandler(async (req: AuthedRequest, res) => {
    const data = validate(createSchema, req.body);

    if (data.currency === "NGN" && data.bankAccountId) {
      const account = await prisma.bankAccount.findUnique({ where: { id: data.bankAccountId } });
      if (!account || account.userId !== req.userId) {
        return res.status(400).json({ error: "Bank account not found" });
      }
    }

    if (data.currency === "GHS" && data.momoAccountId) {
      const account = await prisma.momoAccount.findUnique({ where: { id: data.momoAccountId } });
      if (!account || account.userId !== req.userId) {
        return res.status(400).json({ error: "MoMo account not found" });
      }
    }

    const config = await getRateConfig();
    const minAmount = minWithdrawalForCurrency(data.currency, config);
    if (data.amount < minAmount) {
      return res.status(400).json({
        error: `Minimum withdrawal for ${data.currency} is ${minAmount}`,
      });
    }

    try {
      const withdrawal = await prisma.$transaction(async (tx) => {
        const w = await tx.withdrawal.create({
          data: {
            userId: req.userId!,
            currency: data.currency,
            amount: new Prisma.Decimal(data.amount),
            bankAccountId: data.currency === "NGN" ? data.bankAccountId : null,
            momoAccountId: data.currency === "GHS" ? data.momoAccountId : null,
            destinationAddress: data.currency === "USDT" ? data.destinationAddress : null,
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

      await notifyAdmins({
        title: "New withdrawal request",
        body: `${data.amount} ${data.currency} requested.`,
        link: `/admin/withdrawals`,
      });
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
    const [withdrawals, config] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        include: { bankAccount: true, momoAccount: true },
      }),
      getRateConfig(),
    ]);
    res.json({
      minWithdrawals: config.minWithdrawals,
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        currency: w.currency,
        amount: Number(w.amount),
        status: w.status,
        destinationAddress: w.destinationAddress,
        bankAccount: w.bankAccount
          ? { bankName: w.bankAccount.bankName, accountNumber: w.bankAccount.accountNumber }
          : null,
        momoAccount: w.momoAccount
          ? { network: w.momoAccount.network, phoneNumber: w.momoAccount.phoneNumber, accountName: w.momoAccount.accountName }
          : null,
        adminNote: w.adminNote,
        createdAt: w.createdAt,
      })),
    });
  })
);
