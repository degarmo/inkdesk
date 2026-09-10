-- Optional link from a roster artist to a parlor login (staff/admin).
-- Used so a staff dashboard can show that artist’s own gross / usage fee / net.
ALTER TABLE "Artist" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "Artist_userId_key" ON "Artist"("userId");

ALTER TABLE "Artist" ADD CONSTRAINT "Artist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
