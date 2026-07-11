import Script from "next/script";
import { GOOGLE_ADS_ID } from "@/lib/googleAds";

/**
 * Google tag (gtag.js) for Google Ads — event-based conversions.
 * Set NEXT_PUBLIC_GOOGLE_ADS_ID=AW-XXXXXXXXX on Vercel.
 */
export function GoogleAdsTag() {
  if (!GOOGLE_ADS_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-gtag" strategy="afterInteractive">{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');
`}</Script>
    </>
  );
}
