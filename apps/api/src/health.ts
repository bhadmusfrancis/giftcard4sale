import type { Request, Response } from "express";
import { prisma } from "./prisma";

type HealthDetails = () => Record<string, unknown>;

let details: HealthDetails | null = null;

export function setHealthDetails(fn: HealthDetails): void {
  details = fn;
}

/**
 * Liveness only by default. The platform health check runs constantly, so
 * querying Postgres here would stop the database from ever idling — which on
 * Neon's free plan burns the monthly compute allowance. Pass `?db=1` for a deep
 * check that also verifies the database connection.
 */
export async function healthHandler(req: Request, res: Response): Promise<void> {
  const checkDb = req.query.db === "1" || req.query.db === "true";

  let db: "ok" | "error" | "unchecked" = "unchecked";
  if (checkDb) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      db = "ok";
    } catch {
      db = "error";
    }
  }

  res.json({
    ok: db !== "error",
    service: "gc4s-api",
    db,
    ...(details ? details() : {}),
  });
}
