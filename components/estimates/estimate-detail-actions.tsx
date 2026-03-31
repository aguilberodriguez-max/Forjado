"use client";

import { addDays, format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MoneyFormat } from "@/lib/money";
import type { LineItem, SendChannel } from "@/types";
import { formatCurrency } from "@/lib/utils";

type EstimateDetailActionsProps = {
  estimateId: string;
  userId: string;
  clientId: string;
  estimateNumber: string;
  total: number;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  notesClient?: string | null;
  publicToken: string;
  money: MoneyFormat;
};

export function EstimateDetailActions({
  estimateId,
  userId,
  clientId,
  estimateNumber,
  total,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  notesClient,
  publicToken,
  money,
}: EstimateDetailActionsProps) {
  const t = useTranslations("estimateDetail");
  const locale = useLocale();
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [isSending, setIsSending] = useState<SendChannel | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleConvertToInvoice() {
    setActionError(null);
    setIsConverting(true);
    const supabase = createBrowserSupabaseClient();
    const dueDate = format(addDays(new Date(), 15), "yyyy-MM-dd");
    const invoiceNumber = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        client_id: clientId,
        estimate_id: estimateId,
        invoice_number: invoiceNumber,
        status: "draft",
        line_items: lineItems,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes_client: notesClient ?? null,
        due_date: dueDate,
        public_token: crypto.randomUUID(),
      })
      .select("id")
      .single();

    if (invoiceError || !invoice) {
      setIsConverting(false);
      setActionError(t("errors.convertFailed"));
      return;
    }

    const { error: estimateError } = await supabase
      .from("estimates")
      .update({ converted_to_invoice_id: invoice.id })
      .eq("id", estimateId);

    setIsConverting(false);
    if (estimateError) {
      setActionError(t("errors.convertFailed"));
      return;
    }

    router.push(`/${locale}/invoices/${invoice.id}`);
    router.refresh();
  }

  async function markSent(via: SendChannel) {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("estimates")
      .update({ status: "sent", sent_via: via, sent_at: new Date().toISOString() })
      .eq("id", estimateId);
    return error;
  }

  async function handleSend(via: SendChannel) {
    setActionError(null);
    setIsSending(via);
    const appBase = typeof window !== "undefined" ? window.location.origin : "";
    const publicUrl = `${appBase}/${locale}/e/${publicToken}`;
    const currencyTotal = formatCurrency(total, money);
    const text = `${estimateNumber} - ${currencyTotal}\n${publicUrl}`;

    try {
      if (via === "whatsapp") {
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
      } else if (via === "sms") {
        window.open(`sms:?body=${encodeURIComponent(text)}`, "_self");
      } else if (via === "email") {
        const subject = `${t("sendSheet.emailSubject")} ${estimateNumber}`;
        window.open(
          `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
          "_self",
        );
      } else if (via === "link") {
        await navigator.clipboard.writeText(publicUrl);
      }

      const updateError = await markSent(via);
      if (updateError) {
        setActionError(t("errors.sendFailed"));
      } else {
        setShowSheet(false);
        router.refresh();
      }
    } catch {
      setActionError(t("errors.sendFailed"));
    } finally {
      setIsSending(null);
    }
  }

  return (
    <>
      {actionError ? (
        <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
          {actionError}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-11 rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void handleConvertToInvoice()}
          disabled={isConverting || Boolean(isSending)}
        >
          {isConverting ? t("loading.convert") : t("convertToInvoice")}
        </button>
        <button
          type="button"
          className="h-11 rounded-md border border-[#F26522] text-sm font-medium text-[#F26522] disabled:opacity-50"
          onClick={() => setShowSheet(true)}
          disabled={isConverting || Boolean(isSending)}
        >
          {t("send")}
        </button>
      </div>

      {showSheet ? (
        <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setShowSheet(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[400px] rounded-t-xl border border-white/10 bg-[#1A1A1A] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold">{t("sendSheet.title")}</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("whatsapp")}
                disabled={Boolean(isSending)}
              >
                {isSending === "whatsapp" ? t("loading.send") : t("sendSheet.whatsapp")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("sms")}
                disabled={Boolean(isSending)}
              >
                {isSending === "sms" ? t("loading.send") : t("sendSheet.sms")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("email")}
                disabled={Boolean(isSending)}
              >
                {isSending === "email" ? t("loading.send") : t("sendSheet.email")}
              </button>
              <button
                type="button"
                className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("link")}
                disabled={Boolean(isSending)}
              >
                {isSending === "link" ? t("loading.send") : t("sendSheet.copyLink")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
