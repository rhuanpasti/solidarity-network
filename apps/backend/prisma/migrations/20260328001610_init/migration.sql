-- CreateEnum
CREATE TYPE "CharityProgramStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "AdministratorRole" AS ENUM ('super_admin', 'program_manager', 'case_worker');

-- CreateEnum
CREATE TYPE "BeneficiaryStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "BenefitCategory" AS ENUM ('food', 'hygiene', 'financial', 'education', 'clothing', 'medicine', 'other');

-- CreateTable
CREATE TABLE "CharityProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "CharityProgramStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharityProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "AdministratorRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdministratorProgramLink" (
    "administratorId" TEXT NOT NULL,
    "charityProgramId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdministratorProgramLink_pkey" PRIMARY KEY ("administratorId","charityProgramId")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "phone" TEXT NOT NULL,
    "address" JSONB NOT NULL,
    "notes" TEXT,
    "charityProgramId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "BeneficiaryStatus" NOT NULL DEFAULT 'active',

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Benefit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "BenefitCategory" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenefitDelivery" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "benefitId" TEXT NOT NULL,
    "charityProgramId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "administratorId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenefitDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Administrator_email_key" ON "Administrator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Beneficiary_document_key" ON "Beneficiary"("document");

-- CreateIndex
CREATE INDEX "Beneficiary_charityProgramId_idx" ON "Beneficiary"("charityProgramId");

-- CreateIndex
CREATE INDEX "Beneficiary_status_idx" ON "Beneficiary"("status");

-- CreateIndex
CREATE INDEX "Beneficiary_fullName_idx" ON "Beneficiary"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "BenefitDelivery_reference_key" ON "BenefitDelivery"("reference");

-- CreateIndex
CREATE INDEX "BenefitDelivery_beneficiaryId_idx" ON "BenefitDelivery"("beneficiaryId");

-- CreateIndex
CREATE INDEX "BenefitDelivery_charityProgramId_idx" ON "BenefitDelivery"("charityProgramId");

-- CreateIndex
CREATE INDEX "BenefitDelivery_deliveryDate_idx" ON "BenefitDelivery"("deliveryDate");

-- AddForeignKey
ALTER TABLE "AdministratorProgramLink" ADD CONSTRAINT "AdministratorProgramLink_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "Administrator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdministratorProgramLink" ADD CONSTRAINT "AdministratorProgramLink_charityProgramId_fkey" FOREIGN KEY ("charityProgramId") REFERENCES "CharityProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_charityProgramId_fkey" FOREIGN KEY ("charityProgramId") REFERENCES "CharityProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitDelivery" ADD CONSTRAINT "BenefitDelivery_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitDelivery" ADD CONSTRAINT "BenefitDelivery_benefitId_fkey" FOREIGN KEY ("benefitId") REFERENCES "Benefit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitDelivery" ADD CONSTRAINT "BenefitDelivery_charityProgramId_fkey" FOREIGN KEY ("charityProgramId") REFERENCES "CharityProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenefitDelivery" ADD CONSTRAINT "BenefitDelivery_administratorId_fkey" FOREIGN KEY ("administratorId") REFERENCES "Administrator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
