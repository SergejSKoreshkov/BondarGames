import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createVerificationToken, verificationLink } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/mailer";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const role = adminEmail && email.toLowerCase() === adminEmail ? "ADMIN" : "USER";

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  const token = await createVerificationToken(user.id);
  try {
    await sendVerificationEmail(email, verificationLink(token));
  } catch (err) {
    console.error("Failed to send verification email", err);
    return NextResponse.json(
      { error: "Account created, but we couldn't send the verification email. Contact support." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
