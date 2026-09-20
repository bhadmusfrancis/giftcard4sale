/**
 * SafeTheTrade rate-feed relay for Cloudflare Workers.
 *
 * The feed's origin returns HTTP 451 to some hosting IP ranges (e.g. Render's
 * egress IPs). This Worker fetches it from Cloudflare's network instead.
 *
 * Deploy:
 *   1. `npx wrangler deploy scripts/stt-feed-relay.js --name stt-feed-relay`
 *      (or paste this file into a new Worker at https://workers.cloudflare.com)
 *   2. Point the API at it:
 *        SAFETHETRADE_PROXY_URL="https://stt-feed-relay.<account>.workers.dev/?u={url}"
 *
 * If safethetrade.com also refuses Cloudflare IPs, run the same logic on any
 * host whose egress the site allows — the contract is just `?u=<encoded url>`.
 * Add RELAY_TOKEN on the Worker and pass it as `&token=` in the template URL
 * to keep the relay from being an open proxy.
 */

const ALLOWED_ORIGIN = /^https:\/\/safethetrade\.com\/api\/v1\//;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = url.searchParams.get("u") ?? url.searchParams.get("url");

    if (env.RELAY_TOKEN && url.searchParams.get("token") !== env.RELAY_TOKEN) {
      return new Response("unauthorized", { status: 401 });
    }
    if (!target || !ALLOWED_ORIGIN.test(target)) {
      return new Response("bad target", { status: 400 });
    }

    const upstream = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; GiftCard4Sale/1.0; +https://giftcard4sale.com) rates-sync",
        Accept: "application/json",
      },
      cf: { cacheTtl: 60 },
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: { "Content-Type": "application/json; charset=utf-8" },
    });
  },
};
