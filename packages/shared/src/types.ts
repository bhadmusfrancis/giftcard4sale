// Shared domain types used by both the API and the web app.

export type PayoutCurrency = "USDT" | "NGN" | "GHS";

export type CardMedium = "PHYSICAL" | "ECODE";

export type ReceiptType = "NONE" | "CASH" | "DEBIT";

export type TradeStatus =
  | "PENDING"
  | "PROCESSING"
  | "INFO_REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "PAID";

export type WithdrawalStatus =
  | "PENDING"
  | "PROCESSING"
  | "APPROVED"
  | "REJECTED"
  | "PAID";

export type TxnType =
  | "TRADE_CREDIT"
  | "WITHDRAWAL_DEBIT"
  | "TRANSFER_DEBIT"
  | "TRANSFER_CREDIT"
  | "REFERRAL_BONUS"
  | "ADMIN_ADJUSTMENT";

export type UserRole = "USER" | "ADMIN";

// A single structured rate row, e.g. Apple/iTunes, US, $200-$500, physical = 1092 NGN per unit
export interface RateEntry {
  cardType: string; // e.g. "Apple/iTunes"
  country: string; // e.g. "US", "UK", "Other"
  currency: string; // ISO of the card's face value, e.g. "USD", "GBP"
  minDenom: number | null; // null = any
  maxDenom: number | null; // null = any
  medium: CardMedium; // PHYSICAL or ECODE
  nairaPerUnit: number; // NGN paid per 1 unit of card face value (the "slow" rate)
  speed?: "SLOW" | "FAST";
  note?: string;
}

export interface ExchangeRates {
  ngnPerUsdt: number; // NGN per 1 USDT
  ngnPerGhs: number; // NGN per 1 GHS (Cedi)
}

export interface RateReductions {
  nairaReductionPercent: number; // default 20
  fxReductionPercent: number; // default 30 (USDT & Cedi)
}

export interface RateQuoteInput {
  nairaPerUnit: number; // base parsed rate (slow), naira per unit of card currency
  cardAmount: number; // face value amount of the card (in its own currency)
  payoutCurrency: PayoutCurrency;
  medium: CardMedium;
  rates: ExchangeRates;
  reductions: RateReductions;
}

export interface RateQuote {
  payoutCurrency: PayoutCurrency;
  effectiveNairaPerUnit: number; // rate after reduction
  grossNaira: number; // cardAmount * nairaPerUnit (before reduction)
  payoutAmount: number; // final amount paid in payoutCurrency
  reductionPercent: number;
}
