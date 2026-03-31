"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type AuthError } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "signup";

type LoginValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

function authErrorKey(error: AuthError): "invalidCredentials" | "signUpFailed" | "generic" {
  const msg = error.message.toLowerCase();
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials")
  ) {
    return "invalidCredentials";
  }
  if (
    msg.includes("already registered") ||
    msg.includes("user already") ||
    msg.includes("email address") ||
    msg.includes("password")
  ) {
    return "signUpFailed";
  }
  return "generic";
}

type AuthFormFieldsProps = {
  mode: AuthMode;
};

function AuthFormFields({ mode }: AuthFormFieldsProps) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState<
    string | null
  >(null);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, { message: t("validation.required") })
          .email({ message: t("validation.emailInvalid") }),
        password: z.string().min(1, { message: t("validation.required") }),
        confirmPassword: z.literal(""),
      }),
    [t],
  );

  const signupSchema = useMemo(
    () =>
      z
        .object({
          email: z
            .string()
            .min(1, { message: t("validation.required") })
            .email({ message: t("validation.emailInvalid") }),
          password: z
            .string()
            .min(6, { message: t("validation.passwordMin") }),
          confirmPassword: z
            .string()
            .min(1, { message: t("validation.required") }),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t("validation.passwordMismatch"),
          path: ["confirmPassword"],
        }),
    [t],
  );

  const schema = mode === "login" ? loginSchema : signupSchema;

  const form = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: LoginValues) {
    setAuthError(null);
    setForgotPasswordSuccess(null);
    const supabase = createBrowserSupabaseClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) {
        setAuthError(t(`errors.${authErrorKey(error)}`));
        return;
      }
      router.push(`/${locale}/dashboard`);
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (error) {
      setAuthError(t(`errors.${authErrorKey(error)}`));
      return;
    }
    router.push(`/${locale}/onboarding`);
    router.refresh();
  }

  async function onForgotPassword() {
    setAuthError(null);
    setForgotPasswordSuccess(null);

    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) {
      return;
    }

    const email = form.getValues("email");
    const supabase = createBrowserSupabaseClient();
    setIsSendingReset(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setAuthError(t("errors.generic"));
        return;
      }
      setForgotPasswordSuccess(t("forgotPasswordSuccess"));
    } finally {
      setIsSendingReset(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
    >
      {authError ? (
        <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
          {authError}
        </p>
      ) : null}
      {forgotPasswordSuccess ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
          {forgotPasswordSuccess}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm text-[#A3A3A3]">
          {t("email")}
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-[#FFFFFF] placeholder:text-[#A3A3A3]/60 outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
          placeholder={t("emailPlaceholder")}
          {...form.register("email")}
          aria-invalid={Boolean(form.formState.errors.email)}
        />
        {form.formState.errors.email?.message ? (
          <p className="text-sm text-[#EF4444]" role="alert">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm text-[#A3A3A3]">
          {t("password")}
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete={
            mode === "login" ? "current-password" : "new-password"
          }
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-[#FFFFFF] placeholder:text-[#A3A3A3]/60 outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
          placeholder={t("passwordPlaceholder")}
          {...form.register("password")}
          aria-invalid={Boolean(form.formState.errors.password)}
        />
        {form.formState.errors.password?.message ? (
          <p className="text-sm text-[#EF4444]" role="alert">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      {mode === "signup" ? (
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="login-confirm-password"
            className="text-sm text-[#A3A3A3]"
          >
            {t("confirmPassword")}
          </label>
          <input
            id="login-confirm-password"
            type="password"
            autoComplete="new-password"
            className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-[#FFFFFF] placeholder:text-[#A3A3A3]/60 outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
            placeholder={t("confirmPasswordPlaceholder")}
            {...form.register("confirmPassword")}
            aria-invalid={Boolean(form.formState.errors.confirmPassword)}
          />
          {form.formState.errors.confirmPassword?.message ? (
            <p className="text-sm text-[#EF4444]" role="alert">
              {form.formState.errors.confirmPassword.message}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <input type="hidden" {...form.register("confirmPassword")} />
          <div className="-mt-1 flex justify-end">
            <button
              type="button"
              onClick={onForgotPassword}
              disabled={isSendingReset}
              className="text-sm font-medium text-[#F26522] underline-offset-4 hover:underline"
            >
              {isSendingReset ? t("forgotPasswordSending") : t("forgotPassword")}
            </button>
          </div>
        </>
      )}

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-11 w-full rounded-md border-0 bg-[#F26522] text-base font-medium text-white hover:bg-[#F26522]/90 disabled:opacity-60"
      >
        {mode === "login" ? t("submitLogin") : t("submitSignup")}
      </Button>
    </form>
  );
}

export function LoginForm() {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<AuthMode>("login");

  return (
    <div className="flex w-full flex-col gap-6">
      <h1 className="text-center text-3xl font-bold tracking-tight text-[#F26522] md:text-4xl">
        {t("brandName")}
      </h1>
      <div className="flex flex-col gap-6">
        <div
          className="flex w-full rounded-md bg-[#1A1A1A] p-1"
          role="tablist"
          aria-label={t("tabsAriaLabel")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "login"}
            className={cn(
              "flex-1 rounded-[6px] py-2.5 text-sm font-medium transition-colors",
              mode === "login"
                ? "bg-[#F26522] text-white"
                : "text-[#A3A3A3] hover:text-white",
            )}
            onClick={() => setMode("login")}
          >
            {t("tabLogin")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={cn(
              "flex-1 rounded-[6px] py-2.5 text-sm font-medium transition-colors",
              mode === "signup"
                ? "bg-[#F26522] text-white"
                : "text-[#A3A3A3] hover:text-white",
            )}
            onClick={() => setMode("signup")}
          >
            {t("tabSignup")}
          </button>
        </div>

        <AuthFormFields key={mode} mode={mode} />
      </div>
    </div>
  );
}
