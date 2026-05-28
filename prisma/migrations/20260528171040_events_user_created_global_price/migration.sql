-- Existing events have no creator and used per-event pricing; drop them.
-- Reservations cascade-delete via the existing FK.
DELETE FROM "Event";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "pricePerPerson",
ADD COLUMN     "createdById" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pricePerPerson" INTEGER NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton settings row.
INSERT INTO "Settings" ("id", "pricePerPerson", "updatedAt")
VALUES (1, 10, NOW())
ON CONFLICT ("id") DO NOTHING;

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
