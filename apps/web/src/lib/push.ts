import { api } from "@/lib/api";

/**
 * Web push is on by default: signed-in browsers are subscribed automatically
 * (asking for permission on the first interaction where needed). Turning it
 * off records an opt-out on this device so it is never re-enabled behind the
 * user's back.
 */
const OPT_OUT_KEY = "gc4s-push-opt-out";

/** Fired on `window` whenever this device's push state changes. */
export const PUSH_CHANGE_EVENT = "gc4s-push-change";

function announce() {
  window.dispatchEvent(new Event(PUSH_CHANGE_EVENT));
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function pushOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function setOptedOut(value: boolean) {
  try {
    if (value) localStorage.setItem(OPT_OUT_KEY, "1");
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch {
    // storage unavailable (private mode) — nothing to persist
  }
}

async function registration() {
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return reg;
}

/** The browser's current subscription, if permission is granted and one exists. */
export async function currentPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported() || Notification.permission !== "granted") return null;
  return (await registration()).pushManager.getSubscription();
}

/**
 * Subscribe this browser and register it with the server. Asks for permission
 * when it hasn't been decided yet; throws if denied or unsupported.
 */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error("Push not supported in this browser");
  const { key } = await api<{ key: string }>("/notifications/vapid-public-key");
  if (!key) throw new Error("Push not configured on the server (set VAPID keys)");

  const reg = await registration();
  const permission =
    Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
  if (permission !== "granted") throw new Error("Notifications are blocked in your browser settings");

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) }));
  await api("/notifications/subscribe", { body: sub.toJSON() });
  setOptedOut(false);
  announce();
}

/** Unsubscribe this browser, forget it on the server, and remember the opt-out. */
export async function disablePush(): Promise<void> {
  setOptedOut(true);
  const sub = await currentPushSubscription();
  if (sub) {
    await api("/notifications/unsubscribe", { body: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe().catch(() => false);
  }
  announce();
}
