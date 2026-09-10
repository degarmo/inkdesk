-- Optional 1:1 login on a roster chair. Staff earnings prefer this link.
-- Same-shop unique name match remains a temporary fallback in application code.
ALTER TABLE "Artist" ADD COLUMN "userId" TEXT;

CREATE UNIQUE INDEX "Artist_userId_key" ON "Artist"("userId");

ALTER TABLE "Artist" ADD CONSTRAINT "Artist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
