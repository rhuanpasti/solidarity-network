-- CreateTable
CREATE TABLE "AuditTrail" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "charityProgramId" TEXT,
    "actorAccountId" TEXT,
    "actorAccountType" TEXT,
    "actorRole" TEXT,
    "requestId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditTrail_action_idx" ON "AuditTrail"("action");

-- CreateIndex
CREATE INDEX "AuditTrail_status_idx" ON "AuditTrail"("status");

-- CreateIndex
CREATE INDEX "AuditTrail_entityType_entityId_idx" ON "AuditTrail"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditTrail_actorAccountId_actorAccountType_idx" ON "AuditTrail"("actorAccountId", "actorAccountType");

-- CreateIndex
CREATE INDEX "AuditTrail_charityProgramId_idx" ON "AuditTrail"("charityProgramId");

-- CreateIndex
CREATE INDEX "AuditTrail_requestId_idx" ON "AuditTrail"("requestId");

-- CreateIndex
CREATE INDEX "AuditTrail_createdAt_idx" ON "AuditTrail"("createdAt");
