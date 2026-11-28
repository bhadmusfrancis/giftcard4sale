/**
 * Announce the new gift-card collection to every active user (verified email,
 * not suspended or banned) via in-app + push notifications.
 *
 * Usage:
 *   npm run broadcast:new-cards
 *   npx tsx --import ./scripts/cli-preload.ts scripts/broadcast-new-cards.ts
 */
import "dotenv/config";
import { prisma } from "../src/prisma";
import { broadcastToActiveUsers, countBroadcastAudience } from "../src/services/notify";

const TITLE = "New gift cards just landed 🎁";
const BODY =
  "A fresh collection of tradeable gift cards is live with some of our best rates yet — " +
  "top payouts on the brands everyone wants. Browse the new arrivals and lock in today's " +
  "rate before it moves!";
const LINK = "/cards";

async function main() {
  const audience = await countBroadcastAudience();
  console.log(`Broadcasting "${TITLE}" to ${audience} active user(s)…`);

  const { recipients } = await broadcastToActiveUsers({
    title: TITLE,
    body: BODY,
    link: LINK,
    email: false,
  });

  console.log(`Done — in-app + push announcement queued for ${recipients} active user(s).`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect();
  process.exit(1);
});
