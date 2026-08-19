-- DropForeignKey
ALTER TABLE "Beneficiary" DROP CONSTRAINT "Beneficiary_charityProgramId_fkey";

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_charityProgramId_fkey" FOREIGN KEY ("charityProgramId") REFERENCES "CharityProgram"("id") ON DELETE SET NULL ON UPDATE CASCADE;
