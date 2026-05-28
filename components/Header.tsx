"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Glass } from "@/components/Glass";

export function Header() {
  const { data } = useSession();
  const user = data?.user;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed top-0 inset-x-0 z-30 px-3 sm:px-6 pt-3">
      <div className="mx-auto max-w-5xl relative">
        <Glass cornerRadius={22} padding="0">
          <div className="flex items-center justify-between h-14 pl-4 pr-2">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-semibold tracking-tight"
            >
              <Logo />
              <span className="text-[15px]">BondarGames</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-1 text-sm pr-1">
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

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="sm:hidden h-10 w-10 inline-flex items-center justify-center rounded-full hover:bg-white/40 active:bg-white/55 transition-colors"
            >
              <span className="relative block w-5 h-3" aria-hidden>
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                    open ? "translate-y-[5px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[5px] h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${
                    open ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[10px] h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                    open ? "-translate-y-[5px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </Glass>

        {/* Mobile dropdown */}
        <div
          id="mobile-menu"
          className={`sm:hidden absolute top-full inset-x-0 mt-2 transition-all duration-200 origin-top ${
            open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
          }`}
        >
          <Glass cornerRadius={22} padding="8px">
            <nav className="flex flex-col gap-0.5">
              <MobileLink href="/">Schedule</MobileLink>
              {user && <MobileLink href="/profile">My bookings</MobileLink>}
              {user?.role === "ADMIN" && <MobileLink href="/admin">Admin</MobileLink>}
              <div className="h-px bg-black/[0.06] my-1.5 mx-3" />
              {user ? (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="h-11 px-4 rounded-xl text-left text-sm hover:bg-white/45"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <MobileLink href="/auth/signin">Sign in</MobileLink>
                  <MobileLink href="/auth/signup" accent>
                    Sign up
                  </MobileLink>
                </>
              )}
            </nav>
          </Glass>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <span
      aria-hidden
      className="relative inline-block h-7 w-7 rounded-full overflow-hidden"
    >
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

function MobileLink({
  href,
  children,
  accent,
}: {
  href: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path?.startsWith(href);
  if (accent) {
    return (
      <Link
        href={href}
        className="h-11 px-4 mt-1 inline-flex items-center justify-center rounded-xl glass-accent text-sm font-medium"
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className={`h-11 px-4 inline-flex items-center rounded-xl text-sm transition-colors ${
        active
          ? "bg-white/55 font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "hover:bg-white/45 text-[var(--foreground)]/85"
      }`}
    >
      {children}
    </Link>
  );
}
