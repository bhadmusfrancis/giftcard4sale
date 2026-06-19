import { PrismaClient } from "@prisma/client";
import { ALL_GIFT_CARD_PROFILES } from "../src/content/profiles";

const prisma = new PrismaClient();

async function main() {
  const cards = await prisma.cardType.findMany({ orderBy: { slug: "asc" } });
  const missing = cards.filter((c) => !ALL_GIFT_CARD_PROFILES[c.slug]);
  console.log("Total cards:", cards.length);
  console.log("Missing profiles:", missing.length);
  missing.forEach((c) => console.log(`${c.slug}|${c.name}|active=${c.active}`));
}

main().finally(() => prisma.$disconnect());
