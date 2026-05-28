import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({
    publicPricePerPerson: s.publicPricePerPerson,
    privatePricePerEvent: s.privatePricePerEvent,
  });
}

const schema = z.object({
  publicPricePerPerson: z.number().int().min(0).max(100000),
  privatePricePerEvent: z.number().int().min(0).max(1_000_000),
});

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const row = await prisma.settings.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data },
  });
  return NextResponse.json({
    publicPricePerPerson: row.publicPricePerPerson,
    privatePricePerEvent: row.privatePricePerEvent,
  });
}
