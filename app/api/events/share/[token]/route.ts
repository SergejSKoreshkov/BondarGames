import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const event = await prisma.event.findUnique({
    where: { shareToken: token },
    include: {
      reservations: { select: { userId: true, people: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const userId = session?.user?.id;

  return NextResponse.json({
    id: event.id,
    title: event.title,
    description: event.description,
    gameName: event.gameName,
    startsAt: event.startsAt.toISOString(),
    durationMinutes: event.durationMinutes,
    maxPeople: event.maxPeople,
    location: event.location,
    isPrivate: event.isPrivate,
    createdBy: event.createdBy,
    seatsTaken: event.reservations.reduce((acc, r) => acc + r.people, 0),
    bookedByMe: userId ? event.reservations.some((r) => r.userId === userId) : false,
  });
}
