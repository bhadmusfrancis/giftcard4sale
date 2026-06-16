"use client";

import { useState } from "react";
import { api } from "@/lib/api";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushButton() {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

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
      <button onClick={enable} className="btn-ghost text-sm py-2" disabled={state === "done"}>
        {state === "done" ? "🔔 Push enabled" : "Enable push notifications"}
      </button>
      {state === "error" && <p className="mt-1 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
