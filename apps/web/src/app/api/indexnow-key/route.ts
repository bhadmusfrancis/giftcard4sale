// Serves the IndexNow verification key at /api/indexnow-key.
// IndexNow pings reference this URL via `keyLocation`, so Bing/Yandex fetch it
// to confirm we own the URLs we submit. The key is not a secret — it is public
// by design; override with INDEXNOW_KEY env if it ever needs rotating.

export const dynamic = "force-dynamic";

const DEFAULT_KEY = "4f2c9d7e1b6a4380a5e7c2d9f1b4e6a8";

export function indexNowKey(): string {
  return (process.env.INDEXNOW_KEY || DEFAULT_KEY).trim();
}

export async function GET() {
  return new Response(indexNowKey(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
