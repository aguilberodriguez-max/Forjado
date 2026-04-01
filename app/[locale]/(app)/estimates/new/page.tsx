import { redirect } from "next/navigation";

import { NewEstimateForm } from "@/components/estimates/new-estimate-form";
import { getCountryByCode } from "@/lib/countries";
import { moneyFromBusinessProfile } from "@/lib/money";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Industry } from "@/types";

type NewEstimatePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewEstimatePage({ params }: NewEstimatePageProps) {
  const { locale } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [clientsResult, profileResult] = await Promise.all([
    supabase
      .from("clients")
      .select("id,name,email,phone")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false }),
    supabase
      .from("business_profiles")
      .select(
        "business_name,logo_url,street_address,city,state,state_province,zip_code,country_code,industry,default_tax_rate,currency_code,currency_symbol",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const profile = profileResult.data;
  const industry = (profile?.industry ?? "other") as Industry;
  const defaultTaxRate = Number(profile?.default_tax_rate ?? 0);
  const money = moneyFromBusinessProfile(profile);

  const countryMeta = profile?.country_code ? getCountryByCode(profile.country_code) : undefined;
  const countryLabel =
    countryMeta && locale.startsWith("es") ? countryMeta.nameEs : countryMeta?.nameEn;

  const businessAddressLines: string[] = [];
  if (profile?.street_address?.trim()) {
    businessAddressLines.push(profile.street_address.trim());
  }
  const region = profile?.state_province ?? profile?.state;
  const cityLine = [profile?.city, region, profile?.zip_code].filter(Boolean).join(", ");
  if (cityLine) {
    businessAddressLines.push(cityLine);
  }
  if (countryLabel) {
    businessAddressLines.push(countryLabel);
  }

  return (
    <NewEstimateForm
      userId={user.id}
      industry={industry}
      clients={clientsResult.data ?? []}
      defaultTaxRate={defaultTaxRate}
      money={money}
      businessName={profile?.business_name?.trim() || "—"}
      businessAddressLines={businessAddressLines}
      logoUrl={profile?.logo_url?.trim() || null}
    />
  );
}
