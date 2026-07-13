import { API_URL } from "@/lib/api";

const VISITOR_KEY = "gc4s_vid";
const SESSION_KEY = "gc4s_sid";

function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getOrCreate(storage: Storage, key: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = uuid();
    storage.setItem(key, id);
    return id;
  } catch {
    return uuid();
  }
}

export function getAnalyticsIds(): { visitorId: string; sessionId: string } {
  return {
    visitorId: getOrCreate(localStorage, VISITOR_KEY),
    sessionId: getOrCreate(sessionStorage, SESSION_KEY),
  };
}

export function detectDevice(): "desktop" | "mobile" | "tablet" {
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
  return "desktop";
}

/** Fire-and-forget page view; never throws to callers. */
export function trackPageView(pathname: string): void {
  if (typeof window === "undefined") return;
  if (pathname.startsWith("/admin")) return;

  try {
    const { visitorId, sessionId } = getAnalyticsIds();
    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      device: detectDevice(),
      visitorId,
      sessionId,
    });

    const url = `${API_URL}/api/analytics/collect`;
    void fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
