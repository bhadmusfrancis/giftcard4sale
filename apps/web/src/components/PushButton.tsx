"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function getExistingSubscription() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  if (Notification.permission !== "granted") return null;

  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function PushButton() {
  const [state, setState] = useState<"checking" | "idle" | "done" | "error">("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sub = await getExistingSubscription();
        if (cancelled) return;
        if (sub) {
          setState("done");
          // Re-sync with server in case the DB was reset or the user re-logged in.
          api("/notifications/subscribe", { body: sub.toJSON() }).catch(() => {});
        } else {
          setState("idle");
        }
      } catch {
        if (!cancelled) setState("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push not supported in this browser");
      }
      const { key } = await api<{ key: string }>("/notifications/vapid-public-key");
      if (!key) throw new Error("Push not configured on the server (set VAPID keys)");

      const reg = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permission denied");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await api("/notifications/subscribe", { body: sub.toJSON() });
      setState("done");
    } catch (e: any) {
      setState("error");
      setMsg(e.message);
    }
  }

  return (
    <div>
      <button
        onClick={enable}
        className="btn-ghost text-sm py-2"
        disabled={state === "done" || state === "checking"}
      >
        {state === "done"
          ? "🔔 Push enabled"
          : state === "checking"
            ? "Checking push status…"
            : "Enable push notifications"}
      </button>
      {state === "error" && <p className="mt-1 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
