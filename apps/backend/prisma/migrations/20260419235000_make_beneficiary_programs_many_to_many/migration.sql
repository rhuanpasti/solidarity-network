-- CreateTable
CREATE TABLE "BeneficiaryProgramLink" (
    "beneficiaryId" TEXT NOT NULL,
    "charityProgramId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BeneficiaryProgramLink_pkey" PRIMARY KEY ("beneficiaryId","charityProgramId")
);

-- Migrate existing beneficiary-program assignments
INSERT INTO "BeneficiaryProgramLink" ("beneficiaryId", "charityProgramId")
SELECT "id", "charityProgramId"
FROM "Beneficiary"
WHERE "charityProgramId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "BeneficiaryProgramLink_charityProgramId_idx" ON "BeneficiaryProgramLink"("charityProgramId");

-- AddForeignKey
ALTER TABLE "BeneficiaryProgramLink"
ADD CONSTRAINT "BeneficiaryProgramLink_beneficiaryId_fkey"
FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeneficiaryProgramLink"
ADD CONSTRAINT "BeneficiaryProgramLink_charityProgramId_fkey"
FOREIGN KEY ("charityProgramId") REFERENCES "CharityProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Beneficiary" DROP CONSTRAINT "Beneficiary_charityProgramId_fkey";

-- DropIndex
DROP INDEX "Beneficiary_charityProgramId_idx";

-- AlterTable
ALTER TABLE "Beneficiary" DROP COLUMN "charityProgramId";
