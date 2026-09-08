import { noonesPost } from "./client";
import { isExcludedNoOnesPaymentMethod } from "./exclusions";

/**
 * NoOnes gift-card payment methods.
 *
 * NoOnes is not a rate source — this list only exists so admins can link a card
 * type to the method used when reselling a trade there.
 */
interface NoOnesPaymentMethod {
  name: string;
  slug: string;
  group_slug?: string;
}

function parsePaymentMethodList(raw: unknown): NoOnesPaymentMethod[] {
  if (Array.isArray(raw)) return raw;
  const obj = raw as { methods?: NoOnesPaymentMethod[]; data?: NoOnesPaymentMethod[] };
  return obj.methods ?? obj.data ?? [];
}

export async function listGiftCardPaymentMethods(): Promise<{ name: string; slug: string }[]> {
  const raw = await noonesPost<unknown>("payment-method/list", {});
  const list = parsePaymentMethodList(raw);
  return list
    .filter(
      (m) =>
        m.group_slug === "gift-cards" ||
        /gift.?card|itunes|steam|playstation|xbox|google-play/i.test(m.slug)
    )
    .filter((m) => !isExcludedNoOnesPaymentMethod(m.slug));
}
