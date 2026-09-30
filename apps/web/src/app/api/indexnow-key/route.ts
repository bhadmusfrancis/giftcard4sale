// Serves the IndexNow verification key at /api/indexnow-key.
// IndexNow pings reference this URL via `keyLocation`, so Bing/Yandex fetch it
// to confirm we own the URLs we submit.

import { indexNowKey } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";

export async function GET() {
  return new Response(indexNowKey(), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
