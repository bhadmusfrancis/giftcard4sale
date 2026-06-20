"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionStatus } from "@/components/StatusAlert";

export function useAsyncAction(opts?: { successAutoDismissMs?: number; scrollOnStatus?: boolean }) {
  const dismissMs = opts?.successAutoDismissMs ?? 8000;
  const scrollOnStatus = opts?.scrollOnStatus !== false;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ActionStatus | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const busyRef = useRef(false);
  const statusRef = useRef<HTMLDivElement>(null);

  const clearStatus = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus(null);
  }, []);

  const run = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      successMessage?: string | ((result: T) => string)
    ): Promise<T | null> => {
      if (busyRef.current) return null;

      if (timerRef.current) clearTimeout(timerRef.current);
      busyRef.current = true;
      setBusy(true);
      setStatus(null);
      try {
        const result = await fn();
        const message =
          typeof successMessage === "function"
            ? successMessage(result)
            : successMessage ?? "Saved successfully.";
        setStatus({ message, ok: true });
        timerRef.current = setTimeout(() => setStatus(null), dismissMs);
        return result;
      } catch (err) {
        setStatus({
          message: (err as Error).message || "Something went wrong.",
          ok: false,
        });
        return null;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [dismissMs]
  );

  useEffect(() => {
    if (!status || !scrollOnStatus || !statusRef.current) return;
    statusRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [status, scrollOnStatus]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { busy, status, run, clearStatus, setStatus, statusRef };
}
