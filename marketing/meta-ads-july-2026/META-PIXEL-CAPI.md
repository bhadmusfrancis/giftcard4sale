# Meta Pixel + Conversion API

## Pixel installed

**Pixel ID:** `2231976064046353`

The Meta base code (`fbq('init')` + `PageView`) is in the site `<head>` on every page via `apps/web/src/components/MetaPixel.tsx`.

After you **deploy the web app to Vercel**, return to Events Manager and click continue / refresh — Meta should detect activity within a few minutes. You can also verify with the [Meta Pixel Helper](https://chrome.google.com/webstore/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) on https://giftcard4sale.com.

## Conversion API (still needs token)

| Where | Variable | Status |
|-------|----------|--------|
| Vercel (optional override) | `NEXT_PUBLIC_META_PIXEL_ID` | Defaulted in code to `2231976064046353` |
| Render | `META_PIXEL_ID` | Defaulted / set in API `.env` |
| Render | `META_CAPI_ACCESS_TOKEN` | **Still empty** — generate in Events Manager → Settings → Generate access token |
| Render | `META_CAPI_TEST_EVENT_CODE` | Optional for Test Events |

## Events wired

| Event | Browser | Server (CAPI) |
|-------|---------|---------------|
| PageView | ✅ | — |
| ViewContent | ✅ | — |
| InitiateCheckout | ✅ | — |
| CompleteRegistration | ✅ | ✅ |
| Lead | ✅ | ✅ |
| Purchase / TradeCompleted | — | ✅ (when trade is PAID) |
