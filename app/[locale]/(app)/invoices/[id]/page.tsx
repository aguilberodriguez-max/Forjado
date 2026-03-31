import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { InvoiceDetailActions } from "@/components/invoices/invoice-detail-actions";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { InvoiceStatus, LineItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

type Props = { params: Promise<{ locale: string; id: string }> };

type InvoiceDetailRow = {
  id: string;
  invoice_number: string;
  status: InvoiceStatus;
  line_items: LineItem[] | null;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  due_date: string;
  public_token: string;
  client: {
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
};

export default async function InvoiceDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations("invoiceDetail");
  const statusT = await getTranslations("invoices.status");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data } = await supabase
    .from("invoices")
    .select(
      "id,invoice_number,status,line_items,subtotal,tax_rate,tax_amount,total,due_date,public_token,client:clients(*)",
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  const invoice = data as InvoiceDetailRow | null;
  if (!invoice) redirect(`/${locale}/invoices`);

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("business_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const items = invoice.line_items ?? [];

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] px-4 py-4 text-white">
      <div className="mx-auto w-full max-w-[400px] space-y-4">
        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{invoice.invoice_number}</h1>
            <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs capitalize text-[#A3A3A3]">{statusT(invoice.status)}</span>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="text-sm font-medium text-[#A3A3A3]">{t("client")}</h2>
          <p className="mt-1 text-base font-semibold">{invoice.client?.name ?? "—"}</p>
          <p className="mt-1 text-sm text-[#A3A3A3]">{invoice.client?.phone ?? "—"}</p>
          <p className="text-sm text-[#A3A3A3]">{invoice.client?.email ?? "—"}</p>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="mb-2 text-sm font-medium text-[#A3A3A3]">{t("lineItems")}</h2>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="rounded-md border border-white/10 p-2">
                <p className="text-sm font-medium">{item.description}</p>
                <div className="mt-1 flex justify-between text-xs text-[#A3A3A3]">
                  <span>
                    {item.quantity} x {formatCurrency(Number(item.unit_price ?? 0))}
                  </span>
                  <span>{formatCurrency(Number(item.line_total ?? 0))}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4 text-sm">
          <p className="mb-2 text-[#A3A3A3]">{t("dueDate")}: {new Date(invoice.due_date).toLocaleDateString(locale)}</p>
          <div className="flex justify-between"><span className="text-[#A3A3A3]">{t("subtotal")}</span><span>{formatCurrency(Number(invoice.subtotal ?? 0))}</span></div>
          <div className="mt-1 flex justify-between"><span className="text-[#A3A3A3]">{t("tax")}</span><span>{formatCurrency(Number(invoice.tax_amount ?? 0))}</span></div>
          <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-semibold"><span>{t("total")}</span><span>{formatCurrency(Number(invoice.total ?? 0))}</span></div>
        </section>

        <InvoiceDetailActions
          invoiceId={invoice.id}
          status={invoice.status}
          invoiceNumber={invoice.invoice_number}
          clientName={invoice.client?.name ?? ""}
          clientPhone={invoice.client?.phone ?? ""}
          dueDate={invoice.due_date}
          total={Number(invoice.total ?? 0)}
          publicToken={invoice.public_token}
          businessName={profile?.business_name ?? "Forjado"}
          lineItems={invoice.line_items ?? []}
          taxRate={Number(invoice.tax_rate ?? 0)}
        />
      </div>
    </div>
  );
}
