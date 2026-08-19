-- Add per-account session revocation and one-time password reset tokens.
ALTER TABLE "AuthCredential"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Beneficiary"
ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key"
ON "PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_accountId_accountType_idx"
ON "PasswordResetToken"("accountId", "accountType");

CREATE INDEX "PasswordResetToken_expiresAt_idx"
ON "PasswordResetToken"("expiresAt");

CREATE INDEX "PasswordResetToken_usedAt_idx"
ON "PasswordResetToken"("usedAt");

CREATE INDEX "AdministratorProgramLink_charityProgramId_administratorId_idx"
ON "AdministratorProgramLink"("charityProgramId", "administratorId");

ALTER TABLE "BenefitDelivery"
ADD CONSTRAINT "BenefitDelivery_quantity_positive"
CHECK ("quantity" > 0);
