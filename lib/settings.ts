import { prisma } from "@/lib/db";

export async function getSettings() {
  return prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, publicPricePerPerson: 10, privatePricePerEvent: 100 },
  });
}
