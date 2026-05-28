import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { event: true },
  });
  if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = reservation.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isAdmin) {
    const msUntil = reservation.event.startsAt.getTime() - Date.now();
    if (msUntil < TWENTY_FOUR_HOURS_MS) {
      return NextResponse.json(
        { error: "Cancellation closed (within 24h of the event)" },
        { status: 400 },
      );
    }
  }

  await prisma.reservation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
