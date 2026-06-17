import { Prisma } from "@prisma/client";
import { RateEntry, canonicalCardSlug, normalizeCardTypeName, sellSlug } from "@gc4s/shared";
import { prisma } from "../prisma";

export interface ImportSummary {
  cardTypes: number;
  rates: number;
  details: { cardType: string; rates: number }[];
}

/**
 * Upsert card types and their rate rows from parsed entries.
 * When replaceExisting is true, a card type's existing rates are cleared first.
 */
export async function importRates(entries: RateEntry[], replaceExisting = false): Promise<ImportSummary> {
  const byType = new Map<string, RateEntry[]>();
  for (const e of entries) {
    const list = byType.get(e.cardType) ?? [];
    list.push(e);
    byType.set(e.cardType, list);
  }

  const details: { cardType: string; rates: number }[] = [];
  let totalRates = 0;

  for (const [typeName, list] of byType) {
    const name = normalizeCardTypeName(typeName);
    const slug = canonicalCardSlug(name);
    const card = await prisma.cardType.upsert({
      where: { slug },
      update: { name },
      create: { name, slug, sellSlug: sellSlug(name) },
    });

    if (replaceExisting) {
      await prisma.rate.deleteMany({ where: { cardTypeId: card.id } });
    }

    for (const e of list) {
      const existing = replaceExisting
        ? null
        : await prisma.rate.findFirst({
            where: {
              cardTypeId: card.id,
              country: e.country,
              medium: e.medium,
              minDenom: e.minDenom,
              maxDenom: e.maxDenom,
            },
          });

      if (existing) {
        await prisma.rate.update({
          where: { id: existing.id },
          data: {
            nairaPerUnit: new Prisma.Decimal(e.nairaPerUnit),
            currency: e.currency,
            speed: e.speed,
            active: true,
          },
        });
      } else {
        await prisma.rate.create({
          data: {
            cardTypeId: card.id,
            country: e.country,
            currency: e.currency,
            minDenom: e.minDenom ?? null,
            maxDenom: e.maxDenom ?? null,
            medium: e.medium,
            nairaPerUnit: new Prisma.Decimal(e.nairaPerUnit),
            speed: e.speed,
          },
        });
      }
      totalRates++;
    }
    details.push({ cardType: typeName, rates: list.length });
  }

  return { cardTypes: byType.size, rates: totalRates, details };
}
