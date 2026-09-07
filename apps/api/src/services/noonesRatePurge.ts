import { prisma } from "../prisma";
import { refreshCardCatalogVisibility } from "./cardVisibility";

/** Retired rate source. Rows are deleted, never revived. */
const NOONES_RATE_SPEED = "NOONES";

/**
 * Delete every rate row that came from NoOnes.
 *
 * NoOnes is gone as a rate source, so its rows are removed rather than left to
 * quote prices no one stands behind. Affected cards are re-evaluated afterwards
 * so any that still have rates from another source stay in the catalog.
 */
export async function purgeNoOnesRates(): Promise<{ deleted: number; cardsAffected: number }> {
  const affected = await prisma.rate.findMany({
    where: { speed: NOONES_RATE_SPEED },
    select: { cardTypeId: true },
    distinct: ["cardTypeId"],
  });
  if (!affected.length) return { deleted: 0, cardsAffected: 0 };

  const { count } = await prisma.rate.deleteMany({ where: { speed: NOONES_RATE_SPEED } });

  for (const { cardTypeId } of affected) {
    await refreshCardCatalogVisibility(cardTypeId);
  }

  return { deleted: count, cardsAffected: affected.length };
}
