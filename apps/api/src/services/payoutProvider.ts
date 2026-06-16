import { env } from "../env";

export interface BankPayoutInput {
  amount: number; // in NGN (major units)
  accountNumber: string;
  accountName: string;
  bankName: string;
  reason: string;
}

export interface PayoutResult {
  ok: boolean;
  manual?: boolean; // true => no provider configured, admin must pay manually
  reference?: string;
  message?: string;
}

const PAYSTACK = "https://api.paystack.co";
const FLUTTERWAVE = "https://api.flutterwave.com/v3";

async function paystackBankCode(bankName: string): Promise<string | null> {
  const res = await fetch(`${PAYSTACK}/bank?currency=NGN&perPage=100`, {
    headers: { Authorization: `Bearer ${env.payouts.paystackSecret}` },
  });
  const data = await res.json();
  if (!data?.status) return null;
  const target = bankName.trim().toLowerCase();
  const match =
    data.data.find((b: any) => b.name.toLowerCase() === target) ||
    data.data.find((b: any) => b.name.toLowerCase().includes(target) || target.includes(b.name.toLowerCase()));
  return match?.code ?? null;
}

async function paystackTransfer(input: BankPayoutInput): Promise<PayoutResult> {
  const headers = {
    Authorization: `Bearer ${env.payouts.paystackSecret}`,
    "Content-Type": "application/json",
  };

  const bankCode = await paystackBankCode(input.bankName);
  if (!bankCode) return { ok: false, message: `Could not resolve Paystack bank code for "${input.bankName}"` };

  const recRes = await fetch(`${PAYSTACK}/transferrecipient`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "nuban",
      name: input.accountName,
      account_number: input.accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
  const rec = await recRes.json();
  if (!rec?.status) return { ok: false, message: rec?.message || "Failed to create transfer recipient" };

  const trRes = await fetch(`${PAYSTACK}/transfer`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source: "balance",
      amount: Math.round(input.amount * 100), // kobo
      recipient: rec.data.recipient_code,
      reason: input.reason,
    }),
  });
  const tr = await trRes.json();
  if (!tr?.status) return { ok: false, message: tr?.message || "Transfer failed" };
  return { ok: true, reference: tr.data.reference || tr.data.transfer_code };
}

async function flutterwaveTransfer(input: BankPayoutInput): Promise<PayoutResult> {
  const res = await fetch(`${FLUTTERWAVE}/transfers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.payouts.flutterwaveSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      account_bank: input.bankName, // Flutterwave expects a bank code here
      account_number: input.accountNumber,
      amount: input.amount,
      currency: "NGN",
      narration: input.reason,
      reference: `gc4s_${Date.now()}`,
    }),
  });
  const data = await res.json();
  if (data?.status !== "success") return { ok: false, message: data?.message || "Transfer failed" };
  return { ok: true, reference: String(data.data?.id ?? "") };
}

/**
 * Pay out Naira to a Nigerian bank account using the configured provider.
 * Returns { manual: true } when no provider is configured (admin pays by hand).
 */
export async function payoutNgnToBank(input: BankPayoutInput): Promise<PayoutResult> {
  try {
    if (env.payouts.provider === "paystack" && env.payouts.paystackSecret) {
      return await paystackTransfer(input);
    }
    if (env.payouts.provider === "flutterwave" && env.payouts.flutterwaveSecret) {
      return await flutterwaveTransfer(input);
    }
    return { ok: false, manual: true, message: "No payout provider configured" };
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }
}

export const payoutsAutomated = env.payouts.provider !== "manual";
