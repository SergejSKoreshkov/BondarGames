import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    include: {
      reservations: { select: { people: true } },
    },
  });
  const result = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    gameName: e.gameName,
    startsAt: e.startsAt.toISOString(),
    durationMinutes: e.durationMinutes,
    maxPeople: e.maxPeople,
    pricePerPerson: e.pricePerPerson,
    location: e.location,
    seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
  }));
  return NextResponse.json(result);
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  gameName: z.string().min(1).max(120),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(720).default(120),
  maxPeople: z.number().int().min(1).max(100),
  pricePerPerson: z.number().int().min(0).max(100000),
  location: z.string().max(200).optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }
  const event = await prisma.event.create({
    data: {
      ...parsed.data,
      startsAt: new Date(parsed.data.startsAt),
      description: parsed.data.description ?? null,
      location: parsed.data.location ?? null,
    },
  });
  return NextResponse.json(event, { status: 201 });
}
