import { CardMedium, ReceiptType, StoredQuotes } from "@gc4s/shared";
import { NoOnesOffer, NoOnesOfferTag } from "./types";

/**
 * NoOnes payment methods where receipt uploads are commonly expected for some offers
 * (e.g. Amazon, Walmart). Digital cards like iTunes/Steam usually do not — ignore
 * receipt-required tags on those even if a rare offer asks for one.
 */
const RECEIPT_PRONE_PAYMENT_METHODS = new Set([
  "amazon-gift-card",
  "walmart-gift-card",
  "walmart-visa-gift-card",
  "target-gift-card",
  "target-visa-gift-card",
  "best-buy-gift-card",
  "home-depot-gift-card",
  "lowes-gift-card",
  "macys-gift-card",
  "kohls-store-gift-card",
  "cvs-gift-card",
  "onevanilla-visa-mastercard-gift-card",
  "visa-gift-card",
  "vanilla-gift-card",
  "myvanilla-prepaid-card",
  "sephora-gift-card",
  "nordstrom-gift-card",
  "foot-locker-gift-card",
  "gap-gift-card",
  "old-navy-e-gift-card",
  "dollar-general",
  "costco-cash-card",
  "saks-fifth-avenue-gift-card",
  "nike-gift-card",
  "american-express-gift-card",
]);

/** NoOnes offer tags that indicate a cash purchase receipt. */
const CASH_RECEIPT_TAG_SLUGS = new Set([
  "cash-only",
  "cash-receipt",
  "cash-receipt-only",
]);

/** NoOnes offer tags that indicate a debit/card purchase receipt. */
const DEBIT_RECEIPT_TAG_SLUGS = new Set([
  "debit-receipt",
  "debit-card-receipt",
  "card-receipt",
  "credit-debit-receipt",
  "debit-card",
]);

export function offerTagSlugs(tags: NoOnesOfferTag[] | undefined): string[] {
  return tags?.map((t) => t.slug) ?? [];
}

export function offerHasCashReceiptTag(tags: NoOnesOfferTag[] | undefined): boolean {
  return offerTagSlugs(tags).some((s) => CASH_RECEIPT_TAG_SLUGS.has(s));
}

export function offerHasDebitReceiptTag(tags: NoOnesOfferTag[] | undefined): boolean {
  return offerTagSlugs(tags).some((s) => DEBIT_RECEIPT_TAG_SLUGS.has(s));
}

export function offerRequiresReceiptTag(tags: NoOnesOfferTag[] | undefined): boolean {
  const slugs = offerTagSlugs(tags);
  if (slugs.includes("no-receipt-needed")) return false;
  return slugs.includes("receipt-required");
}

/** Whether a NoOnes offer matches a user's receipt scenario. */
export function offerMatchesReceiptType(offer: Pick<NoOnesOffer, "tags">, receiptType: ReceiptType): boolean {
  const slugs = offerTagSlugs(offer.tags);
  const cashTagged = offerHasCashReceiptTag(offer.tags);
  const debitTagged = offerHasDebitReceiptTag(offer.tags);
  const receiptRequired = offerRequiresReceiptTag(offer.tags);

  if (receiptType === "NONE") {
    if (slugs.includes("no-receipt-needed")) return true;
    if (receiptRequired || cashTagged || debitTagged) return false;
    return true;
  }

  if (receiptType === "CASH") {
    if (slugs.includes("no-receipt-needed")) return false;
    return cashTagged;
  }

  if (receiptType === "DEBIT") {
    if (slugs.includes("no-receipt-needed")) return false;
    if (cashTagged) return false;
    if (debitTagged) return true;
    return receiptRequired;
  }

  return false;
}

export function paymentMethodUsuallyRequiresReceipt(paymentMethod: string): boolean {
  return RECEIPT_PRONE_PAYMENT_METHODS.has(paymentMethod);
}

export function receiptPolicyFromStored(params: {
  paymentMethod: string | null | undefined;
  storedQuotes: StoredQuotes;
  medium?: CardMedium;
}): { askReceipt: boolean; requiresReceipt: boolean } {
  const prone = params.paymentMethod ? paymentMethodUsuallyRequiresReceipt(params.paymentMethod) : false;
  const hasNone = params.storedQuotes.NONE != null;
  const hasReceiptRate = params.storedQuotes.CASH != null || params.storedQuotes.DEBIT != null;

  return {
    askReceipt: prone && hasNone && hasReceiptRate,
    requiresReceipt: prone && !hasNone && hasReceiptRate,
  };
}

/** True only when this card category commonly uses receipts AND the offer is tagged. */
export function resolveRequiresReceipt(
  paymentMethod: string,
  tags: NoOnesOfferTag[] | undefined
): boolean {
  if (!paymentMethodUsuallyRequiresReceipt(paymentMethod)) return false;
  if (!tags?.length) return false;
  const slugs = tags.map((t) => t.slug);
  if (slugs.includes("no-receipt-needed")) return false;
  return slugs.includes("receipt-required");
}
