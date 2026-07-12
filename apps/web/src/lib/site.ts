/**
 * Public support contact. Prefer linking to /contact instead of rendering this
 * address as visible text (avoids scraping admin/support inboxes).
 */
export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@giftcard4sale.com";
