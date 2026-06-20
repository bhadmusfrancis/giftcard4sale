/** Re-publish SEO landing pages for all card types (no content regeneration). */
import { PrismaClient } from "@prisma/client";
import { ensureCardSeoLandingPagesPublished } from "../src/services/cardVisibility";

const prisma = new PrismaClient();

async function main() {
  const republished = await ensureCardSeoLandingPagesPublished();
  const [total, published] = await Promise.all([
    prisma.landingPage.count(),
    prisma.landingPage.count({ where: { published: true } }),
  ]);
  console.log({ republished, total, published, unpublished: total - published });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
