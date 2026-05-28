import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let status: "missing" | "invalid" | "ok" = "missing";

  if (token) {
    const record = await prisma.verificationToken.findUnique({ where: { token } });
    if (record && record.expiresAt > new Date()) {
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
      status = "ok";
    } else {
      status = "invalid";
    }
  }

  return (
    <div className="max-w-sm mx-auto rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 text-sm space-y-3">
      {status === "ok" && (
        <>
          <div className="font-medium">Email verified</div>
          <p className="text-[var(--muted)]">You can now book a seat.</p>
          <Link
            href="/auth/signin"
            className="inline-block h-10 px-4 leading-10 rounded-full bg-[var(--accent)] text-white font-medium"
          >
            Sign in
          </Link>
        </>
      )}
      {status === "invalid" && (
        <>
          <div className="font-medium">Link expired or invalid</div>
          <p className="text-[var(--muted)]">Sign up again or request a new email.</p>
          <Link href="/auth/signup" className="font-medium">
            Go to sign up →
          </Link>
        </>
      )}
      {status === "missing" && (
        <>
          <div className="font-medium">No token provided</div>
          <p className="text-[var(--muted)]">Open the link from your confirmation email.</p>
        </>
      )}
    </div>
  );
}
