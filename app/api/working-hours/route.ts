import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getWeeklyHours } from "@/lib/working-hours";

export async function GET() {
  const weekly = await getWeeklyHours();
  return NextResponse.json(weekly);
}

const daySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  openMinute: z.number().int().min(0).max(1440),
  closeMinute: z.number().int().min(0).max(1440),
});

const schema = z.object({ days: z.array(daySchema).min(1).max(7) });

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
  for (const d of parsed.data.days) {
    if (!d.isClosed && d.closeMinute <= d.openMinute) {
      return NextResponse.json(
        { error: "Closing time must be after opening time." },
        { status: 400 },
      );
    }
  }
  await prisma.$transaction(
    parsed.data.days.map((d) =>
      prisma.workingHours.upsert({
        where: { dayOfWeek: d.dayOfWeek },
        update: { isClosed: d.isClosed, openMinute: d.openMinute, closeMinute: d.closeMinute },
        create: {
          dayOfWeek: d.dayOfWeek,
          isClosed: d.isClosed,
          openMinute: d.openMinute,
          closeMinute: d.closeMinute,
        },
      }),
    ),
  );
  return NextResponse.json(await getWeeklyHours());
}
