"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Sign up failed");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="glass-strong rounded-3xl p-6 text-sm space-y-2">
        <div className="font-medium">Check your inbox</div>
        <p className="text-[var(--muted)]">
          We sent a confirmation link to <b>{email}</b>. Click it to verify your email, then sign in.
        </p>
        <Link href="/auth/signin" className="inline-block mt-2 text-[var(--foreground)] font-medium">
          Go to sign in →
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-3xl p-6 space-y-4">
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="btn w-full glass glass-hover"
      >
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <div className="flex-1 h-px bg-white/50" />
        or
        <div className="flex-1 h-px bg-white/50" />
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Name">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            autoComplete="name"
          />
        </Field>
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
            autoComplete="new-password"
          />
        </Field>
        {error && <div className="text-xs text-red-500">{error}</div>}
        <button type="submit" disabled={busy} className="btn w-full glass-accent">
          {busy ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-[var(--muted)] text-center">
        Already have an account?{" "}
        <Link href="/auth/signin" className="text-[var(--foreground)] font-medium">
          Sign in
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
