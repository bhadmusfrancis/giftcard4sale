import nacl from "tweetnacl";
import { prisma } from "../../prisma";
import { env } from "../../env";
import { getAccessToken } from "./client";
import { handleNoOnesTradeStatus, handleNoOnesChatMessage } from "./tradeExecutor";
import { NoOnesWebhookPayload } from "./types";

export function verifyNoOnesSignature(signatureB64: string, rawBody: string): boolean {
  if (!signatureB64 || !env.noones.webhookUrl) return env.nodeEnv !== "production";

  try {
    const payload = `${env.noones.webhookUrl}:${rawBody}`;
    return nacl.sign.detached.verify(
      Buffer.from(payload, "utf8"),
      Buffer.from(signatureB64, "base64"),
      Buffer.from(env.noones.webhookPublicKey, "base64")
    );
  } catch {
    return false;
  }
}

function extractEventType(body: NoOnesWebhookPayload): string {
  return (body.type || body.event_type || "").toLowerCase();
}

function extractTradeHash(body: NoOnesWebhookPayload): string | null {
  return body.trade_hash || body.trade?.trade_hash || null;
}

/** Handle incoming NoOnes webhook (v2 payloads mirror API trade objects). */
export async function processNoOnesWebhook(rawBody: string, signature?: string): Promise<void> {
  if (signature && !verifyNoOnesSignature(signature, rawBody)) {
    throw Object.assign(new Error("Invalid NoOnes webhook signature"), { status: 401 });
  }

  // Validation / challenge request (empty type).
  if (!rawBody || rawBody === "{}" || rawBody.trim() === "") return;

  let body: NoOnesWebhookPayload;
  try {
    body = JSON.parse(rawBody) as NoOnesWebhookPayload;
  } catch {
    return;
  }

  const eventType = extractEventType(body);
  const tradeHash = extractTradeHash(body);
  if (!eventType || !tradeHash) return;

  // Idempotency: skip duplicate events.
  const existing = await prisma.noOnesWebhookEvent.findUnique({
    where: { eventType_tradeHash: { eventType, tradeHash } },
  });
  if (existing?.processed) return;

  await prisma.noOnesWebhookEvent.upsert({
    where: { eventType_tradeHash: { eventType, tradeHash } },
    create: { eventType, tradeHash, payload: body as object, processed: false },
    update: { payload: body as object },
  });

  const trade = await prisma.trade.findUnique({ where: { noonesTradeHash: tradeHash } });
  if (!trade) {
    await prisma.noOnesWebhookEvent.update({
      where: { eventType_tradeHash: { eventType, tradeHash } },
      data: { processed: true },
    });
    return;
  }

  const remoteStatus =
    body.trade?.trade_status || body.trade?.status || eventType.replace("trade.", "").toUpperCase();

  if (eventType === "trade.released" || eventType.includes("released")) {
    await handleNoOnesTradeStatus(trade.id, tradeHash, "Released", body.trade);
  } else if (eventType === "trade.cancelled_or_expired" || eventType.includes("cancelled")) {
    await handleNoOnesTradeStatus(trade.id, tradeHash, "Cancelled", body.trade);
  } else if (eventType === "trade.chat_message_received" || eventType.includes("chat_message")) {
    await handleNoOnesChatMessage(tradeHash);
  } else if (eventType === "trade.paid") {
    await prisma.trade.update({
      where: { id: trade.id },
      data: { noonesStatus: "PAID" },
    });
  } else if (eventType === "trade.started") {
    await prisma.trade.update({
      where: { id: trade.id },
      data: { noonesStatus: "ACTIVE", status: "PROCESSING" },
    });
  } else {
    await handleNoOnesTradeStatus(trade.id, tradeHash, remoteStatus, body.trade);
  }

  await prisma.noOnesWebhookEvent.update({
    where: { eventType_tradeHash: { eventType, tradeHash } },
    data: { processed: true },
  });
}

/** Register webhooks with NoOnes (Direct Access — call once after deploy). */
export async function registerNoOnesWebhooks(): Promise<void> {
  if (!env.noones.applicationId || !env.noones.webhookUrl) return;

  const token = await getAccessToken();
  const events = [
    "trade.started",
    "trade.paid",
    "trade.released",
    "trade.cancelled_or_expired",
    "trade.chat_message_received",
  ];

  const url = `https://api.noones.com/webhook/v1/applications/${env.noones.applicationId}/user/webhooks`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      endpoints: events.map((event_type) => ({
        event_type,
        url: env.noones.webhookUrl,
        enabled: true,
      })),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn("NoOnes webhook registration failed:", text);
  } else {
    console.log("NoOnes webhooks registered →", env.noones.webhookUrl);
  }
}
