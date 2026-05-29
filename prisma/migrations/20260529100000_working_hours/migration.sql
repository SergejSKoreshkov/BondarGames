-- Weekly recurring opening hours (one row per day of week, 0 = Sunday .. 6 = Saturday)
CREATE TABLE "WorkingHours" (
    "id" SERIAL NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openMinute" INTEGER NOT NULL DEFAULT 540,
    "closeMinute" INTEGER NOT NULL DEFAULT 1380,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkingHours_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkingHours_dayOfWeek_key" ON "WorkingHours"("dayOfWeek");

-- One-time per-date overrides
CREATE TABLE "WorkingHoursException" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openMinute" INTEGER NOT NULL DEFAULT 540,
    "closeMinute" INTEGER NOT NULL DEFAULT 1380,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkingHoursException_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WorkingHoursException_date_key" ON "WorkingHoursException"("date");

-- Seed default weekly hours: open 09:00–23:00 every day.
INSERT INTO "WorkingHours" ("dayOfWeek", "isClosed", "openMinute", "closeMinute", "updatedAt")
VALUES
  (0, false, 540, 1380, NOW()),
  (1, false, 540, 1380, NOW()),
  (2, false, 540, 1380, NOW()),
  (3, false, 540, 1380, NOW()),
  (4, false, 540, 1380, NOW()),
  (5, false, 540, 1380, NOW()),
  (6, false, 540, 1380, NOW())
ON CONFLICT ("dayOfWeek") DO NOTHING;
