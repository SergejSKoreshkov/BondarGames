import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const s = await getSettings();
  return NextResponse.json({ pricePerPerson: s.pricePerPerson });
}

const schema = z.object({
  pricePerPerson: z.number().int().min(0).max(100000),
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
    update: { pricePerPerson: parsed.data.pricePerPerson },
    create: { id: 1, pricePerPerson: parsed.data.pricePerPerson },
  });
  return NextResponse.json({ pricePerPerson: row.pricePerPerson });
}
