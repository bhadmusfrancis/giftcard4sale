import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/prisma";
import { catalogCardWhere } from "../src/services/cardVisibility";

const OUT = path.resolve(__dirname, "../../web/src/data/catalog-fallback.json");

async function main() {
  const cards = await prisma.cardType.findMany({
    where: catalogCardWhere(),
    orderBy: [{ offerCount: "desc" }, { tradeVolume: "desc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, sellSlug: true, imageUrl: true, description: true },
  });

  if (!cards.length) throw new Error("Catalog query returned no cards — refusing to overwrite the fallback");

  const payload = {
    generatedAt: new Date().toISOString(),
    cards: cards.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      sellSlug: c.sellSlug,
      ...(c.imageUrl ? { imageUrl: c.imageUrl } : {}),
      ...(c.description ? { description: c.description } : {}),
    })),
  };

  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${payload.cards.length} cards to ${OUT}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
