import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { EstimateDetailActions } from "@/components/estimates/estimate-detail-actions";
import { getCountryByCode } from "@/lib/countries";
import { moneyFromBusinessProfile } from "@/lib/money";
import { unwrapEmbeddedOne } from "@/lib/supabase/embedded-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EstimateStatus, LineItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

type EstimateDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

type LineItemRow = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type EstimateDetailRow = {
  id: string;
  user_id: string;
  client_id: string;
  estimate_number: string;
  status: EstimateStatus;
  line_items: LineItemRow[] | LineItem[] | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  notes_client?: string | null;
  public_token: string;
  valid_until?: string | null;
  client:
    | {
        name: string;
        email: string | null;
        phone: string | null;
      }
    | Array<{
        name: string;
        email: string | null;
        phone: string | null;
      }>
    | null;
};

export default async function EstimateDetailPage({ params }: EstimateDetailPageProps) {
  const { locale, id } = await params;
  const t = await getTranslations("estimateDetail");
  const statusT = await getTranslations("estimates.status");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data } = await supabase
    .from("estimates")
    .select(
      "id,user_id,client_id,estimate_number,status,line_items,subtotal,tax_rate,tax_amount,total,notes_client,public_token,valid_until,client:clients(name,email,phone)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const estimate = data as EstimateDetailRow | null;

  if (!estimate) {
    redirect(`/${locale}/estimates`);
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select(
      "business_name,logo_url,street_address,city,state,state_province,zip_code,country_code,currency_code,currency_symbol",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const money = moneyFromBusinessProfile(profile);

  const countryMeta = profile?.country_code
    ? getCountryByCode(profile.country_code)
    : undefined;
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

  const lineItems = estimate.line_items ?? [];
  const client = unwrapEmbeddedOne(estimate.client);

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] px-4 py-4 text-white">
      <div className="mx-auto w-full max-w-[400px] space-y-4">
        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{estimate.estimate_number}</h1>
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs capitalize text-[#A3A3A3]">
              {statusT(estimate.status)}
            </span>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="text-sm font-medium text-[#A3A3A3]">{t("client")}</h2>
          <p className="mt-1 text-base font-semibold">{client?.name ?? "—"}</p>
          <p className="mt-1 text-sm text-[#A3A3A3]">{client?.phone ?? "—"}</p>
          <p className="text-sm text-[#A3A3A3]">{client?.email ?? "—"}</p>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="mb-2 text-sm font-medium text-[#A3A3A3]">{t("lineItems")}</h2>
          <div className="space-y-2">
            {lineItems.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 p-2">
                <p className="text-sm font-medium">{item.description}</p>
                <div className="mt-1 flex justify-between text-xs text-[#A3A3A3]">
                  <span>
                    {item.quantity} x {formatCurrency(Number(item.unit_price ?? 0), money)}
                  </span>
                  <span>{formatCurrency(Number(item.line_total ?? 0), money)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-[#A3A3A3]">{t("subtotal")}</span>
            <span>{formatCurrency(Number(estimate.subtotal ?? 0), money)}</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span className="text-[#A3A3A3]">{t("tax")}</span>
            <span>{formatCurrency(Number(estimate.tax_amount ?? 0), money)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-semibold">
            <span>{t("total")}</span>
            <span>{formatCurrency(Number(estimate.total ?? 0), money)}</span>
          </div>
        </section>

        <EstimateDetailActions
          estimateId={estimate.id}
          userId={estimate.user_id}
          clientId={estimate.client_id}
          estimateNumber={estimate.estimate_number}
          status={estimate.status}
          total={Number(estimate.total ?? 0)}
          lineItems={(estimate.line_items ?? []) as LineItem[]}
          subtotal={Number(estimate.subtotal ?? 0)}
          taxRate={Number(estimate.tax_rate ?? 0)}
          taxAmount={Number(estimate.tax_amount ?? 0)}
          notesClient={estimate.notes_client ?? null}
          publicToken={estimate.public_token}
          money={money}
          businessName={profile?.business_name?.trim() || "—"}
          businessAddressLines={businessAddressLines}
          logoUrl={profile?.logo_url?.trim() || null}
          clientName={client?.name ?? "—"}
          clientEmail={client?.email ?? null}
          clientPhone={client?.phone ?? null}
          validUntil={estimate.valid_until ?? null}
        />
      </div>
    </div>
  );
}
