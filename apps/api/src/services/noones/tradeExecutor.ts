import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { env } from "../../env";
import { UPLOAD_DIR } from "../../lib/upload";
import { notify } from "../notify";
import { payTrade } from "../payout";
import { rejectTradeWithBadScore } from "../tradeRejection";
import { getRateConfig } from "../rateConfig";
import { isNoOnesConfigured, noonesPost, noonesUpload, NoOnesApiError } from "./client";
import { resolveOfferForCard } from "./rates";
import { NoOnesTradeGetData } from "./types";

interface NoOnesChatMessage {
  text?: string;
  message?: string;
  author?: string;
  is_for_moderator?: boolean;
}

interface NoOnesChatData {
  messages?: NoOnesChatMessage[];
}

async function readAttachmentBuffer(url: string): Promise<{ buffer: Buffer; filename: string; mimeType: string } | null> {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const filename = path.basename(new URL(url).pathname) || "card.jpg";
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    return { buffer, filename, mimeType };
  }

  const localName = url.replace(/^.*\/uploads\//, "");
  const filePath = path.join(UPLOAD_DIR, localName);
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";
  return { buffer, filename: localName, mimeType };
}

async function uploadTradeAttachments(tradeHash: string, attachmentUrls: string[]): Promise<void> {
  for (const url of attachmentUrls) {
    const file = await readAttachmentBuffer(url);
    if (!file) {
      if (url.startsWith("http")) {
        await noonesPost("trade-chat/image/add", { trade_hash: tradeHash, file: url });
      }
      continue;
    }

    await noonesUpload("trade-chat/image/upload", { trade_hash: tradeHash }, file);
  }
}

function displayCountry(trade: { country: string; otherCountryName?: string | null }): string {
  if (trade.country === "Other" && trade.otherCountryName?.trim()) {
    return trade.otherCountryName.trim();
  }
  return trade.country;
}

function buildGreetingMessage(trade: {
  cardDenominations?: string | null;
  cardAmount: number | { toString(): string };
  country: string;
  otherCountryName?: string | null;
  cardType: { name: string };
}): string {
  const country = displayCountry(trade);
  const cardName = trade.cardType.name.replace(/\s+gift\s+card$/i, "").trim();
  const denominations = trade.cardDenominations?.trim() || `${Number(trade.cardAmount)}x1`;
  return `Hi, got ${denominations} ${country} ${cardName} gift card`;
}

/** Gross up the user-facing effective rate to raw NoOnes marketplace level (re-add deduction). */
async function grossUpNairaPerUnit(effectiveRate: number, payoutCurrency: string): Promise<number> {
  const config = await getRateConfig();
  const reduction =
    payoutCurrency === "NGN"
      ? config.reductions.nairaReductionPercent
      : payoutCurrency === "USDT"
        ? config.reductions.usdtReductionPercent
        : config.reductions.ghsReductionPercent;
  return effectiveRate / (1 - reduction / 100);
}

function partnerSaidSend(messages: NoOnesChatMessage[]): boolean {
  const sendPattern = /\bsend\b/i;
  return messages.some((m) => {
    const text = (m.text || m.message || "").trim();
    if (!text || m.is_for_moderator) return false;
    return sendPattern.test(text);
  });
}

async function fetchTradeChatMessages(tradeHash: string): Promise<NoOnesChatMessage[]> {
  try {
    const data = await noonesPost<NoOnesChatData>("trade-chat/get", { trade_hash: tradeHash });
    return data.messages ?? [];
  } catch {
    return [];
  }
}

async function deliverCardToPartner(tradeId: string, tradeHash: string): Promise<void> {
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { attachments: true },
  });
  if (!trade || !trade.noonesAwaitingSend) return;

  if (trade.ecodes?.trim()) {
    await noonesPost("trade-chat/post", {
      trade_hash: tradeHash,
      message: trade.ecodes.trim(),
    });
  }

  if (trade.notes?.trim()) {
    await noonesPost("trade-chat/post", {
      trade_hash: tradeHash,
      message: trade.notes.trim(),
    });
  }

  const urls = trade.attachments.map((a) => a.url);
  if (urls.length) {
    await uploadTradeAttachments(tradeHash, urls);
  }

  await noonesPost("trade/paid", { trade_hash: tradeHash });

  await prisma.trade.update({
    where: { id: tradeId },
    data: { noonesAwaitingSend: false, noonesStatus: "PAID" },
  });
}

/**
 * Auto-resell a user's gift card on NoOnes (user never sees NoOnes).
 * Opens the trade with a greeting and waits for the partner to say "send".
 */
export async function executeNoOnesResell(tradeId: string): Promise<void> {
  if (!isNoOnesConfigured()) return;

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { cardType: true, attachments: true },
  });
  if (!trade) return;
  if (trade.noonesTradeHash && !trade.noonesAwaitingSend) return;
  if (trade.status === "REJECTED" || trade.status === "PAID") return;

  const cardAmount = Number(trade.cardAmount);

  try {
    const minNairaPerUnit = await grossUpNairaPerUnit(Number(trade.effectiveRate), trade.payoutCurrency);

    const market = await resolveOfferForCard({
      cardSlug: trade.cardType.slug,
      cardName: trade.cardType.name,
      paymentMethodOverride: trade.cardType.noonesPaymentMethod,
      cardCurrency: trade.currency,
      cardAmount,
      medium: trade.medium,
      receiptType: trade.receiptType,
      preferNoReceipt: trade.receiptType === "NONE",
      minNairaPerUnit,
    });

    if (!market) {
      await markNoOnesError(trade.id, "No matching NoOnes offer for this card");
      return;
    }

    let tradeHash = trade.noonesTradeHash;

    if (!tradeHash) {
      const start = await noonesPost<{ success: boolean; trade_hash: string }>("trade/start", {
        offer_hash: market.offerHash,
        fiat: cardAmount,
      });

      if (!start.trade_hash) {
        await markNoOnesError(trade.id, "NoOnes did not return a trade hash");
        return;
      }

      tradeHash = start.trade_hash;

      await prisma.trade.update({
        where: { id: trade.id },
        data: {
          noonesTradeHash: tradeHash,
          noonesOfferHash: market.offerHash,
          noonesStatus: "ACTIVE",
          status: "PROCESSING",
          noonesAwaitingSend: true,
        },
      });

      const greeting = buildGreetingMessage(trade);
      await noonesPost("trade-chat/post", {
        trade_hash: tradeHash,
        message: greeting,
      });
    }

    const messages = await fetchTradeChatMessages(tradeHash);
    if (partnerSaidSend(messages)) {
      await deliverCardToPartner(trade.id, tradeHash);
    }

    await notify({
      userId: trade.userId,
      title: "Trade processing",
      body: `Your ${trade.cardType.name} trade is being verified. We'll credit your wallet once complete.`,
      link: `/dashboard/trades/${trade.id}`,
      email: false,
    });
  } catch (err) {
    const msg = err instanceof NoOnesApiError ? err.message : (err as Error).message;
    console.error(`NoOnes resell failed for trade ${tradeId}:`, msg);
    await markNoOnesError(tradeId, msg);
  }
}

/** Check trades waiting for partner "send" and deliver when ready. */
export async function pollAwaitingSendTrades(): Promise<void> {
  if (!isNoOnesConfigured()) return;

  const trades = await prisma.trade.findMany({
    where: {
      noonesAwaitingSend: true,
      noonesTradeHash: { not: null },
      status: { in: ["PROCESSING", "APPROVED"] },
    },
  });

  for (const t of trades) {
    try {
      const messages = await fetchTradeChatMessages(t.noonesTradeHash!);
      if (partnerSaidSend(messages)) {
        await deliverCardToPartner(t.id, t.noonesTradeHash!);
      }
    } catch (err) {
      console.error(`NoOnes awaiting-send poll failed for ${t.id}:`, (err as Error).message);
    }
  }
}

async function markNoOnesError(tradeId: string, message: string): Promise<void> {
  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: {
      noonesError: message.slice(0, 2000),
      noonesStatus: "ERROR",
      status: "PENDING",
      noonesAwaitingSend: false,
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
  await Promise.all(
    admins.map((a) =>
      notify({
        userId: a.id,
        title: "NoOnes resell needs attention",
        body: `Trade ${tradeId}: ${message}`,
        link: `/admin/trades/${tradeId}`,
      })
    )
  );
}

/** Poll open NoOnes trades and finalize if released (webhook backup). */
export async function pollActiveNoOnesTrades(): Promise<void> {
  if (!isNoOnesConfigured()) return;

  await pollAwaitingSendTrades();

  const trades = await prisma.trade.findMany({
    where: {
      noonesTradeHash: { not: null },
      noonesAwaitingSend: false,
      status: { in: ["PROCESSING", "APPROVED"] },
    },
  });

  for (const t of trades) {
    try {
      const data = await noonesPost<NoOnesTradeGetData>("trade/get", {
        trade_hash: t.noonesTradeHash!,
      });
      const status = (data.trade?.trade_status || data.trade?.status || "").toLowerCase();
      await handleNoOnesTradeStatus(t.id, t.noonesTradeHash!, status, data.trade);
    } catch (err) {
      console.error(`NoOnes poll failed for ${t.id}:`, (err as Error).message);
    }
  }
}

/** Called from webhooks when partner sends a chat message. */
export async function handleNoOnesChatMessage(tradeHash: string): Promise<void> {
  const trade = await prisma.trade.findUnique({ where: { noonesTradeHash: tradeHash } });
  if (!trade?.noonesAwaitingSend) return;

  const messages = await fetchTradeChatMessages(tradeHash);
  if (partnerSaidSend(messages)) {
    await deliverCardToPartner(trade.id, tradeHash);
  }
}

export async function handleNoOnesTradeStatus(
  internalTradeId: string,
  noonesTradeHash: string,
  noonesStatus: string,
  remoteTrade?: { crypto_amount?: number; crypto_amount_total?: number; crypto_currency_code?: string }
): Promise<void> {
  const normalized = noonesStatus.toLowerCase();

  if (normalized.includes("released")) {
    await finalizeSuccessfulResell(internalTradeId, noonesTradeHash, remoteTrade);
    return;
  }

  if (
    normalized.includes("cancelled") ||
    normalized.includes("expired") ||
    normalized.includes("dispute wins buyer")
  ) {
    await finalizeFailedResell(internalTradeId, noonesTradeHash, "Trade could not be completed on the marketplace");
    return;
  }

  await prisma.trade.update({
    where: { id: internalTradeId },
    data: { noonesStatus: noonesStatus || undefined },
  });
}

async function finalizeSuccessfulResell(
  tradeId: string,
  noonesTradeHash: string,
  remoteTrade?: { crypto_amount?: number; crypto_amount_total?: number; crypto_currency_code?: string }
): Promise<void> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || trade.status === "PAID") return;

  const cryptoRaw = remoteTrade?.crypto_amount_total ?? remoteTrade?.crypto_amount;
  const cryptoCurrency = remoteTrade?.crypto_currency_code || env.noones.cryptoCurrency;

  await prisma.trade.update({
    where: { id: tradeId },
    data: {
      noonesStatus: "RELEASED",
      noonesTradeHash,
      noonesCryptoAmount: cryptoRaw != null ? new Prisma.Decimal(cryptoRaw) : undefined,
      noonesCryptoCurrency: cryptoCurrency,
      noonesAwaitingSend: false,
      status: "APPROVED",
      finalPayout: trade.finalPayout ?? trade.quotedPayout,
    },
  });

  await payTrade(tradeId);
}

async function finalizeFailedResell(tradeId: string, noonesTradeHash: string, reason: string): Promise<void> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || trade.status === "PAID" || trade.status === "REJECTED") return;

  const rejected = await rejectTradeWithBadScore(tradeId, {
    rejectionReason: reason,
    noonesStatus: "CANCELLED",
    noonesTradeHash,
  });
  if (!rejected) return;

  await notify({
    userId: trade.userId,
    title: "Trade rejected",
    body: reason,
    link: `/dashboard/trades/${trade.id}`,
  });
}
