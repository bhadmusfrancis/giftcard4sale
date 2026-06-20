"use client";

import { RefObject } from "react";
import { StatusAlert, type ActionStatus } from "@/components/StatusAlert";

/** Status alert anchored for scroll-into-view after async form actions. */
export function FormFeedback({
  status,
  anchorRef,
  className = "",
}: {
  status: ActionStatus | null;
  anchorRef?: RefObject<HTMLDivElement>;
  className?: string;
}) {
  return (
    <div ref={anchorRef} className={className}>
      <StatusAlert status={status} />
    </div>
  );
}
