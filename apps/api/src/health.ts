import type { Request, Response } from "express";
import { prisma } from "./prisma";

type HealthDetails = () => Record<string, unknown>;

let details: HealthDetails | null = null;

export function setHealthDetails(fn: HealthDetails): void {
  details = fn;
}

/** Lightweight until full API routes are mounted. */
export async function healthHandler(_req: Request, res: Response): Promise<void> {
  let db: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    db = "error";
  }

  res.json({
    ok: db === "ok",
    service: "gc4s-api",
    db,
    ...(details ? details() : {}),
  });
}
