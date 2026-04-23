-- CreateTable
CREATE TABLE "EntityVersion" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "charityProgramId" TEXT,
    "actorAccountId" TEXT,
    "actorAccountType" TEXT,
    "actorRole" TEXT,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "snapshot" JSONB NOT NULL,
    "diff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EntityVersion_entityType_entityId_version_key" ON "EntityVersion"("entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "EntityVersion_entityType_entityId_createdAt_idx" ON "EntityVersion"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "EntityVersion_entityType_entityId_version_idx" ON "EntityVersion"("entityType", "entityId", "version");

-- CreateIndex
CREATE INDEX "EntityVersion_charityProgramId_idx" ON "EntityVersion"("charityProgramId");

-- CreateIndex
CREATE INDEX "EntityVersion_createdAt_idx" ON "EntityVersion"("createdAt");
