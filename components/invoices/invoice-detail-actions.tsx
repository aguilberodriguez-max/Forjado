"use client";

import { format } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { InvoiceStatus, LineItem, PaymentMethod, SendChannel } from "@/types";
import { formatCurrency } from "@/lib/utils";

type Props = {
  invoiceId: string;
  status: InvoiceStatus;
  invoiceNumber: string;
  clientName: string;
  clientPhone: string;
  dueDate: string;
  total: number;
  publicToken: string;
  businessName: string;
  lineItems: LineItem[];
  taxRate: number;
};

export function InvoiceDetailActions({
  invoiceId,
  status,
  invoiceNumber,
  clientName,
  clientPhone,
  dueDate,
  total,
  publicToken,
  businessName,
  lineItems,
  taxRate,
}: Props) {
  const t = useTranslations("invoiceDetail");
  const locale = useLocale();
  const [currentStatus, setCurrentStatus] = useState<InvoiceStatus>(status);
  const [open, setOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState<SendChannel | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableDueDate, setEditableDueDate] = useState(dueDate.slice(0, 10));
  const [editableTaxRate, setEditableTaxRate] = useState(taxRate);
  const [editableItems, setEditableItems] = useState<LineItem[]>(lineItems);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const subtotal = editableItems.reduce((sum, row) => sum + Number(row.line_total ?? 0), 0);
  const taxAmount = subtotal * (Number(editableTaxRate || 0) / 100);
  const computedTotal = subtotal + taxAmount;

  async function saveDraftEdits() {
    setError(null);
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        line_items: editableItems,
        due_date: editableDueDate,
        tax_rate: editableTaxRate,
        subtotal,
        tax_amount: taxAmount,
        total: computedTotal,
      })
      .eq("id", invoiceId)
      .eq("status", "draft");
    setLoading(false);
    if (updateError) {
      setError(t("errors.saveEdit"));
      return;
    }
    setIsEditing(false);
    window.location.reload();
  }

  async function markPaid() {
    setError(null);
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "paid",
        paid_at: new Date(paymentDate).toISOString(),
        payment_method: paymentMethod,
      })
      .eq("id", invoiceId);
    setLoading(false);
    if (updateError) {
      setError(t("errors.markPaid"));
      return;
    }
    setOpen(false);
    setCurrentStatus("paid");
    window.location.reload();
  }

  function updateItem(index: number, field: keyof LineItem, value: string) {
    setEditableItems((prev) => {
      const next = [...prev];
      const current = { ...next[index] };
      if (field === "description") {
        current.description = value;
      } else if (field === "quantity") {
        current.quantity = Number(value || 0);
      } else if (field === "unit_price") {
        current.unit_price = Number(value || 0);
      }
      current.line_total = Number(current.quantity) * Number(current.unit_price);
      next[index] = current;
      return next;
    });
  }

  async function markSent(via: SendChannel) {
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("invoices")
      .update({ status: "sent", sent_via: via, sent_at: new Date().toISOString() })
      .eq("id", invoiceId);
    return updateError;
  }

  async function handleSend(via: SendChannel) {
    setError(null);
    setSendLoading(via);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const dueLabel = new Date(editableDueDate).toLocaleDateString(locale);
    const totalLabel = formatCurrency(computedTotal || total);
    const publicUrl = `${origin}/${locale}/i/${publicToken}`;
    const message = `${clientName}, ${businessName}: ${invoiceNumber} • ${totalLabel} • ${t(
      "dueDate",
    )}: ${dueLabel}\n${publicUrl}`;
    try {
      if (via === "whatsapp") {
        const digits = clientPhone.replace(/\D/g, "");
        window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank");
      } else if (via === "sms") {
        const digits = clientPhone.replace(/\D/g, "");
        window.open(`sms:${digits}?body=${encodeURIComponent(message)}`, "_self");
      } else if (via === "link") {
        await navigator.clipboard.writeText(publicUrl);
        setToast(t("sendSheet.linkCopied"));
        setTimeout(() => setToast(null), 2000);
      }

      const updateError = await markSent(via);
      if (updateError) {
        setError(t("errors.sendInvoice"));
      } else {
        setSendOpen(false);
        setCurrentStatus("sent");
        window.location.reload();
      }
    } catch {
      setError(t("errors.sendInvoice"));
    } finally {
      setSendLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {toast ? (
        <p className="rounded-md border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2 text-sm text-[#22C55E]">
          {toast}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
          {error}
        </p>
      ) : null}
      {currentStatus === "draft" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              className="h-11 rounded-md border border-[#F26522] text-sm font-medium text-[#F26522]"
              onClick={() => setIsEditing((prev) => !prev)}
              disabled={loading || Boolean(sendLoading)}
            >
              {isEditing ? t("cancelEdit") : t("edit")}
            </button>
            <button
              className="h-11 rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50"
              onClick={() => setSendOpen(true)}
              disabled={loading || Boolean(sendLoading)}
            >
              {t("sendInvoice")}
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-3 rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
              {editableItems.map((item, index) => (
                <div key={item.id} className="rounded-md border border-white/10 p-2">
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    className="mb-2 h-9 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-2 text-sm text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      className="h-9 rounded-md border border-white/10 bg-[#0A0A0A] px-2 text-sm text-white"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                      className="h-9 rounded-md border border-white/10 bg-[#0A0A0A] px-2 text-sm text-white"
                    />
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs text-[#A3A3A3]">{t("dueDate")}</label>
                  <input
                    type="date"
                    value={editableDueDate}
                    onChange={(e) => setEditableDueDate(e.target.value)}
                    className="h-9 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-[#A3A3A3]">{t("taxRate")}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editableTaxRate}
                    onChange={(e) => setEditableTaxRate(Number(e.target.value || 0))}
                    className="h-9 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-2 text-sm text-white"
                  />
                </div>
              </div>
              <button
                className="h-10 w-full rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50"
                onClick={() => void saveDraftEdits()}
                disabled={loading}
              >
                {loading ? t("loading.saveEdit") : t("saveEdit")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {currentStatus === "sent" || currentStatus === "overdue" ? (
        <div className="grid grid-cols-2 gap-3">
          <button
            className="h-11 rounded-md border border-[#F26522] text-sm font-medium text-[#F26522] disabled:opacity-50"
            onClick={() => setSendOpen(true)}
            disabled={loading || Boolean(sendLoading)}
          >
            {sendLoading ? t("loading.send") : t("sendReminder")}
          </button>
          <button
            className="h-11 rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50"
            onClick={() => setOpen(true)}
            disabled={loading || Boolean(sendLoading)}
          >
            {loading ? t("markPaidSheet.confirming") : t("markPaid")}
          </button>
        </div>
      ) : null}
      {currentStatus === "paid" ? (
        <button className="h-11 w-full rounded-md border border-[#F26522] text-sm font-medium text-[#F26522]">
          {t("downloadPdf")}
        </button>
      ) : null}

      {sendOpen ? (
        <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setSendOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[400px] rounded-t-xl border border-white/10 bg-[#1A1A1A] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold">{t("sendSheet.title")}</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("whatsapp")}
                disabled={Boolean(sendLoading)}
              >
                {sendLoading === "whatsapp" ? t("loading.send") : t("sendSheet.whatsapp")}
              </button>
              <button
                className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("sms")}
                disabled={Boolean(sendLoading)}
              >
                {sendLoading === "sms" ? t("loading.send") : t("sendSheet.sms")}
              </button>
              <button
                className="col-span-2 h-10 rounded-md border border-white/10 bg-[#0A0A0A] text-sm"
                onClick={() => void handleSend("link")}
                disabled={Boolean(sendLoading)}
              >
                {sendLoading === "link" ? t("loading.send") : t("sendSheet.copyLink")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[400px] rounded-t-xl border border-white/10 bg-[#1A1A1A] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold">{t("markPaidSheet.title")}</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[#A3A3A3]">{t("markPaidSheet.date")}</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#A3A3A3]">{t("markPaidSheet.method")}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white"
                >
                  {(["cash", "zelle", "venmo", "check", "card", "other"] as const).map((item) => (
                    <option key={item} value={item}>
                      {t(`paymentMethods.${item}`)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="h-11 w-full rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50"
                disabled={loading}
                onClick={() => void markPaid()}
              >
                {loading ? t("markPaidSheet.confirming") : t("markPaidSheet.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
