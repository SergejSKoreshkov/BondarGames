import { prisma } from "@/lib/db";

export async function getSettings() {
  const row = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, pricePerPerson: 10 },
  });
  return row;
}
