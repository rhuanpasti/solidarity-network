-- AlterTable
ALTER TABLE "AuditTrail"
ADD COLUMN     "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "previousValues" JSONB,
ADD COLUMN     "newValues" JSONB;
