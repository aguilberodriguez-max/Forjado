"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CountrySelect } from "@/components/forms/country-select";
import { Button } from "@/components/ui/button";
import { countryDisplayName, getCountryByCode } from "@/lib/countries";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Initial = {
  business_name: string;
  owner_name: string;
  phone: string;
  email: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country_code: string | null;
};

type Props = {
  userId: string;
  initial: Initial;
};

type FormValues = {
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  city: string;
  countryCode: string;
  state: string;
  zip: string;
};

export function BusinessProfileForm({ userId, initial }: Props) {
  const t = useTranslations("settingsPage.businessProfileForm");
  const to = useTranslations("onboarding");
  const locale = useLocale();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        businessName: z.string().min(1, to("validation.required")),
        ownerName: z.string().min(1, to("validation.required")),
        phone: z.string().min(1, to("validation.required")),
        email: z.string().min(1, to("validation.required")).email(to("validation.emailInvalid")),
        city: z.string().min(1, to("validation.required")),
        countryCode: z.string().min(1, to("validation.required")),
        state: z.string().min(1, to("validation.required")),
        zip: z.string(),
      }),
    [to],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessName: initial.business_name,
      ownerName: initial.owner_name,
      phone: initial.phone,
      email: initial.email,
      city: initial.city ?? "",
      countryCode: initial.country_code ?? "",
      state: initial.state ?? "",
      zip: initial.zip_code ?? "",
    },
  });

  async function onSubmit(values: FormValues) {
    setError(null);
    const country = getCountryByCode(values.countryCode);
    if (!country) {
      setError(t("saveError"));
      return;
    }
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({
        business_name: values.businessName,
        owner_name: values.ownerName,
        phone: values.phone,
        email: values.email,
        city: values.city,
        state: values.state,
        zip_code: values.zip || null,
        country_code: country.code,
        currency_code: country.currencyCode,
        currency_symbol: country.currencySymbol,
      })
      .eq("user_id", userId);

    if (updateError) {
      setError(t("saveError"));
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const countryMeta = initial.country_code
    ? getCountryByCode(initial.country_code)
    : undefined;
  const countryLine = countryMeta ? countryDisplayName(countryMeta, locale) : "—";

  if (!editing) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-[#A3A3A3]">{t("title")}</h2>
          <button
            type="button"
            className="text-sm text-[#F26522]"
            onClick={() => setEditing(true)}
          >
            {t("edit")}
          </button>
        </div>
        <p className="text-sm">{initial.business_name || "—"}</p>
        <p className="text-sm text-[#A3A3A3]">{initial.owner_name || "—"}</p>
        <p className="text-sm text-[#A3A3A3]">{initial.phone || "—"}</p>
        <p className="text-sm text-[#A3A3A3]">{initial.email || "—"}</p>
        <p className="text-sm text-[#A3A3A3]">
          {[initial.city, initial.state].filter(Boolean).join(", ") || "—"}
        </p>
        <p className="text-sm text-[#A3A3A3]">{countryLine}</p>
        {initial.zip_code ? (
          <p className="text-sm text-[#A3A3A3]">{initial.zip_code}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#A3A3A3]">{t("title")}</h2>
        <button type="button" className="text-sm text-[#A3A3A3]" onClick={() => setEditing(false)}>
          {t("cancel")}
        </button>
      </div>
      {error ? (
        <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
          {error}
        </p>
      ) : null}
      <div className="space-y-1.5">
        <label className="text-xs text-[#A3A3A3]" htmlFor="bp-business">
          {to("step2.businessName")}
        </label>
        <input
          id="bp-business"
          className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
          {...form.register("businessName")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#A3A3A3]" htmlFor="bp-owner">
          {to("step2.fullName")}
        </label>
        <input
          id="bp-owner"
          className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
          {...form.register("ownerName")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#A3A3A3]" htmlFor="bp-phone">
          {to("step2.phone")}
        </label>
        <input
          id="bp-phone"
          className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
          {...form.register("phone")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#A3A3A3]" htmlFor="bp-email">
          {to("step2.email")}
        </label>
        <input
          id="bp-email"
          type="email"
          className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
          {...form.register("email")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#A3A3A3]" htmlFor="bp-city">
          {to("step2.city")}
        </label>
        <input
          id="bp-city"
          className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
          {...form.register("city")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-[#A3A3A3]" htmlFor="bp-country">
          {to("step2.country")}
        </label>
        <CountrySelect
          id="bp-country"
          placeholder={to("step2.countryPlaceholder")}
          value={form.watch("countryCode")}
          onChange={(code) => form.setValue("countryCode", code, { shouldValidate: true })}
        />
      </div>
      {form.watch("countryCode") ? (
        <div className="space-y-1.5">
          <label className="text-xs text-[#A3A3A3]" htmlFor="bp-state">
            {to("step2.stateProvince")}
          </label>
          <input
            id="bp-state"
            className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
            placeholder={to("step2.stateProvincePlaceholder")}
            {...form.register("state")}
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label className="text-xs text-[#A3A3A3]" htmlFor="bp-zip">
          {to("step2.zip")}
        </label>
        <input
          id="bp-zip"
          className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
          {...form.register("zip")}
        />
      </div>
      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-10 w-full rounded-md border-0 bg-[#F26522] text-sm text-white hover:bg-[#F26522]/90"
      >
        {form.formState.isSubmitting ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
