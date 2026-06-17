import { Prisma } from "@prisma/client";

import { ReceiptType, StoredQuotes } from "@gc4s/shared";

import { CardMedium } from "@prisma/client";

import { env } from "../../env";

import { getRateConfig } from "../rateConfig";

import { offerMatchesReceiptType } from "./receiptPolicy";
import { filterOtherCountryOffers } from "./otherCountries";

import { averageTopOffersNaira, loadScoredOffersForMedium } from "./rates";



export function parseStoredQuotes(raw: unknown): StoredQuotes {

  if (!raw || typeof raw !== "object") return {};

  const o = raw as Record<string, unknown>;

  const num = (v: unknown) => {

    const n = Number(v);

    return Number.isFinite(n) && n > 0 ? n : undefined;

  };

  return {

    NONE: num(o.NONE),

    CASH: num(o.CASH),

    DEBIT: num(o.DEBIT),

  };

}



export function storedQuotesToJson(quotes: StoredQuotes): Prisma.InputJsonValue {

  const out: Record<string, number> = {};

  if (quotes.NONE != null) out.NONE = quotes.NONE;

  if (quotes.CASH != null) out.CASH = quotes.CASH;

  if (quotes.DEBIT != null) out.DEBIT = quotes.DEBIT;

  return out;

}



/** Fetch and merge all receipt-variant rates from NoOnes for one rate tier. */
export async function fetchStoredQuotesForTarget(params: {
  paymentMethod: string;
  cardCurrency: string;
  cardAmount: number;
  medium: CardMedium;
  /** When true, only offers that accept non-standard countries are used. */
  otherCountriesOnly?: boolean;
}): Promise<{ storedQuotes: StoredQuotes; nairaPerUnit: number | null }> {
  let scored = await loadScoredOffersForMedium({
    paymentMethod: params.paymentMethod,
    cardCurrency: params.cardCurrency,
    cardAmount: params.cardAmount,
    medium: params.medium,
  });

  if (params.otherCountriesOnly) {
    scored = scored.filter((s) => filterOtherCountryOffers([s.offer]).length > 0);
    if (!scored.length) return { storedQuotes: {}, nairaPerUnit: null };
  }
  const { noonesTopOffersForRate } = await getRateConfig();

  const ecodeFactor = params.medium === "ECODE" ? env.noones.ecodeRateFactor : 1;

  const storedQuotes: StoredQuotes = {};



  for (const receiptType of ["NONE", "CASH", "DEBIT"] as ReceiptType[]) {

    const pool = scored.filter((o) => offerMatchesReceiptType(o.offer, receiptType));

    const avg = averageTopOffersNaira(pool, noonesTopOffersForRate);

    if (avg && avg > 0) storedQuotes[receiptType] = avg * ecodeFactor;

  }



  const nairaPerUnit =

    storedQuotes.CASH ?? storedQuotes.DEBIT ?? storedQuotes.NONE ?? null;



  return { storedQuotes, nairaPerUnit };

}

