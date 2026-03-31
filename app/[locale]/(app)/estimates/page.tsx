import { redirect } from "next/navigation";

import { EstimatesListClient } from "@/components/estimates/estimates-list-client";
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
  clients: Array<{ name: string }> | null;
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

  const { data: estimateRows } = await supabase
    .from("estimates")
    .select("id,estimate_number,created_at,total,status,clients(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (estimateRows ?? []) as EstimateRow[];

  const estimates = rows.map((row) => ({
    id: row.id,
    clientName: row.clients?.[0]?.name ?? "—",
    estimateNumber: row.estimate_number,
    createdAt: row.created_at,
    total: Number(row.total ?? 0),
    status: row.status,
  }));

  return <EstimatesListClient estimates={estimates} />;
}
