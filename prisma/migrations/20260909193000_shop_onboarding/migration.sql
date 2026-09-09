-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "onboardingCompletedAt" DATETIME;
ALTER TABLE "Shop" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 1;

-- Existing parlors stay on the floor. Only shops created after this migration
-- (signup) start with a null completed timestamp and must finish /onboarding.
UPDATE "Shop" SET "onboardingCompletedAt" = "createdAt", "onboardingStep" = 6
WHERE "onboardingCompletedAt" IS NULL;
