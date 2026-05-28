import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === "ADMIN";

  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
    include: {
      reservations: { select: { userId: true, people: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });

  // Joiners (anyone other than the host or an admin) only see CONFIRMED events.
  // Pending and private events are sanitised so the slot still shows as busy.
  const result = events.map((e) => {
    const isHost = !!(userId && e.createdById === userId);
    const canSeeDetails = isAdmin || isHost;
    const sanitise = (e.isPrivate || e.status === "PENDING") && !canSeeDetails;
    if (sanitise) {
      return {
        id: e.id,
        title: null,
        description: null,
        gameName: null,
        startsAt: e.startsAt.toISOString(),
        durationMinutes: e.durationMinutes,
        maxPeople: e.maxPeople,
        location: null,
        isPrivate: e.isPrivate,
        status: e.status,
        createdBy: null,
        seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
      };
    }
    return {
      id: e.id,
      title: e.title,
      description: e.description,
      gameName: e.gameName,
      startsAt: e.startsAt.toISOString(),
      durationMinutes: e.durationMinutes,
      maxPeople: e.maxPeople,
      location: e.location,
      isPrivate: e.isPrivate,
      status: e.status,
      shareToken: canSeeDetails ? e.shareToken : null,
      createdBy: e.createdBy,
      seatsTaken: e.reservations.reduce((acc, r) => acc + r.people, 0),
    };
  });
  return NextResponse.json(result);
}

const createSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  gameName: z.string().min(1).max(120),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(720).default(120),
  maxPeople: z.number().int().min(1).max(100),
  location: z.string().max(200).optional().nullable(),
  people: z.number().int().min(1).max(20).default(1),
  isPrivate: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified) {
    return NextResponse.json({ error: "Please verify your email first" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.flatten() }, { status: 400 });
  }

  const startsAt = new Date(parsed.data.startsAt);
  if (startsAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Event must start in the future" }, { status: 400 });
  }
  if (parsed.data.people > parsed.data.maxPeople) {
    return NextResponse.json({ error: "Your seats exceed max capacity" }, { status: 400 });
  }
  const endsAt = new Date(startsAt.getTime() + parsed.data.durationMinutes * 60_000);
  const shareToken = parsed.data.isPrivate ? randomBytes(16).toString("hex") : null;

  try {
    const event = await prisma.$transaction(async (tx) => {
      const conflicts = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Event"
        WHERE "startsAt" < ${endsAt}
          AND ("startsAt" + ("durationMinutes" || ' minutes')::interval) > ${startsAt}
        LIMIT 1
      `;
      if (conflicts.length > 0) {
        throw new Error("OVERLAP");
      }
      const created = await tx.event.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          gameName: parsed.data.gameName,
          startsAt,
          durationMinutes: parsed.data.durationMinutes,
          maxPeople: parsed.data.maxPeople,
          location: parsed.data.location ?? null,
          isPrivate: parsed.data.isPrivate,
          shareToken,
          createdById: session.user.id,
        },
      });
      await tx.reservation.create({
        data: {
          eventId: created.id,
          userId: session.user.id,
          people: parsed.data.people,
        },
      });
      return created;
    });
    return NextResponse.json(
      {
        id: event.id,
        isPrivate: event.isPrivate,
        shareToken: event.shareToken,
        status: event.status,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "OVERLAP") {
      return NextResponse.json(
        { error: "This time slot overlaps an existing event" },
        { status: 409 },
      );
    }
    console.error("Failed to create event", err);
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
