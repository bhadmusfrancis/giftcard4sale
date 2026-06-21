ALTER TABLE "User" ADD COLUMN "notificationPreferences" JSONB;

ALTER TABLE "Trade" ADD COLUMN "notificationsMuted" BOOLEAN NOT NULL DEFAULT false;
