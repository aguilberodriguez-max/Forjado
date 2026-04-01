import { redirect } from "next/navigation";

import { EstimatesListClient } from "@/components/estimates/estimates-list-client";
import { moneyFromBusinessProfile } from "@/lib/money";
import { unwrapEmbeddedOne } from "@/lib/supabase/embedded-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { EstimateStatus } from "@/types";

type EstimatesPageProps = {
  params: Promise<{ locale: string }>;
};

type EstimateRow = {
  id: string;
  estimate_number: string;
  created_at: string;
  total: number;
  status: EstimateStatus;
  client: { name: string } | { name: string }[] | null;
};

export default async function EstimatesPage({ params }: EstimatesPageProps) {
  const { locale } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [estimateRes, profileRes] = await Promise.all([
    supabase
      .from("estimates")
      .select("id,estimate_number,created_at,total,status,client:clients(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("business_profiles")
      .select("currency_code,currency_symbol")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const estimateRows = estimateRes.data;
  const money = moneyFromBusinessProfile(profileRes.data);

  const rows = (estimateRows ?? []) as EstimateRow[];

  const estimates = rows.map((row) => ({
    id: row.id,
    clientName: unwrapEmbeddedOne(row.client)?.name ?? "—",
    estimateNumber: row.estimate_number,
    createdAt: row.created_at,
    total: Number(row.total ?? 0),
    status: row.status,
  }));

  return <EstimatesListClient estimates={estimates} money={money} />;
}
