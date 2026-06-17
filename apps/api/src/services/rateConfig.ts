import { ExchangeRates, RateReductions } from "@gc4s/shared";
import { prisma } from "../prisma";
import { env } from "../env";

const DEFAULT_NOONES_RATE_REFRESH_MINUTES = 15;
const DEFAULT_NOONES_TOP_OFFERS_FOR_RATE = 3;

export async function getRateConfig(): Promise<{
  rates: ExchangeRates;
  reductions: RateReductions;
  referralPercent: number;
  noonesRateRefreshMinutes: number;
  noonesTopOffersForRate: number;
}> {
  let cfg = await prisma.rateConfig.findFirst({ orderBy: { updatedAt: "desc" } });
  if (!cfg) {
    cfg = await prisma.rateConfig.create({
      data: {
        ngnPerUsdt: env.rates.ngnPerUsdt,
        ngnPerGhs: env.rates.ngnPerGhs,
        nairaReductionPercent: env.reductions.nairaReductionPercent,
        fxReductionPercent: env.reductions.fxReductionPercent,
        referralPercent: env.referralPercent,
        noonesRateRefreshMinutes: DEFAULT_NOONES_RATE_REFRESH_MINUTES,
        noonesTopOffersForRate: DEFAULT_NOONES_TOP_OFFERS_FOR_RATE,
      },
    });
  }
  return {
    rates: {
      ngnPerUsdt: Number(cfg.ngnPerUsdt),
      ngnPerGhs: Number(cfg.ngnPerGhs),
    },
    reductions: {
      nairaReductionPercent: cfg.nairaReductionPercent,
      fxReductionPercent: cfg.fxReductionPercent,
    },
    referralPercent: cfg.referralPercent,
    noonesRateRefreshMinutes: cfg.noonesRateRefreshMinutes,
    noonesTopOffersForRate: cfg.noonesTopOffersForRate,
  };
}

/** True when a stored rate row was updated within the configured refresh window. */
export function isRateSyncFresh(updatedAt: Date, refreshMinutes: number): boolean {
  return Date.now() - updatedAt.getTime() < refreshMinutes * 60_000;
}
