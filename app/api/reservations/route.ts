import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { sendReservationEmail } from "@/lib/mailer";

const schema = z.object({
  eventId: z.string().min(1),
  people: z.number().int().min(1).max(20),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const reservations = await prisma.reservation.findMany({
    where: { userId: session.user.id },
    include: { event: true },
    orderBy: { event: { startsAt: "asc" } },
  });
  return NextResponse.json(
    reservations.map((r) => ({
      id: r.id,
      people: r.people,
      createdAt: r.createdAt.toISOString(),
      event: {
        id: r.event.id,
        title: r.event.title,
        gameName: r.event.gameName,
        startsAt: r.event.startsAt.toISOString(),
        pricePerPerson: r.event.pricePerPerson,
        location: r.event.location,
      },
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: "Please verify your email first" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const event = await prisma.event.findUnique({
    where: { id: parsed.data.eventId },
    include: { reservations: true },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.startsAt < new Date()) {
    return NextResponse.json({ error: "Event has already started" }, { status: 400 });
  }

  const seatsTaken = event.reservations.reduce((acc, r) => acc + r.people, 0);
  if (seatsTaken + parsed.data.people > event.maxPeople) {
    return NextResponse.json({ error: "Not enough seats left" }, { status: 409 });
  }

  const existing = event.reservations.find((r) => r.userId === session.user.id);
  if (existing) {
    return NextResponse.json({ error: "You already booked this event" }, { status: 409 });
  }

  const reservation = await prisma.reservation.create({
    data: {
      eventId: event.id,
      userId: session.user.id,
      people: parsed.data.people,
    },
  });

  if (session.user.email) {
    sendReservationEmail(session.user.email, event, parsed.data.people).catch((e) =>
      console.error("reservation email failed", e),
    );
  }

  return NextResponse.json(reservation, { status: 201 });
}
