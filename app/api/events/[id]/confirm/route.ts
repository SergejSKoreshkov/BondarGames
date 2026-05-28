import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "CONFIRMED") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true });
  }
  await prisma.event.update({
    where: { id },
    data: { status: "CONFIRMED", confirmedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
