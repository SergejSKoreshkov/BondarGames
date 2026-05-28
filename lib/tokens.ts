import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export async function createVerificationToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h
  await prisma.verificationToken.create({
    data: { token, userId, expiresAt },
  });
  return token;
}

export function verificationLink(token: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}/auth/verify?token=${token}`;
}
