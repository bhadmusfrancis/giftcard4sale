import { env } from "../../env";
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

/** True when NoOnes credentials exist and admin has background auto-resell enabled. */
export async function isAutoResellEnabled(): Promise<boolean> {
  if (!isNoOnesConfigured()) return false;
  const config = await getRateConfig();
  return config.noonesAutoResellEnabled;
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
