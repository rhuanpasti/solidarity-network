-- CreateEnum
CREATE TYPE "BeneficiaryDependentRelationship" AS ENUM ('child', 'grandchild', 'other');

-- CreateTable
CREATE TABLE "BeneficiaryDependent" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "relationship" "BeneficiaryDependentRelationship" NOT NULL,
    "document" TEXT,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeneficiaryDependent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BeneficiaryDependent_beneficiaryId_idx" ON "BeneficiaryDependent"("beneficiaryId");

-- AddForeignKey
ALTER TABLE "BeneficiaryDependent"
ADD CONSTRAINT "BeneficiaryDependent_beneficiaryId_fkey"
FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
