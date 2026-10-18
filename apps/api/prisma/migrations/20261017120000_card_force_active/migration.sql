-- Admin override: keep a card in the public catalog even when it has no active rate.
ALTER TABLE "CardType" ADD COLUMN "forceActive" BOOLEAN NOT NULL DEFAULT false;
