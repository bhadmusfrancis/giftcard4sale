import { prisma } from "../prisma";

/**
 * When the catalog last finished a rate sync.
 *
 * Rate freshness is judged against this as well as each row's own `updatedAt`:
 * a source that stops listing a card leaves that card's rows untouched, and the
 * public "rate may be outdated" notice should not fire while syncs are healthy.
 */
const SINGLETON_ID = "singleton";
const CACHE_TTL_MS = 60_000;

let cached: { lastSuccessAt: Date | null; readAt: number } | null = null;

/** Cached so a card page never adds a database round trip per request. */
export async function getLastRateSyncAt(): Promise<Date | null> {
  if (cached && Date.now() - cached.readAt < CACHE_TTL_MS) return cached.lastSuccessAt;

  try {
    const row = await prisma.rateSyncState.findUnique({ where: { id: SINGLETON_ID } });
    cached = { lastSuccessAt: row?.lastSuccessAt ?? null, readAt: Date.now() };
  } catch (err) {
    console.warn("Rate sync state read:", (err as Error).message);
    cached = { lastSuccessAt: cached?.lastSuccessAt ?? null, readAt: Date.now() };
  }

  return cached.lastSuccessAt;
}

async function write(data: { lastAttemptAt?: Date; lastSuccessAt?: Date; lastSources?: string }) {
  try {
    await prisma.rateSyncState.upsert({
      where: { id: SINGLETON_ID },
      update: data,
      create: { id: SINGLETON_ID, ...data },
    });
    cached = null;
  } catch (err) {
    console.warn("Rate sync state write:", (err as Error).message);
  }
}

export async function recordRateSyncAttempt(): Promise<void> {
  await write({ lastAttemptAt: new Date() });
}

/** Only called once a run has actually written rate rows. */
export async function recordRateSyncSuccess(sources: string[]): Promise<void> {
  const now = new Date();
  await write({ lastAttemptAt: now, lastSuccessAt: now, lastSources: sources.join(",") });
}
