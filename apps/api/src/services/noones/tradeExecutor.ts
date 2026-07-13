import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "../../prisma";
import { env } from "../../env";
import { UPLOAD_DIR } from "../../lib/upload";
import { notify, notifyAdmins } from "../notify";
import { payTrade } from "../payout";
import { rejectTradeWithBadScore } from "../tradeRejection";
import { getRateConfig } from "../rateConfig";
import { isAutoResellEnabledForCard, isNoOnesConfigured, noonesPost, noonesUpload, NoOnesApiError } from "./client";
import { resolveOfferForCard } from "./rates";
import { NoOnesTradeGetData } from "./types";

interface NoOnesChatMessage {
  id?: string;
  text?: string;
  message?: string;
  author?: string;
  user_id?: string | number;
  type?: string;
  timestamp?: number;
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

function isReceiptAttachment(filename: string | null | undefined): boolean {
  return !!filename?.startsWith("receipt-");
}

function cardAttachmentUrls(attachments: { url: string; filename: string | null }[]): string[] {
  return attachments.filter((a) => !isReceiptAttachment(a.filename)).map((a) => a.url);
}

function receiptAttachmentUrls(attachments: { url: string; filename: string | null }[]): string[] {
  return attachments.filter((a) => isReceiptAttachment(a.filename)).map((a) => a.url);
}

function displayCountry(trade: { country: string; otherCountryName?: string | null }): string {
  if (trade.country === "Other" && trade.otherCountryName?.trim()) {
    return trade.otherCountryName.trim();
  }
  return trade.country;
}

function mediumLabel(medium: string): string {
  return medium === "ECODE" ? "E-code" : "Physical card";
}

function buildGreetingMessage(trade: {
  cardDenominations?: string | null;
  cardAmount: number | { toString(): string };
  country: string;
  otherCountryName?: string | null;
  medium: string;
  cardType: { name: string };
}): string {
  const country = displayCountry(trade);
  const cardName = trade.cardType.name.replace(/\s+gift\s+card$/i, "").trim();
  const denominations = trade.cardDenominations?.trim() || `${Number(trade.cardAmount)}x1`;
  const mediumTag = mediumLabel(trade.medium);
  return `Hi, got ${denominations} ${country} ${cardName} (${mediumTag}) gift card`;
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

/** Affirmative "send the card/code now" — not a bare "send" (offer terms often say "send"). */
const PARTNER_ASK_SEND_PATTERNS = [
  /\b(please\s+|pls\s+|kindly\s+)?send\s+(me\s+)?(the\s+)?(card|cards|code|codes|e-?codes?|pin|details|gc|it|them|now)\b/i,
  /\b(card|cards|code|codes|e-?codes?|pin|details)\b.{0,24}\b(please|now|ready)\b/i,
  /\byou can send\b/i,
  /\bgo ahead\b/i,
  /\bready when you are\b/i,
  /\bi('?m| am)?\s+ready\b/i,
  /\bok(ay)?\s+send\b/i,
  /^(send|pls send|please send|send now|send please)[.!\s]*$/i,
];

/** Partner is telling us to wait — never treat these as a send request. */
const PARTNER_HOLD_PATTERNS = [
  /\b(don'?t|do not|never|not yet|wait|hold|before you)\b.{0,40}\bsend\b/i,
  /\bsend\b.{0,40}\b(only after|when i|after i|once i|until i|later)\b/i,
];

const GREETING_PATTERN = /^Hi, got .+ gift card$/i;

function messageText(m: NoOnesChatMessage): string {
  return (m.text || m.message || "").trim();
}

function isUserChatMessage(m: NoOnesChatMessage): boolean {
  if (m.is_for_moderator) return false;
  const type = (m.type || "msg").toLowerCase();
  return type === "msg" || type === "message" || !m.type;
}

function isOurChatMessage(m: NoOnesChatMessage, ourAuthors: Set<string>, ourUserIds: Set<string>): boolean {
  if (m.author && ourAuthors.has(String(m.author).toLowerCase())) return true;
  if (m.user_id != null && ourUserIds.has(String(m.user_id))) return true;
  return false;
}

/**
 * True only when the trade partner explicitly asks us to send card/code.
 * Ignores system noise, our own messages, offer-term dumps, and anything before our greeting.
 */
function partnerAskedToSend(messages: NoOnesChatMessage[]): boolean {
  const greetingIdx = messages.findIndex((m) => GREETING_PATTERN.test(messageText(m)));
  // Require messages after our greeting so offer terms / open-trade noise never trigger delivery.
  if (greetingIdx < 0) return false;
  const scope = messages.slice(greetingIdx + 1);
  if (scope.length === 0) return false;

  const greeting = messages[greetingIdx];
  const ourAuthors = new Set<string>();
  const ourUserIds = new Set<string>();
  if (greeting.author) ourAuthors.add(String(greeting.author).toLowerCase());
  if (greeting.user_id != null) ourUserIds.add(String(greeting.user_id));

  return scope.some((m) => {
    if (!isUserChatMessage(m)) return false;
    if (isOurChatMessage(m, ourAuthors, ourUserIds)) return false;

    const text = messageText(m);
    if (!text) return false;
    // Offer terms / long auto-templates often contain "send" without asking us now.
    if (text.length > 280) return false;
    if (PARTNER_HOLD_PATTERNS.some((pattern) => pattern.test(text))) return false;
    return PARTNER_ASK_SEND_PATTERNS.some((pattern) => pattern.test(text));
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
  if (!trade || !trade.noonesAwaitingSend || trade.status === "CANCELLED") return;

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

  const cardUrls = cardAttachmentUrls(trade.attachments);
  if (cardUrls.length) {
    await uploadTradeAttachments(tradeHash, cardUrls);
  }

  await noonesPost("trade/paid", { trade_hash: tradeHash });

  await prisma.trade.update({
    where: { id: tradeId },
    data: { noonesAwaitingSend: false, noonesStatus: "PAID" },
  });
}

/**
 * Auto-resell a user's gift card on NoOnes (user never sees NoOnes).
 * Opens the trade with a greeting, uploads receipt when required, then waits until the partner asks for card/code.
 */
export async function executeNoOnesResell(
  tradeId: string,
  options: { force?: boolean } = {}
): Promise<void> {
  if (!isNoOnesConfigured()) return;

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { cardType: true, attachments: true },
  });
  if (!trade) return;

  if (!options.force) {
    const enabled = await isAutoResellEnabledForCard(trade.cardTypeId);
    if (!enabled) return;
  }

  if (trade.noonesTradeHash && !trade.noonesAwaitingSend) return;
  if (trade.status === "REJECTED" || trade.status === "PAID" || trade.status === "CANCELLED") return;

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

      const claimed = await prisma.trade.updateMany({
        where: { id: trade.id, status: { notIn: ["CANCELLED", "REJECTED", "PAID"] } },
        data: {
          noonesTradeHash: tradeHash,
          noonesOfferHash: market.offerHash,
          noonesStatus: "ACTIVE",
          status: "PROCESSING",
          noonesAwaitingSend: true,
        },
      });
      if (claimed.count === 0) return;

      const greeting = buildGreetingMessage(trade);
      await noonesPost("trade-chat/post", {
        trade_hash: tradeHash,
        message: greeting,
      });

      const needsReceipt =
        trade.receiptType !== "NONE" || market.requiresReceipt;
      if (needsReceipt) {
        const receiptUrls = receiptAttachmentUrls(trade.attachments);
        if (receiptUrls.length) {
          await uploadTradeAttachments(tradeHash, receiptUrls);
        }
      }
    }

    const messages = await fetchTradeChatMessages(tradeHash);
    if (partnerAskedToSend(messages)) {
      await deliverCardToPartner(trade.id, tradeHash);
    }

    await notify({
      userId: trade.userId,
      title: "Trade processing",
      body: `Your ${trade.cardType.name} trade is being verified. We'll credit your wallet once complete.`,
      link: `/dashboard/trades/${trade.id}`,
      emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
    });
  } catch (err) {
    const msg = err instanceof NoOnesApiError ? err.message : (err as Error).message;
    console.error(`NoOnes resell failed for trade ${tradeId}:`, msg);
    await markNoOnesError(tradeId, msg);
  }
}

/** Check trades waiting for the partner to ask for card/code, then deliver. */
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
      if (partnerAskedToSend(messages)) {
        await deliverCardToPartner(t.id, t.noonesTradeHash!);
      }
    } catch (err) {
      console.error(`NoOnes awaiting-send poll failed for ${t.id}:`, (err as Error).message);
    }
  }
}

async function markNoOnesError(tradeId: string, message: string): Promise<void> {
  const updated = await prisma.trade.updateMany({
    where: { id: tradeId, status: { notIn: ["CANCELLED", "REJECTED", "PAID"] } },
    data: {
      noonesError: message.slice(0, 2000),
      noonesStatus: "ERROR",
      status: "PENDING",
      noonesAwaitingSend: false,
    },
  });
  if (updated.count === 0) return;

  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade) return;

  await notifyAdmins({
    title: "NoOnes resell needs attention",
    body: `${trade.tradeNumber}: ${message}`,
    link: `/admin/trades/${tradeId}`,
  });
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
  if (!trade?.noonesAwaitingSend || trade.status === "CANCELLED") return;

  const messages = await fetchTradeChatMessages(tradeHash);
  if (partnerAskedToSend(messages)) {
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
    await finalizeFailedResell(internalTradeId, noonesTradeHash, "Trade was rejected on the marketplace");
    return;
  }

  await prisma.trade.update({
    where: { id: internalTradeId },
    data: { noonesStatus: noonesStatus || undefined },
  });
}

/**
 * NoOnes released the funds — the trade succeeded on the marketplace.
 * Mark it APPROVED, then immediately credit the seller's wallet (payTrade sets PAID).
 * payTrade is idempotent, so retries (webhook + poller) never double-credit.
 */
async function finalizeSuccessfulResell(
  tradeId: string,
  noonesTradeHash: string,
  remoteTrade?: { crypto_amount?: number; crypto_amount_total?: number; crypto_currency_code?: string }
): Promise<void> {
  const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!trade || trade.status === "PAID" || trade.status === "CANCELLED") return;

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

  // Automatically credit the wallet now that the marketplace trade is successful.
  try {
    await payTrade(tradeId);
  } catch (err) {
    // Keep the trade APPROVED (not PAID) so the poller/webhook retries the credit.
    const msg = (err as Error).message;
    console.error(`Auto-credit failed for trade ${tradeId} after NoOnes release:`, msg);
    await notifyAdmins({
      title: "Auto-credit failed after NoOnes release",
      body: `${trade.tradeNumber}: marketplace released funds but the wallet credit failed — ${msg}`,
      link: `/admin/trades/${tradeId}`,
    });
    throw err;
  }
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
    emailDetail: trade.tradeNumber ? `Trade ID: ${trade.tradeNumber}` : undefined,
  });
}
