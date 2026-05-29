import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function serialize(e: {
  id: string;
  date: Date;
  isClosed: boolean;
  openMinute: number;
  closeMinute: number;
  note: string | null;
}) {
  return {
    id: e.id,
    date: e.date.toISOString().slice(0, 10),
    isClosed: e.isClosed,
    openMinute: e.openMinute,
    closeMinute: e.closeMinute,
    note: e.note,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const rows = await prisma.workingHoursException.findMany({
    where: { date: { gte: today } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(rows.map(serialize));
}

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  isClosed: z.boolean(),
  openMinute: z.number().int().min(0).max(1440),
  closeMinute: z.number().int().min(0).max(1440),
  note: z.string().max(120).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { date, isClosed, openMinute, closeMinute, note } = parsed.data;
  if (!isClosed && closeMinute <= openMinute) {
    return NextResponse.json(
      { error: "Closing time must be after opening time." },
      { status: 400 },
    );
  }
  const dateOnly = new Date(`${date}T00:00:00.000Z`);
  const row = await prisma.workingHoursException.upsert({
    where: { date: dateOnly },
    update: { isClosed, openMinute, closeMinute, note: note ?? null },
    create: { date: dateOnly, isClosed, openMinute, closeMinute, note: note ?? null },
  });
  return NextResponse.json(serialize(row), { status: 201 });
}
