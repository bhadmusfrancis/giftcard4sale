import { env } from "../../env";
import { prisma } from "../../prisma";
import { getRateConfig } from "../rateConfig";
import { NoOnesApiResponse } from "./types";

let cachedToken: { value: string; expiresAt: number } | null = null;

export class NoOnesApiError extends Error {
  constructor(
    message: string,
    public code?: number
  ) {
    super(message);
    this.name = "NoOnesApiError";
  }
}

export function isNoOnesConfigured(): boolean {
  return Boolean(env.noones.enabled && env.noones.clientId && env.noones.clientSecret);
}

/** True when NoOnes credentials exist and admin has background auto-resell enabled globally. */
export async function isAutoResellEnabled(): Promise<boolean> {
  if (!isNoOnesConfigured()) return false;
  const config = await getRateConfig();
  return config.noonesAutoResellEnabled;
}

/** True when global auto-resell is on and this card type is selected for auto-trade. */
export async function isAutoResellEnabledForCard(cardTypeId: string): Promise<boolean> {
  if (!isNoOnesConfigured()) return false;
  const [config, card] = await Promise.all([
    getRateConfig(),
    prisma.cardType.findUnique({
      where: { id: cardTypeId },
      select: { noonesAutoResellEnabled: true },
    }),
  ]);
  if (!config.noonesAutoResellEnabled) return false;
  return card?.noonesAutoResellEnabled !== false;
}

/** Exchange client credentials for a JWT (cached until ~1 min before expiry). */
export async function getAccessToken(): Promise<string> {
  if (!isNoOnesConfigured()) throw new NoOnesApiError("NoOnes is not configured");

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.noones.clientId,
    client_secret: env.noones.clientSecret,
  });

  const res = await fetch(env.noones.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new NoOnesApiError(`Token request failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in?: number };
  if (!json.access_token) throw new NoOnesApiError("No access_token in OAuth response");

  cachedToken = {
    value: json.access_token,
    expiresAt: now + (json.expires_in ?? 864_000) * 1000,
  };
  return cachedToken.value;
}

/** POST to a NoOnes API endpoint (Paxful-compatible form body). */
export async function noonesPost<T>(
  endpoint: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<T> {
  const token = await getAccessToken();
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") body.set(k, String(v));
  }

  const url = `${env.noones.apiBase}/${endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json; version=1",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  let json: NoOnesApiResponse<T>;
  try {
    json = JSON.parse(text) as NoOnesApiResponse<T>;
  } catch {
    throw new NoOnesApiError(`Invalid JSON from NoOnes (${endpoint}): ${text.slice(0, 200)}`);
  }

  if (json.status === "error" || json.error) {
    throw new NoOnesApiError(json.error?.message || "NoOnes API error", json.error?.code);
  }

  return json.data as T;
}

/** Download a trade-chat image. Returns PNG/JPEG bytes (not JSON). */
export async function noonesFetchImage(imageHash: string, size: 2 | 3 = 2): Promise<Buffer> {
  const token = await getAccessToken();
  const body = new URLSearchParams({ image_hash: imageHash, size: String(size) });
  const url = `${env.noones.apiBase}/trade-chat/image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "*/*",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const buf = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    throw new NoOnesApiError(`Image fetch failed (${res.status}): ${buf.toString("utf8").slice(0, 200)}`);
  }
  if (buf.length >= 1 && buf[0] === 0x7b) {
    try {
      const json = JSON.parse(buf.toString("utf8")) as NoOnesApiResponse<unknown>;
      if (json.status === "error" || json.error) {
        throw new NoOnesApiError(json.error?.message || "NoOnes image error", json.error?.code);
      }
    } catch (err) {
      if (err instanceof NoOnesApiError) throw err;
    }
    throw new NoOnesApiError(`Unexpected JSON from trade-chat/image: ${buf.toString("utf8").slice(0, 200)}`);
  }
  return buf;
}

/** Multipart upload (trade-chat/image/upload). */
export async function noonesUpload(
  endpoint: string,
  fields: Record<string, string>,
  file: { buffer: Buffer; filename: string; mimeType: string }
): Promise<{ success?: boolean; id?: string }> {
  const token = await getAccessToken();
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.append(k, v);
  form.append("file", new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }), file.filename);

  const url = `${env.noones.apiBase}/${endpoint.replace(/^\//, "")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json; version=1",
    },
    body: form,
  });

  const text = await res.text();
  const json = JSON.parse(text) as NoOnesApiResponse<{ success?: boolean; id?: string }>;
  if (json.status === "error" || json.error) {
    throw new NoOnesApiError(json.error?.message || "NoOnes upload error", json.error?.code);
  }
  return json.data ?? {};
}
