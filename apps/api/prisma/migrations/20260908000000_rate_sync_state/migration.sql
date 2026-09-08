-- Persisted rate-sync completion so rate freshness survives API restarts
CREATE TABLE "RateSyncState" (
    "id" TEXT NOT NULL,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastSources" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateSyncState_pkey" PRIMARY KEY ("id")
);
