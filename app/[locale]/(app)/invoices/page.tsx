import { redirect } from "next/navigation";

import { InvoicesListClient } from "@/components/invoices/invoices-list-client";
import { moneyFromBusinessProfile } from "@/lib/money";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceStatus } from "@/types";

type Props = { params: Promise<{ locale: string }> };

type InvoiceRow = {
  id: string;
  invoice_number: string;
  due_date: string;
  total: number;
  status: InvoiceStatus;
  clients: Array<{ name: string }> | null;
};

export default async function InvoicesPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const [invoicesResult, profileResult] = await Promise.all([
    supabase
      .from("invoices")
      .select("id,invoice_number,due_date,total,status,clients(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("business_profiles")
      .select("currency_code,currency_symbol")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const { data } = invoicesResult;
  const money = moneyFromBusinessProfile(profileResult.data);

  const rows = (data ?? []) as InvoiceRow[];
  const invoices = rows.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    clientName: row.clients?.[0]?.name ?? "—",
    dueDate: row.due_date,
    total: Number(row.total ?? 0),
    status: row.status,
  }));

  return <InvoicesListClient invoices={invoices} money={money} />;
}
