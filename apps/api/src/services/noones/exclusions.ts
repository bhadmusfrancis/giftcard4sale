import { Prisma } from "@prisma/client";

/** NoOnes payment-method slugs we never import, sync, or re-create. */
export const EXCLUDED_NOONES_PAYMENT_METHODS = ["gift-cards-miscellaneous-retailers"] as const;

const excludedSet = new Set<string>(EXCLUDED_NOONES_PAYMENT_METHODS);

export function isExcludedNoOnesPaymentMethod(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return excludedSet.has(slug.toLowerCase());
}

/** Prisma filter for card types that participate in NoOnes sync. */
export function noonesLinkedCardWhere(): Prisma.CardTypeWhereInput {
  return {
    noonesPaymentMethod: {
      not: null,
      notIn: [...EXCLUDED_NOONES_PAYMENT_METHODS],
    },
  };
}
