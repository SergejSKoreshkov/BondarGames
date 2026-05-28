import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });

  const record = await prisma.verificationToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    if (record) await prisma.verificationToken.delete({ where: { id: record.id } }).catch(() => {});
    return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const userRow = await prisma.user.findUnique({ where: { id: record.userId } });
  const promoteToAdmin =
    !!adminEmail && !!userRow && userRow.email.toLowerCase() === adminEmail;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        emailVerified: new Date(),
        ...(promoteToAdmin ? { role: "ADMIN" as const } : {}),
      },
    }),
    prisma.verificationToken.delete({ where: { id: record.id } }),
  ]);

  return NextResponse.json({ ok: true });
}
