"use client";

export interface ActionStatus {
  message: string;
  ok: boolean;
}

export function StatusAlert({
  status,
  className = "",
}: {
  status: ActionStatus | null;
  className?: string;
}) {
  if (!status) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${
        status.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-red-200 bg-red-50 text-red-900"
      } ${className}`}
    >
      {status.ok ? "✓ " : "✕ "}
      {status.message}
    </div>
  );
}
