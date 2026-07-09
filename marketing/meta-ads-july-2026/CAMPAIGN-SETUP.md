# GiftCard4Sale Meta Ads — July 2026 Setup Checklist

Enumerated from the campaign plan. Work top to bottom.

---

## 0. Prerequisites (do before Create)

| # | Item | Status |
|---|------|--------|
| 0.1 | Meta Business Manager | ☐ |
| 0.2 | Facebook Page (GiftCard4Sale) | ☐ |
| 0.3 | Instagram connected to Page | ☐ |
| 0.4 | Meta Pixel on giftcard4sale.com | ✅ Installed — Pixel `2231976064046353` in site `<head>` |
| 0.5 | Conversion API (recommended) | ✅ Code ready — set `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN` on Render |
| 0.6 | Domain verified | ☐ |
| 0.7 | Events: ViewContent, CompleteRegistration, Lead, Purchase/TradeCompleted | ✅ Wired in code |

If Pixel/events are wrong, fix that before spending.

---

## 1. Campaign

| Field | Value |
|-------|--------|
| Objective | **Sales** |
| Name | `GiftCard4Sale Sales July 2026` |
| Advantage Campaign Budget | **ON** |
| Daily budget | **₦25,000/day** (or **$20/day**) |
| Special Ad Category | None |

---

## 2. Conversion settings (shared)

| Field | Value |
|-------|--------|
| Conversion location | Website |
| Website URL | `https://giftcard4sale.com` |
| Pixel | Your Meta Pixel |
| Conversion event (pick deepest reliable) | 1) TradeCompleted → 2) Purchase → 3) InitiateCheckout → 4) CompleteRegistration |

---

## 3. Ad sets (3)

### 3.1 Ad Set 1 — Broad

| Field | Value |
|-------|--------|
| Name | `Nigeria Broad` |
| Location | Nigeria |
| Age | 18–45 |
| Gender | All |
| Languages | English |
| Audience | Advantage+ Audience |
| Placements | Advantage+ Placements |
| Optimization | Conversions |

### 3.2 Ad Set 2 — Interest

| Field | Value |
|-------|--------|
| Name | `Nigeria Interest` |
| Location | Nigeria |
| Age | 18–40 |
| Interests (handful only) | Cryptocurrency, Binance, USDT, Steam, Apple, Amazon, Xbox, PlayStation, Google Play, Gaming |
| Exclude | People who already completed a trade |
| Optimization | Conversions |

### 3.3 Ad Set 3 — Ghana

| Field | Value |
|-------|--------|
| Name | `Ghana Broad` |
| Location | Ghana |
| Age | 18–45 |
| Language | English |
| Optimization | Conversions |

---

## 4. Ad identity & copy (all ads)

| Field | Value |
|-------|--------|
| Facebook Page | GiftCard4Sale |
| Instagram | GiftCard4Sale |
| Primary text | See below |
| Headline | `Sell Gift Cards & Get Paid Fast` |
| Description | `Fast • Secure • Trusted` |
| CTA | Learn More **or** Sign Up |
| Destination URL | `https://giftcard4sale.com?utm_source=facebook&utm_medium=paid&utm_campaign=july2026` |
| Tracking | Pixel + UTM above |

### Primary text

```
Turn your unused gift cards into cash in minutes.

Sell Apple, Amazon, Steam, Google Play, Xbox, Razer Gold and more.

✔ Competitive rates
✔ Fast payouts
✔ Secure platform
✔ USDT, Naira & Ghana Cedi

Open your trade today.
```

---

## 5. Creatives to upload (from split sheet)

Folder: `marketing/meta-ads-july-2026/`

Upload **one creative per ad**. Start with these 4 feed ads across all 3 ad sets (or duplicate ads into each set):

| Ad # | Message angle | File (feed) |
|------|----------------|-------------|
| Ad 1 | Sell / paid in minutes | `01-static-feed/01-sell-get-paid-in-minutes-1200x628.png` |
| Ad 2 | Turn cards into cash | `01-static-feed/02-turn-gift-cards-into-cash-1200x628.png` |
| Ad 3 | Why choose us | `01-static-feed/03-why-choose-giftcard4sale-1200x628.png` |
| Ad 4 | Wallet / don’t waste cards | `01-static-feed/04-dont-let-cards-go-to-waste-1200x628.png` |

Optional square variants: same names with `-1080x1080.png`.

### Stories / Reels (1080×1920)

| # | File |
|---|------|
| 1 | `02-stories-reels/01-sell-get-paid-fast-1080x1920.png` |
| 2 | `02-stories-reels/02-easy-3-simple-steps-1080x1920.png` |
| 3 | `02-stories-reels/03-paid-in-minutes-1080x1920.png` |
| 4 | `02-stories-reels/04-trusted-by-thousands-1080x1920.png` |
| 5 | `02-stories-reels/05-we-buy-all-major-cards-1080x1920.png` |

### Carousel (1080×1080) — one carousel ad, 5 cards

| Card | File |
|------|------|
| 1 | `03-carousel/01-sell-for-cash-in-minutes-1080x1080.png` |
| 2 | `03-carousel/02-choose-from-100-plus-1080x1080.png` |
| 3 | `03-carousel/03-best-rates-always-1080x1080.png` |
| 4 | `03-carousel/04-fast-secure-reliable-1080x1080.png` |
| 5 | `03-carousel/05-paid-usdt-naira-cedi-1080x1080.png` |

### Video thumbnails (1280×720) — when you have video

| # | File |
|---|------|
| 1 | `04-video-thumbnails/01-sell-get-paid-in-5-minutes-1280x720.png` |
| 2 | `04-video-thumbnails/02-how-to-sell-on-giftcard4sale-1280x720.png` |
| 3 | `04-video-thumbnails/03-best-rates-fast-secure-1280x720.png` |

---

## 6. Publish & learning

1. Publish campaign.
2. **Do not edit for 3–5 days** unless something is clearly broken.
3. After ~7 days, add a **retargeting** Sales campaign:
   - Website visitors (30 days)
   - Video viewers (50%+)
   - Page/IG engagers
   - Exclude completed trades
   - Message: *Still holding unused gift cards? Sell today — USDT, Naira, or Cedi.*

---

## 7. Budget scaling

| Week | Action |
|------|--------|
| 1 | ₦25,000/day |
| 2 | +20% if CPA is acceptable |
| 3 | Duplicate best ad set; test new creatives (don’t heavy-edit the winner) |

---

## Quality note on creatives

The source sheet is **1024×682**. Exports are upscaled to Meta sizes and will look soft. For production spend, re-export each panel from the original design file (Figma/Canva/PSD) at native resolution, then replace the files in this folder.
