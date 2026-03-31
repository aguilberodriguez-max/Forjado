import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col">
        <LoginForm />
      </div>
    </div>
  );
}
