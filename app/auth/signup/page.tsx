import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="max-w-sm mx-auto pt-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.02em] mb-1 leading-tight">
        Create your account
      </h1>
      <p className="text-sm text-[var(--muted)] mb-7">It takes a minute.</p>
      <SignUpForm />
    </div>
  );
}
