"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Glass } from "@/components/Glass";

export function Header() {
  const { data } = useSession();
  const user = data?.user;
  return (
    <header className="sticky top-4 z-30 mx-auto w-full max-w-5xl px-3 sm:px-6 flex justify-center">
      <Glass cornerRadius={999} padding="6px">
        <div className="flex items-center justify-between gap-1 sm:gap-3 h-12 pr-3">
          <Link
            href="/"
            className="flex items-center gap-2 pl-2 pr-3 font-semibold tracking-tight"
          >
            <Logo />
            <span className="text-[15px]">BondarGames</span>
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

function Logo() {
  return (
    <span aria-hidden className="relative inline-block h-7 w-7 rounded-full overflow-hidden">
      <span className="absolute inset-0 bg-gradient-to-br from-slate-300 via-indigo-200 to-slate-400" />
      <span className="absolute inset-0 rounded-full ring-1 ring-white/60" />
      <span className="absolute top-1 left-1 h-2.5 w-2.5 rounded-full bg-white/75 blur-[1px]" />
      <span className="absolute bottom-1 right-1.5 h-1 w-1 rounded-full bg-black/15" />
    </span>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path?.startsWith(href);
  return (
    <Link
      href={href}
      className={`px-3 h-8 inline-flex items-center rounded-full text-[13px] transition-colors ${
        active
          ? "bg-white/55 text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "text-[var(--foreground)]/75 hover:text-[var(--foreground)] hover:bg-white/35"
      }`}
    >
      {children}
    </Link>
  );
}
