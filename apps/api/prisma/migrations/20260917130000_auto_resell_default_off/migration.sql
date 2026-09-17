-- AlterTable: auto-resell defaults to off. New RateConfig rows and fresh
-- installs stay manual until an admin opts in on the Rates page.
ALTER TABLE "RateConfig" ALTER COLUMN "noonesAutoResellEnabled" SET DEFAULT false;

-- Turn it off for existing config rows too, so live environments stop
-- auto-opening NoOnes trades until an admin re-enables it.
UPDATE "RateConfig" SET "noonesAutoResellEnabled" = false;
