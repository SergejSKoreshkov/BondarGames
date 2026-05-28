"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });
    setBusy(false);
    if (res?.error) {
      setError("Wrong email or password");
      return;
    }
    window.location.href = res?.url ?? "/";
  }

  return (
    <div className="glass-strong rounded-3xl p-6 space-y-4">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="btn w-full glass glass-hover"
      >
        <GoogleMark /> Continue with Google
      </button>

      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <div className="flex-1 h-px bg-white/50" />
        or
        <div className="flex-1 h-px bg-white/50" />
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            autoComplete="current-password"
          />
        </Field>
        {error && <div className="text-xs text-red-500">{error}</div>}
        <button type="submit" disabled={busy} className="btn w-full glass-accent">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="text-sm text-[var(--muted)] text-center">
        New here?{" "}
        <Link href="/auth/signup" className="text-[var(--foreground)] font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-[var(--muted)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.5 14.5 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
