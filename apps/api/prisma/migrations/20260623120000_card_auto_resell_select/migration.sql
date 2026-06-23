-- Per-card auto-resell selection (requires global noonesAutoResellEnabled on RateConfig).
ALTER TABLE "CardType" ADD COLUMN "noonesAutoResellEnabled" BOOLEAN NOT NULL DEFAULT true;
