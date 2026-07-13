-- First-party website traffic for admin analytics
CREATE TABLE "AnalyticsPageView" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT NOT NULL DEFAULT 'direct',
    "device" TEXT NOT NULL,
    "browser" TEXT,
    "visitorId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsPageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AnalyticsPageView_createdAt_idx" ON "AnalyticsPageView"("createdAt");
CREATE INDEX "AnalyticsPageView_path_createdAt_idx" ON "AnalyticsPageView"("path", "createdAt");
CREATE INDEX "AnalyticsPageView_visitorId_createdAt_idx" ON "AnalyticsPageView"("visitorId", "createdAt");
CREATE INDEX "AnalyticsPageView_referrer_createdAt_idx" ON "AnalyticsPageView"("referrer", "createdAt");
CREATE INDEX "AnalyticsPageView_device_createdAt_idx" ON "AnalyticsPageView"("device", "createdAt");
