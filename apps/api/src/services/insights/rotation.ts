import { prisma } from "../../prisma";
import { catalogCardWhere } from "../cardVisibility";

export const DAILY_INSIGHT_COUNT = 7;

export interface CardPick {
  id: string;
  name: string;
  slug: string;
  sellSlug: string;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function getRotationState() {
  return prisma.insightRotationState.upsert({
    where: { id: "default" },
    create: { id: "default", featuredIds: [], cycleNumber: 1 },
    update: {},
  });
}

/** Pick up to 7 active catalog cards not yet featured in the current rotation cycle. */
export async function pickDailyCards(count = DAILY_INSIGHT_COUNT): Promise<{
  cards: CardPick[];
  cycleNumber: number;
  cycleReset: boolean;
}> {
  const allActive = await prisma.cardType.findMany({
    where: catalogCardWhere(),
    select: { id: true, name: true, slug: true, sellSlug: true },
    orderBy: { name: "asc" },
  });

  if (allActive.length === 0) {
    return { cards: [], cycleNumber: 1, cycleReset: false };
  }

  const state = await getRotationState();
  const featured = new Set(state.featuredIds);
  let pool = allActive.filter((c) => !featured.has(c.id));
  let cycleReset = false;

  if (pool.length < Math.min(count, allActive.length)) {
    pool = allActive;
    cycleReset = featured.size > 0;
  }

  const picked = shuffle(pool).slice(0, Math.min(count, pool.length));
  const newFeatured = cycleReset ? picked.map((c) => c.id) : [...state.featuredIds, ...picked.map((c) => c.id)];

  const allRepresented =
    newFeatured.length >= allActive.length &&
    allActive.every((c) => newFeatured.includes(c.id));

  await prisma.insightRotationState.update({
    where: { id: "default" },
    data: {
      featuredIds: allRepresented ? picked.map((c) => c.id) : newFeatured,
      cycleNumber: allRepresented ? state.cycleNumber + 1 : state.cycleNumber,
    },
  });

  return {
    cards: picked,
    cycleNumber: allRepresented ? state.cycleNumber + 1 : state.cycleNumber,
    cycleReset,
  };
}
