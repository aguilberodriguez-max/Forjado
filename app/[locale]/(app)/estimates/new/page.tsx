import { redirect } from "next/navigation";

import { NewEstimateForm } from "@/components/estimates/new-estimate-form";
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
      .select("industry,default_tax_rate,country_code,currency_code,currency_symbol")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const industry = (profileResult.data?.industry ?? "other") as Industry;
  const defaultTaxRate = Number(profileResult.data?.default_tax_rate ?? 0);
  const money = moneyFromBusinessProfile(profileResult.data);
  const defaultCountryCode = profileResult.data?.country_code ?? "US";

  return (
    <NewEstimateForm
      userId={user.id}
      industry={industry}
      clients={clientsResult.data ?? []}
      defaultTaxRate={defaultTaxRate}
      money={money}
      defaultCountryCode={defaultCountryCode}
    />
  );
}
