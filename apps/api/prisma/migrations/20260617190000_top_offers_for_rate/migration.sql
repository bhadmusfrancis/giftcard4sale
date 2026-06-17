-- How many top NoOnes offers (by completed trades) to average into a stored rate.
ALTER TABLE "RateConfig" ADD COLUMN "noonesTopOffersForRate" INTEGER NOT NULL DEFAULT 3;
