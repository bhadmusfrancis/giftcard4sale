import type { Request, Response } from "express";

type HealthDetails = () => Record<string, unknown>;

let details: HealthDetails | null = null;

export function setHealthDetails(fn: HealthDetails): void {
  details = fn;
}

/** Lightweight until full API routes are mounted. */
export function healthHandler(_req: Request, res: Response): void {
  res.json({
    ok: true,
    service: "gc4s-api",
    ...(details ? details() : {}),
  });
}
