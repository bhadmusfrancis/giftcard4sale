import { getMetaClickIds } from "@/lib/metaPixel";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const TOKEN_KEY = "gc4s_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

interface ApiOptions {
  method?: string;
  body?: any;
  isForm?: boolean;
  auth?: boolean;
  /** Shared Pixel/CAPI event id for deduplication. */
  metaEventId?: string;
}

function appendMetaAttribution(
  headers: Record<string, string>,
  body: any,
  isForm: boolean,
  metaEventId?: string
) {
  if (typeof window === "undefined") return;
  const { fbp, fbc } = getMetaClickIds();
  if (fbp) headers["X-Meta-Fbp"] = fbp;
  if (fbc) headers["X-Meta-Fbc"] = fbc;
  if (metaEventId) headers["X-Meta-Event-Id"] = metaEventId;
  headers["X-Meta-Event-Source-Url"] = window.location.href;

  if (isForm && body instanceof FormData) {
    if (fbp && !body.has("fbp")) body.append("fbp", fbp);
    if (fbc && !body.has("fbc")) body.append("fbc", fbc);
    if (metaEventId && !body.has("eventId")) body.append("eventId", metaEventId);
    if (!body.has("eventSourceUrl")) body.append("eventSourceUrl", window.location.href);
  }
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: any = undefined;
  if (opts.body !== undefined) {
    if (opts.isForm) {
      body = opts.body; // FormData
    } else {
      headers["Content-Type"] = "application/json";
      const payload =
        opts.body && typeof opts.body === "object" && !(opts.body instanceof FormData)
          ? { ...opts.body }
          : opts.body;
      if (payload && typeof payload === "object" && opts.metaEventId && !payload.eventId) {
        payload.eventId = opts.metaEventId;
      }
      if (payload && typeof payload === "object" && typeof window !== "undefined") {
        const { fbp, fbc } = getMetaClickIds();
        if (fbp && !payload.fbp) payload.fbp = fbp;
        if (fbc && !payload.fbc) payload.fbc = fbc;
        if (!payload.eventSourceUrl) payload.eventSourceUrl = window.location.href;
      }
      body = JSON.stringify(payload);
    }
  }

  appendMetaAttribution(headers, body, Boolean(opts.isForm), opts.metaEventId);

  const res = await fetch(`${API_URL}/api${path}`, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

// Server-side fetch (no token) for SSR pages.
export async function apiServer<T = any>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}/api${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
