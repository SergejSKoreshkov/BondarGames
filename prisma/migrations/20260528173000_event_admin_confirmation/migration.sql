-- Event status enum
CREATE TYPE "EventStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- Add status (default PENDING) and confirmedAt
ALTER TABLE "Event"
  ADD COLUMN "status"      "EventStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "confirmedAt" TIMESTAMP(3);

-- Mark any existing events as CONFIRMED (they were live before this migration)
UPDATE "Event" SET "status" = 'CONFIRMED', "confirmedAt" = NOW() WHERE "status" = 'PENDING';

CREATE INDEX "Event_status_idx" ON "Event"("status");
