import { createHash } from "crypto";
import type { Request } from "express";
import { env } from "../env";

export type MetaUserData = {
  email?: string | null;
  phone?: string | null;
  externalId?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type MetaCustomData = {
  value?: number;
  currency?: string;
  content_name?: string;
  content_ids?: string[];
  content_type?: string;
  order_id?: string;
  num_items?: number;
  [key: string]: unknown;
};

export type MetaEventInput = {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  actionSource?: "website" | "system_generated" | "other";
  userData: MetaUserData;
  customData?: MetaCustomData;
};

function sha256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function hashIfPresent(value?: string | null): string | undefined {
  if (!value?.trim()) return undefined;
  return sha256(value);
}

/** Pull fbp/fbc/eventId from JSON body, multipart fields, or headers. */
export function metaAttributionFromRequest(req: Request): {
  fbp?: string;
  fbc?: string;
  eventId?: string;
  eventSourceUrl?: string;
} {
  const body = (req.body || {}) as Record<string, unknown>;
  const header = (name: string) => {
    const v = req.headers[name.toLowerCase()];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const fromBody = (key: string) => {
    const v = body[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };

  return {
    fbp: fromBody("fbp") || fromBody("metaFbp") || header("x-meta-fbp"),
    fbc: fromBody("fbc") || fromBody("metaFbc") || header("x-meta-fbc"),
    eventId: fromBody("eventId") || fromBody("metaEventId") || header("x-meta-event-id"),
    eventSourceUrl:
      fromBody("eventSourceUrl") || fromBody("metaEventSourceUrl") || header("x-meta-event-source-url"),
  };
}

export function clientIpFromRequest(req: Request): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim();
  }
  return req.ip || undefined;
}

export function userAgentFromRequest(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function buildUserData(user: MetaUserData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const em = hashIfPresent(user.email);
  if (em) out.em = [em];
  const ph = hashIfPresent(user.phone);
  if (ph) out.ph = [ph];
  const externalId = hashIfPresent(user.externalId);
  if (externalId) out.external_id = [externalId];
  if (user.clientIpAddress) out.client_ip_address = user.clientIpAddress;
  if (user.clientUserAgent) out.client_user_agent = user.clientUserAgent;
  if (user.fbp) out.fbp = user.fbp;
  if (user.fbc) out.fbc = user.fbc;
  return out;
}

/**
 * Send an event to Meta Conversion API. No-ops when Pixel ID or access token
 * are unset. Never throws to callers — failures are logged only.
 */
export async function sendMetaEvent(input: MetaEventInput): Promise<void> {
  const pixelId = env.meta.pixelId;
  const accessToken = env.meta.capiAccessToken;
  if (!pixelId || !accessToken) return;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: input.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.eventSourceUrl || env.webUrl,
        action_source: input.actionSource || "website",
        user_data: buildUserData(input.userData),
        ...(input.customData && Object.keys(input.customData).length
          ? { custom_data: input.customData }
          : {}),
      },
    ],
  };

  if (env.meta.capiTestEventCode) {
    payload.test_event_code = env.meta.capiTestEventCode;
  }

  const url = `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[meta-capi] ${input.eventName} failed (${res.status}):`, text.slice(0, 500));
      return;
    }
    if (!env.isProd) {
      console.log(`[meta-capi] sent ${input.eventName} event_id=${input.eventId}`);
    }
  } catch (err) {
    console.error(`[meta-capi] ${input.eventName} error:`, (err as Error).message);
  }
}

/** Fire-and-forget wrapper so route handlers stay non-blocking. */
export function trackMetaEvent(input: MetaEventInput): void {
  void sendMetaEvent(input).catch((err) =>
    console.error("[meta-capi] unexpected:", (err as Error).message)
  );
}
