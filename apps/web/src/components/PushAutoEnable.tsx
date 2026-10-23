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

    // A permission prompt opening over a file picker or a field being typed
    // into can cancel or interrupt it, so those interactions don't trigger it.
    const events = ["pointerdown", "keydown"] as const;
    const onFirstInteraction = (e: Event) => {
      const target = e.target as Element | null;
      if (target?.closest?.("input, textarea, select, label, [contenteditable]")) return;
      events.forEach((name) => window.removeEventListener(name, onFirstInteraction));
      void enablePush().catch(() => {});
    };
    events.forEach((name) => window.addEventListener(name, onFirstInteraction));
    return () => events.forEach((e) => window.removeEventListener(e, onFirstInteraction));
  }, []);

  return null;
}
