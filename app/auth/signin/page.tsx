import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Welcome back</h1>
      <p className="text-sm text-[var(--muted)] mb-8">Sign in to book a seat.</p>
      <SignInForm />
    </div>
  );
}
