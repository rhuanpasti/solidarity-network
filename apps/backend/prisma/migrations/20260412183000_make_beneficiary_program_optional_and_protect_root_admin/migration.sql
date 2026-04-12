ALTER TABLE "Administrator"
ADD COLUMN "isSystemRoot" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Administrator"
SET "isSystemRoot" = true
WHERE "role" = 'super_admin'
  AND "name" = 'System Administrator';

ALTER TABLE "Beneficiary"
ALTER COLUMN "charityProgramId" DROP NOT NULL;
