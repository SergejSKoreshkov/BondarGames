import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isAdmin = session.user.role === "ADMIN";
  const isCreator = event.createdById === session.user.id;
  if (!isAdmin && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!isAdmin) {
    const msUntil = event.startsAt.getTime() - Date.now();
    if (msUntil < TWENTY_FOUR_HOURS_MS) {
      return NextResponse.json(
        { error: "You can only delete your event up to 24h before it starts" },
        { status: 400 },
      );
    }
  }
  await prisma.event.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
