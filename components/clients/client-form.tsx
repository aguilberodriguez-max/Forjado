"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CountrySelect } from "@/components/forms/country-select";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Props = {
  mode: "create" | "edit";
  locale: string;
  userId: string;
  defaultCountryCode: string;
  clientId?: string;
  initial?: {
    name: string;
    phone: string | null;
    email: string | null;
    street_address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country_code: string | null;
  };
};

type FormSchema = z.infer<ReturnType<typeof buildSchema>>;

function buildSchema(to: (key: string) => string) {
  return z.object({
    name: z.string().min(1, to("validation.required")),
    phone: z.string().optional(),
    email: z
      .string()
      .refine((val) => val === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
        message: to("validation.emailInvalid"),
      }),
    street: z.string().optional(),
    city: z.string().optional(),
    countryCode: z.string().min(1, to("validation.required")),
    state: z.string().optional(),
    zip: z.string().optional(),
  });
}

export function ClientForm({
  mode,
  locale,
  userId,
  defaultCountryCode,
  clientId,
  initial,
}: Props) {
  const t = useTranslations("clients.clientForm");
  const to = useTranslations("onboarding");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(() => buildSchema(to), [to]);

  const form = useForm<FormSchema>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: initial?.name ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      street: initial?.street_address ?? "",
      city: initial?.city ?? "",
      countryCode: initial?.country_code ?? defaultCountryCode,
      state: initial?.state ?? "",
      zip: initial?.zip_code ?? "",
    },
  });

  async function onSubmit(values: FormSchema) {
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const payload = {
      user_id: userId,
      name: values.name.trim(),
      phone: values.phone?.trim() || null,
      email: values.email?.trim() || null,
      street_address: values.street?.trim() || null,
      city: values.city?.trim() || null,
      state: values.state?.trim() || null,
      zip_code: values.zip?.trim() || null,
      country_code: values.countryCode.trim() || null,
      is_archived: false,
    };

    if (mode === "create") {
      const { error: insertError } = await supabase.from("clients").insert(payload);
      if (insertError) {
        setError(t("saveError"));
        return;
      }
      router.replace(`/${locale}/clients`);
      router.refresh();
      return;
    }

    if (!clientId) {
      return;
    }
    const { error: updateError } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", clientId)
      .eq("user_id", userId);
    if (updateError) {
      setError(t("saveError"));
      return;
    }
    router.replace(`/${locale}/clients`);
    router.refresh();
  }

  return (
    <form className="mx-auto w-full max-w-[400px] space-y-4 px-4 py-4" onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <h1 className="text-xl font-semibold">{mode === "create" ? t("newTitle") : t("editTitle")}</h1>
      {error ? (
        <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
          {error}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm text-[#A3A3A3]" htmlFor="c-name">
          {t("name")}
        </label>
        <input
          id="c-name"
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
          {...form.register("name")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-[#A3A3A3]" htmlFor="c-phone">
          {t("phone")}
        </label>
        <input
          id="c-phone"
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
          {...form.register("phone")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-[#A3A3A3]" htmlFor="c-email">
          {t("email")}
        </label>
        <input
          id="c-email"
          type="email"
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
          {...form.register("email")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-[#A3A3A3]" htmlFor="c-street">
          {t("street")}
        </label>
        <input
          id="c-street"
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
          {...form.register("street")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-[#A3A3A3]" htmlFor="c-city">
          {to("step2.city")}
        </label>
        <input
          id="c-city"
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
          {...form.register("city")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm text-[#A3A3A3]" htmlFor="c-country">
          {to("step2.country")}
        </label>
        <CountrySelect
          id="c-country"
          placeholder={to("step2.countryPlaceholder")}
          value={form.watch("countryCode")}
          onChange={(code) => form.setValue("countryCode", code, { shouldValidate: true })}
        />
      </div>
      {form.watch("countryCode") ? (
        <div className="space-y-1.5">
          <label className="text-sm text-[#A3A3A3]" htmlFor="c-state">
            {to("step2.stateProvince")}
          </label>
          <input
            id="c-state"
            className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
            placeholder={to("step2.stateProvincePlaceholder")}
            {...form.register("state")}
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <label className="text-sm text-[#A3A3A3]" htmlFor="c-zip">
          {to("step2.zip")}
        </label>
        <input
          id="c-zip"
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
          {...form.register("zip")}
        />
      </div>

      <Button
        type="submit"
        disabled={form.formState.isSubmitting}
        className="h-11 w-full rounded-md border-0 bg-[#F26522] text-white"
      >
        {form.formState.isSubmitting ? t("saving") : t("save")}
      </Button>
    </form>
  );
}
