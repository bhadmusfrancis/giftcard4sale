import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const all = process.argv.includes("--all");

async function main() {
  const cards = await prisma.cardType.findMany({
    where: all ? undefined : { active: true },
    orderBy: { name: "asc" },
    include: { landingPage: { select: { slug: true } } },
  });
  console.log(
    JSON.stringify(
      cards.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sellSlug: c.sellSlug,
        active: c.active,
        hasLanding: !!c.landingPage,
      })),
      null,
      2
    )
  );
  console.log("Total:", cards.length, all ? "(all)" : "(active only)");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
