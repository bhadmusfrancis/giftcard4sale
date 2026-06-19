import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.landingPage.findMany({
    select: { slug: true, title: true, metaDesc: true, bodyHtml: true, cardTypeId: true },
  });
  const stats = pages.map((p) => {
    const words = p.bodyHtml.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
    return { slug: p.slug, words, linked: !!p.cardTypeId };
  });
  const min = Math.min(...stats.map((s) => s.words));
  const max = Math.max(...stats.map((s) => s.words));
  const avg = Math.round(stats.reduce((a, s) => a + s.words, 0) / stats.length);
  console.log(JSON.stringify({ count: pages.length, minWords: min, maxWords: max, avgWords: avg, sample: stats.slice(0, 3) }, null, 2));
}

main().finally(() => prisma.$disconnect());
