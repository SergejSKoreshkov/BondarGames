"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function Header() {
  const { data } = useSession();
  const user = data?.user;
  return (
    <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur sticky top-0 z-30">
      <div className="mx-auto w-full max-w-5xl flex items-center justify-between px-5 sm:px-8 h-16">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-base">
          <span className="inline-block h-6 w-6 rounded-full bg-[var(--accent)]" />
          BondarGames
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/" className="px-3 py-1.5 rounded-full hover:bg-black/5">
            Schedule
          </Link>
          {user && (
            <Link href="/profile" className="px-3 py-1.5 rounded-full hover:bg-black/5">
              My bookings
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" className="px-3 py-1.5 rounded-full hover:bg-black/5">
              Admin
            </Link>
          )}
          {user ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="ml-2 px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 text-sm"
            >
              Sign out
            </button>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="ml-2 px-3 py-1.5 rounded-full hover:bg-black/5"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="px-3 py-1.5 rounded-full bg-[var(--accent)] text-white text-sm"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
