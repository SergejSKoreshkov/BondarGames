import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "USER" | "ADMIN";
      emailVerified: Date | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth" {
  interface User {
    role?: "USER" | "ADMIN";
    emailVerified?: Date | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        if (!user.emailVerified) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const shouldBeAdmin = adminEmail && user.email.toLowerCase() === adminEmail;
        if (!existing) {
          const created = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
              role: shouldBeAdmin ? "ADMIN" : "USER",
              accounts: {
                create: {
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                },
              },
            },
          });
          user.id = created.id;
          user.role = created.role;
          user.emailVerified = created.emailVerified;
        } else {
          if (!existing.emailVerified) {
            await prisma.user.update({
              where: { id: existing.id },
              data: { emailVerified: new Date() },
            });
          }
          user.id = existing.id;
          user.role = existing.role;
          user.emailVerified = existing.emailVerified ?? new Date();
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role ?? "USER";
        token.emailVerified = user.emailVerified ?? null;
      }
      if (trigger === "update" && token.uid) {
        const fresh = await prisma.user.findUnique({ where: { id: token.uid as string } });
        if (fresh) {
          token.role = fresh.role;
          token.emailVerified = fresh.emailVerified;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      session.user.role = (token.role as "USER" | "ADMIN") ?? "USER";
      session.user.emailVerified = (token.emailVerified as Date | null) ?? null;
      return session;
    },
  },
});
