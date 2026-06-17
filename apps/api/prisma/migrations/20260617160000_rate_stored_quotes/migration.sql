-- Persist NoOnes quote variants per rate row (physical/ecode × receipt options).
ALTER TABLE "Rate" ADD COLUMN "storedQuotes" JSONB;
