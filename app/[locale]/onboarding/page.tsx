"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  Car,
  Hammer,
  HardHat,
  House,
  Paintbrush,
  Scissors,
  Shirt,
  Sparkles,
  Store,
  Trees,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CountrySelect } from "@/components/forms/country-select";
import { Button } from "@/components/ui/button";
import { getCountryByCode } from "@/lib/countries";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Industry, Language } from "@/types";
import { cn } from "@/lib/utils";

const INDUSTRIES: Array<{
  value: Industry;
  icon: ComponentType<{ className?: string }>;
  labelKey: string;
}> = [
  { value: "cleaning", icon: Sparkles, labelKey: "industries.cleaning" },
  { value: "handyman", icon: Hammer, labelKey: "industries.handyman" },
  { value: "auto_detailing", icon: Car, labelKey: "industries.autoDetailing" },
  { value: "landscaping", icon: Trees, labelKey: "industries.landscaping" },
  { value: "beauty_barber", icon: Scissors, labelKey: "industries.beautyBarber" },
  { value: "food_catering", icon: UtensilsCrossed, labelKey: "industries.foodCatering" },
  { value: "painting", icon: Paintbrush, labelKey: "industries.painting" },
  { value: "moving", icon: Truck, labelKey: "industries.moving" },
  { value: "roofing", icon: House, labelKey: "industries.roofing" },
  { value: "auto_sales", icon: Car, labelKey: "industries.autoSales" },
  { value: "retail", icon: Shirt, labelKey: "industries.retail" },
  { value: "corner_market", icon: Store, labelKey: "industries.cornerMarket" },
  { value: "construction", icon: HardHat, labelKey: "industries.construction" },
  { value: "other", icon: Briefcase, labelKey: "industries.other" },
];

type Step = 1 | 2 | 3;

type ProfileValues = {
  businessName: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  countryCode: string;
  state: string;
  zip: string;
};

export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const profileSchema = useMemo(
    () =>
      z.object({
        businessName: z.string().min(1, t("validation.required")),
        fullName: z.string().min(1, t("validation.required")),
        phone: z.string().min(1, t("validation.required")),
        email: z
          .string()
          .min(1, t("validation.required"))
          .email(t("validation.emailInvalid")),
        city: z.string().min(1, t("validation.required")),
        countryCode: z.string().min(1, t("validation.required")),
        state: z.string().min(1, t("validation.required")),
        zip: z.string(),
      }),
    [t],
  );

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      businessName: "",
      fullName: "",
      phone: "",
      email: "",
      city: "",
      countryCode: "",
      state: "",
      zip: "",
    },
  });

  useEffect(() => {
    let mounted = true;
    const supabase = createBrowserSupabaseClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) {
        return;
      }
      if (!user) {
        router.replace(`/${locale}/login`);
        return;
      }
      setUserId(user.id);
      form.setValue("email", user.email ?? "");
      setLoadingUser(false);
    })();
    return () => {
      mounted = false;
    };
  }, [form, locale, router]);

  const stepTitle =
    step === 1
      ? t("step1.title")
      : step === 2
        ? t("step2.title")
        : t("step3.title");

  async function handleProfileSubmit(values: ProfileValues) {
    if (!industry || !userId) {
      setSubmitError(t("errors.missingIndustry"));
      return;
    }

    setSubmitError(null);
    const supabase = createBrowserSupabaseClient();

    const languagePreference: Language = locale === "es" ? "es" : "en";

    const country = getCountryByCode(values.countryCode);
    if (!country) {
      setSubmitError(t("errors.saveFailed"));
      return;
    }

    const { error } = await supabase.from("business_profiles").insert({
      user_id: userId,
      business_name: values.businessName,
      owner_name: values.fullName,
      phone: values.phone,
      email: values.email,
      city: values.city,
      state_province: values.state,
      zip_code: values.zip || null,
      country_code: country.code,
      currency_code: country.currencyCode,
      currency_symbol: country.currencySymbol,
      industry,
      language_preference: languagePreference,
      onboarding_completed: true,
    });

    if (error) {
      setSubmitError(t("errors.saveFailed"));
      return;
    }

    setStep(3);
  }

  if (loadingUser) {
    return (
      <div className="flex min-h-screen min-h-dvh items-center justify-center bg-[#0A0A0A] px-4">
        <p className="text-sm text-[#A3A3A3]">{t("loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] px-4 py-8">
      <div className="mx-auto flex w-full max-w-[400px] flex-col gap-6">
        {step < 3 ? (
          <>
            <div className="flex justify-center gap-2">
              {[1, 2, 3].map((dot) => (
                <span
                  key={dot}
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    dot === step ? "bg-[#F26522]" : "bg-white/20",
                  )}
                />
              ))}
            </div>
            <h1 className="text-center text-2xl font-bold text-white">{stepTitle}</h1>
          </>
        ) : null}

        {step === 1 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {INDUSTRIES.map((item) => {
                const Icon = item.icon;
                const selected = industry === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setIndustry(item.value)}
                    className={cn(
                      "flex h-24 flex-col items-center justify-center gap-2 rounded-lg border bg-[#1A1A1A] px-2 text-center transition-colors",
                      selected
                        ? "border-[#F26522] text-white"
                        : "border-white/10 text-[#A3A3A3] hover:border-white/30",
                    )}
                  >
                    <Icon className={cn("h-5 w-5", selected ? "text-[#F26522]" : "text-[#A3A3A3]")} />
                    <span className="text-xs font-medium leading-tight">
                      {t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
            <Button
              type="button"
              disabled={!industry}
              onClick={() => setStep(2)}
              className="h-11 w-full rounded-md border-0 bg-[#F26522] text-white hover:bg-[#F26522]/90 disabled:opacity-40"
            >
              {t("continue")}
            </Button>
          </div>
        ) : null}

        {step === 2 ? (
          <form className="space-y-4" onSubmit={form.handleSubmit(handleProfileSubmit)} noValidate>
            <div className="space-y-1.5">
              <label className="text-sm text-[#A3A3A3]" htmlFor="businessName">
                {t("step2.businessName")}
              </label>
              <input
                id="businessName"
                className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
                {...form.register("businessName")}
              />
              {form.formState.errors.businessName ? (
                <p className="text-sm text-[#EF4444]">{form.formState.errors.businessName.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#A3A3A3]" htmlFor="fullName">
                {t("step2.fullName")}
              </label>
              <input
                id="fullName"
                className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
                {...form.register("fullName")}
              />
              {form.formState.errors.fullName ? (
                <p className="text-sm text-[#EF4444]">{form.formState.errors.fullName.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#A3A3A3]" htmlFor="phone">
                {t("step2.phone")}
              </label>
              <input
                id="phone"
                className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
                {...form.register("phone")}
              />
              {form.formState.errors.phone ? (
                <p className="text-sm text-[#EF4444]">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#A3A3A3]" htmlFor="email">
                {t("step2.email")}
              </label>
              <input
                id="email"
                type="email"
                className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="text-sm text-[#EF4444]">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#A3A3A3]" htmlFor="city">
                {t("step2.city")}
              </label>
              <input
                id="city"
                className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
                {...form.register("city")}
              />
              {form.formState.errors.city ? (
                <p className="text-sm text-[#EF4444]">{form.formState.errors.city.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm text-[#A3A3A3]" htmlFor="countryCode">
                {t("step2.country")}
              </label>
              <CountrySelect
                id="countryCode"
                placeholder={t("step2.countryPlaceholder")}
                value={form.watch("countryCode")}
                onChange={(code) =>
                  form.setValue("countryCode", code, { shouldValidate: true })
                }
                aria-invalid={Boolean(form.formState.errors.countryCode)}
              />
              {form.formState.errors.countryCode ? (
                <p className="text-sm text-[#EF4444]">
                  {form.formState.errors.countryCode.message}
                </p>
              ) : null}
            </div>

            {form.watch("countryCode") ? (
              <div className="space-y-1.5">
                <label className="text-sm text-[#A3A3A3]" htmlFor="state">
                  {t("step2.stateProvince")}
                </label>
                <input
                  id="state"
                  className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
                  placeholder={t("step2.stateProvincePlaceholder")}
                  {...form.register("state")}
                />
                {form.formState.errors.state ? (
                  <p className="text-sm text-[#EF4444]">{form.formState.errors.state.message}</p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <label className="text-sm text-[#A3A3A3]" htmlFor="zip">
                {t("step2.zip")}
              </label>
              <input
                id="zip"
                className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
                {...form.register("zip")}
              />
            </div>

            {submitError ? (
              <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
                {submitError}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="h-11 w-full rounded-md border-0 bg-[#F26522] text-white hover:bg-[#F26522]/90 disabled:opacity-40"
            >
              {t("continue")}
            </Button>
          </form>
        ) : null}

        {step === 3 ? (
          <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-6 text-center">
            <h2 className="text-2xl font-bold text-white">{t("step3.title")}</h2>
            <p className="mt-2 text-sm text-[#A3A3A3]">{t("step3.subtitle")}</p>
            <Button
              type="button"
              className="mt-6 h-11 w-full rounded-md border-0 bg-[#F26522] text-white hover:bg-[#F26522]/90"
              onClick={() => router.push(`/${locale}/dashboard`)}
            >
              {t("step3.goToDashboard")}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
