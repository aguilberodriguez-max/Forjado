"use client";

import { addDays, format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MoneyFormat } from "@/lib/money";
import type { EstimateStatus, LineItem, SendChannel } from "@/types";
import { formatCurrency } from "@/lib/utils";

type EstimateDetailActionsProps = {
  estimateId: string;
  userId: string;
  clientId: string;
  estimateNumber: string;
  status: EstimateStatus;
  total: number;
  lineItems: LineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  notesClient?: string | null;
  publicToken: string;
  money: MoneyFormat;
  businessName: string;
  businessAddressLines: string[];
  logoUrl?: string | null;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  validUntil: string | null;
};

export function EstimateDetailActions({
  estimateId,
  userId,
  clientId,
  estimateNumber,
  status,
  total,
  lineItems,
  subtotal,
  taxRate,
  taxAmount,
  notesClient,
  publicToken,
  money,
  businessName,
  businessAddressLines,
  logoUrl,
  clientName,
  clientEmail,
  clientPhone,
  validUntil,
}: EstimateDetailActionsProps) {
  const t = useTranslations("estimateDetail");
  const tNew = useTranslations("estimateNew");
  const locale = useLocale();
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);
  const [isSending, setIsSending] = useState<SendChannel | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const validUntilFormatted = useMemo(() => {
    if (!validUntil) {
      return "—";
    }
    try {
      return new Date(validUntil).toLocaleDateString(locale);
    } catch {
      return validUntil;
    }
  }, [validUntil, locale]);

  const clientDetailLines = useMemo(() => {
    return [clientPhone?.trim(), clientEmail?.trim()].filter(Boolean) as string[];
  }, [clientEmail, clientPhone]);

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

  async function handleDeleteSaved() {
    const confirmed = window.confirm(t("deleteSavedConfirm"));
    if (!confirmed) {
      return;
    }
    setActionError(null);
    setIsDeleting(true);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("estimates")
      .delete()
      .eq("id", estimateId)
      .eq("status", "saved");
    setIsDeleting(false);
    if (error) {
      setActionError(t("errors.deleteFailed"));
      return;
    }
    router.push(`/${locale}/estimates`);
    router.refresh();
  }

  async function downloadEstimatePdf() {
    setPdfLoading(true);
    setActionError(null);
    try {
      const [{ pdf }, { EstimatePdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/estimates/estimate-pdf-document"),
      ]);
      const blob = await pdf(
        <EstimatePdfDocument
          logoUrl={logoUrl}
          documentTitle={tNew("pdf.documentTitle")}
          businessName={businessName}
          businessAddressLines={businessAddressLines}
          estimateNumber={estimateNumber}
          clientHeading={tNew("clientSelector.title")}
          clientName={clientName}
          clientDetailLines={clientDetailLines}
          lineItemsHeading={tNew("lineItems.title")}
          lineItems={lineItems}
          subtotal={subtotal}
          taxRate={Number(taxRate || 0)}
          taxAmount={taxAmount}
          total={total}
          money={money}
          subtotalLabel={tNew("summary.subtotal")}
          taxLabel={tNew("summary.tax")}
          totalLabel={tNew("summary.total")}
          validUntilLabel={tNew("validUntil")}
          validUntilFormatted={validUntilFormatted}
          notesLabel={tNew("pdf.notes")}
          notes={notesClient ?? null}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${estimateNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setShowSheet(false);
    } catch {
      setActionError(t("errors.sendFailed"));
    } finally {
      setPdfLoading(false);
    }
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
        setToast(t("sendSheet.linkCopied"));
        window.setTimeout(() => setToast(null), 3500);
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

  const sendDisabled = isConverting || Boolean(isSending) || isDeleting || pdfLoading;

  return (
    <>
      {toast ? (
        <p className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
          {toast}
        </p>
      ) : null}
      {actionError ? (
        <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
          {actionError}
        </p>
      ) : null}
      {status === "saved" ? (
        <button
          type="button"
          className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-red-400/50 bg-red-500/10 text-sm font-medium text-red-300 disabled:opacity-50"
          onClick={() => void handleDeleteSaved()}
          disabled={isDeleting || isConverting || Boolean(isSending) || pdfLoading}
        >
          {isDeleting ? t("loading.delete") : t("deleteSaved")}
        </button>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          className="h-11 rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50"
          onClick={() => void handleConvertToInvoice()}
          disabled={sendDisabled}
        >
          {isConverting ? t("loading.convert") : t("convertToInvoice")}
        </button>
        <button
          type="button"
          className="h-11 rounded-md border border-[#F26522] text-sm font-medium text-[#F26522] disabled:opacity-50"
          onClick={() => setShowSheet(true)}
          disabled={sendDisabled}
        >
          {t("send")}
        </button>
      </div>

      {showSheet ? (
        <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setShowSheet(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[400px] rounded-t-2xl border border-white/10 bg-[#1A1A1A] p-4 pb-8"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-label={t("sendSheet.title")}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t("sendSheet.title")}</h3>
              <button
                type="button"
                className="text-xs text-[#A3A3A3]"
                onClick={() => setShowSheet(false)}
              >
                {tNew("previewModal.close")}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="h-11 w-full rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("whatsapp")}
                disabled={Boolean(isSending)}
              >
                {isSending === "whatsapp" ? t("loading.send") : t("sendSheet.whatsapp")}
              </button>
              <button
                type="button"
                className="h-11 w-full rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("sms")}
                disabled={Boolean(isSending)}
              >
                {isSending === "sms" ? t("loading.send") : t("sendSheet.sms")}
              </button>
              <button
                type="button"
                className="h-11 w-full rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("email")}
                disabled={Boolean(isSending)}
              >
                {isSending === "email" ? t("loading.send") : t("sendSheet.email")}
              </button>
              <button
                type="button"
                className="h-11 w-full rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("link")}
                disabled={Boolean(isSending)}
              >
                {isSending === "link" ? t("loading.send") : t("sendSheet.copyLink")}
              </button>
              <button
                type="button"
                className="h-11 w-full rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void downloadEstimatePdf()}
                disabled={pdfLoading}
              >
                {pdfLoading ? t("loading.pdf") : t("sendSheet.downloadPdf")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
