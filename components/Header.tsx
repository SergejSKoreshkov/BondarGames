"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Glass } from "@/components/Glass";

export function Header() {
  const { data } = useSession();
  const user = data?.user;
  return (
    <header className="sticky top-3 z-30 mx-auto w-full max-w-5xl px-3 sm:px-5 flex justify-center">
      <Glass
        cornerRadius={999}
        padding="6px 10px"
        displacementScale={55}
        blurAmount={0.05}
        saturation={180}
        aberrationIntensity={2}
        elasticity={0.18}
      >
        <div className="flex items-center justify-between gap-2 h-12">
          <Link href="/" className="flex items-center gap-2 px-2 font-semibold tracking-tight">
            <span aria-hidden className="relative inline-block h-6 w-6 rounded-full overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-violet-400 to-rose-300" />
              <span className="absolute inset-0 rounded-full ring-1 ring-white/50" />
              <span className="absolute top-1 left-1 h-2 w-2 rounded-full bg-white/70 blur-[1px]" />
            </span>
            <span className="text-sm sm:text-base">BondarGames</span>
          </Link>
          <nav className="flex items-center gap-0.5 text-sm">
            <NavLink href="/">Schedule</NavLink>
            {user && <NavLink href="/profile">Bookings</NavLink>}
            {user?.role === "ADMIN" && <NavLink href="/admin">Admin</NavLink>}
            {user ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="btn btn-xs glass glass-hover ml-1"
              >
                Sign out
              </button>
            ) : (
              <>
                <NavLink href="/auth/signin">Sign in</NavLink>
                <Link href="/auth/signup" className="btn btn-xs glass-accent ml-1">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </Glass>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 h-8 inline-flex items-center rounded-full text-[13px] text-[var(--foreground)]/80 hover:text-[var(--foreground)] hover:bg-white/30 transition-colors"
    >
      {children}
    </Link>
  );
}
