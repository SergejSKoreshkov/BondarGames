-- Event: add privacy + share token
ALTER TABLE "Event"
  ADD COLUMN "isPrivate"  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "shareToken" TEXT;

CREATE UNIQUE INDEX "Event_shareToken_key" ON "Event"("shareToken");

-- Settings: rename pricePerPerson -> publicPricePerPerson, add private flat fee
ALTER TABLE "Settings" RENAME COLUMN "pricePerPerson" TO "publicPricePerPerson";
ALTER TABLE "Settings" ADD COLUMN "privatePricePerEvent" INTEGER NOT NULL DEFAULT 100;
