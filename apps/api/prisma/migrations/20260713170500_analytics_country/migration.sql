-- Add visitor country (ISO 3166-1 alpha-2) to analytics page views
ALTER TABLE "AnalyticsPageView" ADD COLUMN "country" TEXT;

CREATE INDEX "AnalyticsPageView_country_createdAt_idx" ON "AnalyticsPageView"("country", "createdAt");
