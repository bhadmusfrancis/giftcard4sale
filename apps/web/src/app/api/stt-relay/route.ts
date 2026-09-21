// SafeTheTrade rate-feed relay.
// safethetrade.com returns HTTP 451 to Render's egress IPs; this edge route
// fetches the feed through Vercel's network instead. Only safethetrade.com
// /api/v1/* URLs are allowed so this can't be used as an open proxy.

export const runtime = "edge";
export const dynamic = "force-dynamic";
// safethetrade.com 451s some egress regions (Render's iad1 edge included) but
// answers London — pin execution there regardless of where the caller is.
export const preferredRegion = "lhr1";

const ALLOWED_ORIGIN = /^https:\/\/safethetrade\.com\/api\/v1\//;
const RELAY_TOKEN = "fa50b1dd53ef29634984c7e9afd8ded47a3de48548d4e021";

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("token") !== RELAY_TOKEN) {
    return new Response("unauthorized", { status: 401 });
  }

  const target = url.searchParams.get("u") ?? url.searchParams.get("url");
  if (!target || !ALLOWED_ORIGIN.test(target)) {
    return new Response("bad target", { status: 400 });
  }

  const upstream = await fetch(target, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; GiftCard4Sale/1.0; +https://giftcard4sale.com) rates-sync",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
