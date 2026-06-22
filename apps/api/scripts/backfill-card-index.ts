/**
 * One-time backfill: index gift-card codes and image fingerprints from existing trades.
 * Run: npx tsx scripts/backfill-card-index.ts
 */
import { prisma } from "../src/prisma";
import {
  hashGiftCardCode,
  parsePastedCodes,
  codeLast4,
} from "../src/services/cardFingerprint";

const ACTIVE = ["PENDING", "PROCESSING", "INFO_REQUESTED", "APPROVED", "REJECTED", "PAID"];

async function main() {
  const trades = await prisma.trade.findMany({
    where: { status: { in: ACTIVE } },
    select: { id: true, ecodes: true, submittedCodes: { select: { id: true } } },
  });

  let codesAdded = 0;
  for (const trade of trades) {
    if (trade.submittedCodes.length > 0) continue;
    const norms = parsePastedCodes(trade.ecodes);
    if (!norms.length) continue;

    await prisma.submittedCardCode.createMany({
      data: norms.map((norm) => ({
        tradeId: trade.id,
        codeHash: hashGiftCardCode(norm),
        codeLast4: codeLast4(norm),
        source: "PASTED",
      })),
      skipDuplicates: true,
    });
    codesAdded += norms.length;
  }

  console.log(`Backfill complete. Indexed ${codesAdded} code(s) across ${trades.length} trade(s).`);
  console.log(
    "Note: image fingerprints for older uploads are only captured on new submissions (requires original file bytes)."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
