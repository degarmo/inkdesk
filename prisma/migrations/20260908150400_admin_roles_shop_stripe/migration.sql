-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Shop" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    "hoursOpen" TEXT NOT NULL DEFAULT '11:00',
    "hoursClose" TEXT NOT NULL DEFAULT '20:00',
    "stripePublishableKey" TEXT NOT NULL DEFAULT '',
    "stripeSecretKey" TEXT NOT NULL DEFAULT '',
    "stripeWebhookSecret" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Shop" ("id", "name", "timezone", "hoursOpen", "hoursClose", "createdAt", "updatedAt")
SELECT "id", "name", "timezone", "hoursOpen", "hoursClose", "createdAt", "updatedAt" FROM "Shop";
DROP TABLE "Shop";
ALTER TABLE "new_Shop" RENAME TO "Shop";

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'owner',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "shopId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_User" ("id", "email", "passwordHash", "name", "shopId", "createdAt")
SELECT "id", "email", "passwordHash", "name", "shopId", "createdAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_shopId_idx" ON "User"("shopId");

CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "clientId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Payment_shopId_createdAt_idx" ON "Payment"("shopId", "createdAt");
CREATE INDEX "Payment_appointmentId_idx" ON "Payment"("appointmentId");
CREATE INDEX "Payment_stripeSessionId_idx" ON "Payment"("stripeSessionId");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
