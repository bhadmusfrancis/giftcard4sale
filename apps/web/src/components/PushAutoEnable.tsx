"use client";

import { useEffect } from "react";
import { enablePush, pushOptedOut, pushSupported } from "@/lib/push";

/**
 * Turns push on by default for signed-in users. With permission already
 * granted the browser is (re)subscribed silently; while undecided, the prompt
 * waits for the first click or key press, because most browsers only show it
 * in response to a user gesture. Respects a previous opt-out or a block.
 */
export function PushAutoEnable() {
  useEffect(() => {
    if (!pushSupported() || pushOptedOut()) return;
    const permission = Notification.permission;
    if (permission === "denied") return;

    if (permission === "granted") {
      void enablePush().catch(() => {});
      return;
    }

    const events = ["pointerdown", "keydown"] as const;
    const onFirstInteraction = () => {
      events.forEach((e) => window.removeEventListener(e, onFirstInteraction));
      void enablePush().catch(() => {});
    };
    events.forEach((e) => window.addEventListener(e, onFirstInteraction, { once: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onFirstInteraction));
  }, []);

  return null;
}
