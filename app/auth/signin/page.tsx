import { SignInForm } from "./SignInForm";

export default function SignInPage() {
  return (
    <div className="max-w-sm mx-auto pt-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] mb-1 leading-tight">
        Welcome back
      </h1>
      <p className="text-sm text-[var(--muted)] mb-7">Sign in to book a seat.</p>
      <SignInForm />
    </div>
  );
}
