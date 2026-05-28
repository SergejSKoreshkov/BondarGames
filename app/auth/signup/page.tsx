import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Create your account</h1>
      <p className="text-sm text-[var(--muted)] mb-8">It takes a minute.</p>
      <SignUpForm />
    </div>
  );
}
