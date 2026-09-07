import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { apiServer } from "@/lib/api";

/**
 * Last-known-good cache for public read endpoints.
 *
 * The catalog and its rates must never render empty just because the API is
 * unreachable, so every successful response is snapshotted and replayed on the
 * next failure. Snapshots live in memory (fast path, per serverless instance)
 * and in the OS temp dir (survives across instances on the same machine).
 */

const SNAPSHOT_DIR = path.join(os.tmpdir(), "gc4s-api-snapshots");

interface StoredSnapshot<T> {
  savedAt: string;
  data: T;
}

export interface SnapshotResult<T> {
  data: T | null;
  /** True when `data` came from a snapshot rather than a live API response. */
  stale: boolean;
  /** When the served snapshot was captured, ISO string. */
  savedAt: string | null;
}

const memory = new Map<string, StoredSnapshot<unknown>>();

function fileFor(key: string): string {
  return path.join(SNAPSHOT_DIR, `${key.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "root"}.json`);
}

async function readSnapshot<T>(key: string): Promise<StoredSnapshot<T> | null> {
  const cached = memory.get(key);
  if (cached) return cached as StoredSnapshot<T>;

  try {
    const raw = await readFile(fileFor(key), "utf8");
    const parsed = JSON.parse(raw) as StoredSnapshot<T>;
    if (!parsed?.data) return null;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function writeSnapshot<T>(key: string, data: T): Promise<void> {
  const entry: StoredSnapshot<T> = { savedAt: new Date().toISOString(), data };
  memory.set(key, entry);
  try {
    await mkdir(SNAPSHOT_DIR, { recursive: true });
    await writeFile(fileFor(key), JSON.stringify(entry));
  } catch {
    // Read-only filesystem: the in-memory copy still covers this instance.
  }
}

interface CachedFetchOptions<T> {
  timeoutMs?: number;
  revalidate?: number;
  /** Rejects responses that would poison the snapshot (e.g. an empty card list). */
  isUsable?: (data: T) => boolean;
  /** Served when neither the API nor a stored snapshot can supply data. */
  fallback?: T;
}

/**
 * Fetch from the API, falling back to the most recent usable response.
 * Never throws — callers get `data: null` only when there is nothing to show.
 */
export async function apiServerCached<T>(
  apiPath: string,
  opts: CachedFetchOptions<T> = {}
): Promise<SnapshotResult<T>> {
  const isUsable = opts.isUsable ?? (() => true);
  const live = await apiServer<T>(apiPath, { timeoutMs: opts.timeoutMs, revalidate: opts.revalidate });

  if (live != null && isUsable(live)) {
    await writeSnapshot(apiPath, live);
    return { data: live, stale: false, savedAt: null };
  }

  const snapshot = await readSnapshot<T>(apiPath);
  if (snapshot && isUsable(snapshot.data)) {
    return { data: snapshot.data, stale: true, savedAt: snapshot.savedAt };
  }

  if (opts.fallback !== undefined) {
    return { data: opts.fallback, stale: true, savedAt: null };
  }

  // Nothing cached and nothing bundled — surface whatever the API gave us.
  return { data: live, stale: live == null, savedAt: null };
}
