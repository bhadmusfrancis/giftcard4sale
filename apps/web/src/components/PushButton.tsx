"use client";

import { useEffect, useState } from "react";
import {
  PUSH_CHANGE_EVENT,
  currentPushSubscription,
  disablePush,
  enablePush,
  pushOptedOut,
  pushSupported,
} from "@/lib/push";

type PushState = "checking" | "unsupported" | "off" | "on" | "busy";

/** On/off switch for web push on this device. Push is on by default. */
export function PushButton({ hideWhenEnabled = false }: { hideWhenEnabled?: boolean } = {}) {
  const [state, setState] = useState<PushState>("checking");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (!pushSupported()) return setState("unsupported");
      try {
        const sub = await currentPushSubscription();
        if (!cancelled) setState(sub && !pushOptedOut() ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    };
    void refresh();
    window.addEventListener(PUSH_CHANGE_EVENT, refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(PUSH_CHANGE_EVENT, refresh);
    };
  }, []);

  async function toggle() {
    const turningOn = state !== "on";
    setState("busy");
    setMsg("");
    try {
      if (turningOn) await enablePush();
      else await disablePush();
      setState(turningOn ? "on" : "off");
    } catch (e: any) {
      setState(turningOn ? "off" : "on");
      setMsg(e.message);
    }
  }

  if (state === "unsupported") return null;
  if (hideWhenEnabled && (state === "on" || state === "checking")) return null;

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="btn-ghost text-sm py-2"
        disabled={state === "checking" || state === "busy"}
      >
        {state === "checking"
          ? "Checking push status…"
          : state === "busy"
            ? "Updating…"
            : state === "on"
              ? "🔔 Push on · Turn off"
              : "🔕 Push off · Turn on"}
      </button>
      {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
    </div>
  );
}
