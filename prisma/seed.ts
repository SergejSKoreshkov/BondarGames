import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";

async function main() {
  // Global settings (singleton)
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, pricePerPerson: 10 },
  });
  console.log("Seeded settings");

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!adminEmail) {
    console.warn("ADMIN_EMAIL not set — skipping admin seed");
    return;
  }
  const password = process.env.ADMIN_PASSWORD ?? "changeme1234";
  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN", emailVerified: new Date() },
    create: {
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log(`Seeded admin user ${adminEmail} (password: ${password})`);

  const sampleStartsAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 3);
  const sample = await prisma.event.upsert({
    where: { id: "seed-sample-event" },
    update: {},
    create: {
      id: "seed-sample-event",
      title: "Catan night",
      gameName: "Settlers of Catan",
      description: "Casual Catan night. Beginners welcome.",
      startsAt: sampleStartsAt,
      durationMinutes: 150,
      maxPeople: 6,
      location: "BondarGames cafe",
      createdById: admin.id,
    },
  });
  await prisma.reservation.upsert({
    where: { eventId_userId: { eventId: sample.id, userId: admin.id } },
    update: {},
    create: { eventId: sample.id, userId: admin.id, people: 1 },
  });
  console.log("Seeded sample event");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
