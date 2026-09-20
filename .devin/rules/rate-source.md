---
description: "Gift-card rate source architecture: SafeTheTrade primary, Sogo secondary. Apply when working on rate sync, catalog pricing, Rate rows, or rate source services."
trigger: model_decision
---

# Rate source = SafeTheTrade, then Sogo

Displayed gift-card rates are synced from **SafeTheTrade first**, then Sogo for whatever SafeTheTrade does not price. The orchestrator is `apps/api/src/services/rateSync.ts` (`syncCatalogRates()`); the scheduler is `apps/api/src/services/rateSyncScheduler.ts`.

**NoOnes is gone as a rate source, permanently.** Its rate rows are deleted on boot by `purgeNoOnesRates()`. Do not reintroduce `speed = "NOONES"`, the `reports/`-based partner fallback, or the TOP10_TRADER live-offer path. The NoOnes integration that remains is for trade execution only (`services/noones/` minus rates: client, trades, webhooks, payment-method lookup).

## Primary: SafeTheTrade

`apps/api/src/services/safethetrade` reads the public JSON feed:

- `GET https://safethetrade.com/api/v1/offers?category=gift-cards` — no key or account required. The site itself is a client-rendered SPA with no scrapeable HTML.
- The origin answers **HTTP 451 to some hosting IP ranges** (Render's egress included), so `SAFETHETRADE_PROXY_URL` routes the feed through another egress: a CONNECT proxy (`http://user:pass@host:port`) or a URL relay template (`https://host/?u={url}` — worker at `apps/api/scripts/stt-feed-relay.js`).
- `GET .../payment-methods?category=gift-cards` supplies brand display names (226 brands listed, ~86 with live offers).
- **Only `sell` offers are priced.** An offer's type is stated from its owner's side: a `sell` owner sells crypto and is paid in gift cards, so they are the counterparty that takes a card off our hands and releases crypto. `buy` offers are card holders shopping for crypto — the mirror side, and useless as a resale price. That book is also 30x thinner (≈76 offers against ≈2,300).
- Every brand + currency pair with a live offer is priced, which is what covers the brands Sogo never publishes.
- Offers are reduced with a **median**, never a maximum: the top of that book is consistently bait priced near face value.
- Rates outside **15-80% of face value** are discarded, so a marketplace quote can never commit us to a payout above what the card is worth.
- **SafeTheTrade wins wherever it lists the card** — its median quotes even at or below Sogo's rate. Where Sogo publishes the same card its rate only caps the upside: above `STT_MAX_PREMIUM_PERCENT` (default 20%) over Sogo the SafeTheTrade rate is capped. Sogo's remaining role is the cap reference and filling cards/currencies SafeTheTrade does not price at all.
- Every SafeTheTrade tier needs at least `sttMinOfferOwners` (default 3) **distinct sellers** behind the median to quote — several listings from one trader are one opinion, and one anonymous listing is not a market price. Below the threshold the stored STT row stays `active: false` (or is retired), and where Sogo lists the same tier its row becomes the active rate instead. The threshold is admin-settable on the Rates page (`RateConfig.sttMinOfferOwners`); `STT_MIN_OFFER_OWNERS` only seeds it. `restoreLastKnownRates` never resurrects STT rows — a card whose only rate was a thin book goes inactive.
- A tier's `minDenom`/`maxDenom` is the widest contiguous amount band at least `sttMinOfferOwners` distinct sellers cover (`coveredDenomRange`), never the most extreme single listing — one trader accepting $2–$5 does not make a $5 Amazon tradable. When the book is too disjoint for the full threshold, the requirement relaxes until some band exists.
- A tier the feed still lists but that has thinned below the seller threshold has its existing STT row **retired** (`retireStalePrimaryRate`). Only a tier absent from the feed entirely keeps its last known rate.
- It **may create card types**, under the same offer threshold, but never from aggregate listings ("Any Visa, MasterCard and AmEx", "Gift Cards (Miscellaneous Retailers)", "Target/GameStop/BestBuy Offline") — those are categories, not brands.

## Secondary: Sogo

Until `SOGO_RATES_API_URL` is set to a working JSON API, Sogo rates come from an HTML scrape of https://sogo.africa/rates (`apps/api/src/services/sogo`).

- Sogo runs after SafeTheTrade. For a `card + currency + medium` SafeTheTrade priced, Sogo still writes its row but **retired** (`active: false`) — that row is the resale reference the cap reads, so it must keep being refreshed.
- If SafeTheTrade fails or returns nothing, Sogo refreshes everything — the fallback must not be blocked by the rows a failed primary left behind.
- Ignore Vertical/Horizontal card-orientation splits; persist the **lowest** physical rate for that currency.

## Persist flags

- SafeTheTrade rows: `Rate.speed = "STT"`
- Sogo rows: `Rate.speed = "SOGO"`
- `"PARTNER"` is legacy: existing rows stay quotable, but nothing produces new ones, and they are the only rows the "indicative rate" caveat applies to.
- Manual pasted rates (`SLOW` / `FAST` / null) stay admin-owned and must not be overwritten.
- Priority is `STT` > `SOGO` > `PARTNER` (`weakerRateSources()` in `services/rateSources.ts`).
- Admin **Rate refresh interval (hours)** is the sync cadence and the public "rate may be outdated" window.

## Freshness

- `RateSyncState.lastSuccessAt` records the last **clean** full sync — a run with any `summary.errors` does not advance it, so a failing source stops stamping the whole catalog fresh and "Due for refresh" keeps counting. The admin panel reports such a run as "Completed with errors" (phase `partial`), never "Completed".
- The public "rate may be outdated" notice clears when **either** the card's own rows or the last successful sync is inside the refresh window. A source dropping a card must not leave a warning the site cannot clear by syncing.
- Single-card syncs never update `lastSuccessAt` — they say nothing about the rest of the catalog.

## Never empty the catalog

- A source that fails or returns nothing must leave existing rows untouched — the catalog keeps serving its last known rates.
- Only retire a row when a **stronger** source actually wrote a replacement for the same card/country/medium (or same card/currency, which is what stops one currency showing twice under different country labels).
- `refreshCardCatalogVisibility()` reinstates the newest retired row per country+medium rather than letting a card fall out of the catalog.

## Free-tier budget

Neon Free allows 100 CU-hours/month and scales to zero after 5 minutes idle. Nothing may query Postgres on a shorter cycle than that — notably `/health`, which is liveness-only (`?db=1` for a deep check).

A full sync now writes roughly 350 card + currency tiers, so per-tier round trips dominate its runtime. Keep whole-catalog reads out of the tier loop: Sogo's reference rates load once per run (`loadSogoReference()`), and card visibility is refreshed once per touched card after the loops (`refreshTouchedCards()`), never per rate row.
