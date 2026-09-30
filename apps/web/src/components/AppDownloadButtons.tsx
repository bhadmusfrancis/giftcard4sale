"use client";

import { useEffect, useRef, useState } from "react";

// PWA install UI. Android/desktop Chrome fires `beforeinstallprompt`; iOS
// Safari has no programmatic install, so we show Share → Add to Home Screen
// steps instead. The service worker is registered here (and PushButton also
// registers it lazily) because an active SW is required before the install
// prompt is offered at all.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function inStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function AppDownloadButtons() {
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (inStandaloneMode()) {
      setInstalled(true);
      return;
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function installAndroid() {
    const evt = deferredPrompt.current;
    if (!evt) {
      setShowIosHelp(true);
      return;
    }
    await evt.prompt();
    const { outcome } = await evt.userChoice;
    if (outcome === "accepted") {
      deferredPrompt.current = null;
      setCanPrompt(false);
    }
  }

  const ios = isIos();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={installAndroid}
          className="btn flex items-center gap-2 bg-white text-brand-800 hover:bg-brand-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.66-.38l-1.86 3.22a11.6 11.6 0 0 0-9.84 0L5.22 5.92a.38.38 0 0 0-.66.38L6.4 9.48A10.8 10.8 0 0 0 1 18h22a10.8 10.8 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
          </svg>
          Android app
        </button>
        <button
          type="button"
          onClick={() => (ios ? setShowIosHelp((v) => !v) : installAndroid())}
          className="btn flex items-center gap-2 bg-white text-brand-800 hover:bg-brand-50"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.82 3.57-.72 1.21.1 2.12.57 2.72 1.47-2.5 1.5-2.08 4.8.42 5.72-.51 1.34-1.17 2.67-1.79 3.7zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          iOS app
        </button>
      </div>
      {showIosHelp && (
        <div className="max-w-md rounded-lg bg-white/10 px-4 py-3 text-left text-sm text-brand-50">
          {ios ? (
            <p>
              In Safari: tap the <span className="font-semibold">Share</span> button, then{" "}
              <span className="font-semibold">Add to Home Screen</span> to install the app.
            </p>
          ) : (
            <p>
              Your browser doesn&apos;t offer one-tap install. Open this site in Chrome or Safari and use the
              browser menu → <span className="font-semibold">Add to Home Screen / Install app</span>.
            </p>
          )}
        </div>
      )}
      {!canPrompt && !showIosHelp && (
        <p className="text-xs text-brand-100/80">Free app — installable directly from your browser.</p>
      )}
    </div>
  );
}
