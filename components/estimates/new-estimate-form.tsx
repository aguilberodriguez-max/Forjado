"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FocusEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EstimateDocumentPreview } from "@/components/estimates/estimate-document-preview";
import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MoneyFormat } from "@/lib/money";
import type { Industry, LineItem } from "@/types";
import { formatCurrency } from "@/lib/utils";

type ClientOption = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
};

type NewEstimateFormProps = {
  userId: string;
  industry: Industry;
  clients: ClientOption[];
  defaultTaxRate: number;
  money: MoneyFormat;
  businessName: string;
  businessAddressLines: string[];
  logoUrl?: string | null;
};

function selectZeroOnFocus(event: FocusEvent<HTMLInputElement>) {
  const v = event.target.value;
  if (v === "0" || v === "0.0" || v === "0.00") {
    event.target.select();
  }
}

type FormValues = {
  search?: string;
  clientId?: string;
  newClientName?: string;
  newClientEmail?: string;
  newClientPhone?: string;
  newClientStreet?: string;
  newClientCity?: string;
  newClientState?: string;
  newClientZip?: string;
  newClientNotes?: string;
  lineItems: Array<{
    description?: string;
    quantity: number;
    unitPrice: number;
  }>;
  taxRate: number;
  notes?: string;
  validUntil: string;
};

const EMPTY_LINE_ITEMS: FormValues["lineItems"] = [];

function buildLineItemsFromFormRows(
  rows: FormValues["lineItems"],
  emptyDescriptionFallback: string,
): LineItem[] {
  const out: LineItem[] = [];
  for (const item of rows) {
    const desc = (item.description ?? "").trim();
    const qty = Number(item.quantity);
    const unit = Number(item.unitPrice);
    const safeQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
    const safeUnit = Number.isFinite(unit) && unit >= 0 ? unit : 0;
    if (!desc && safeQty === 1 && safeUnit === 0) {
      continue;
    }
    const description = desc || emptyDescriptionFallback;
    out.push({
      id: crypto.randomUUID(),
      description,
      quantity: safeQty,
      unit_price: safeUnit,
      line_total: safeQty * safeUnit,
    });
  }
  if (out.length === 0) {
    return [
      {
        id: crypto.randomUUID(),
        description: emptyDescriptionFallback,
        quantity: 1,
        unit_price: 0,
        line_total: 0,
      },
    ];
  }
  return out;
}

export function NewEstimateForm({
  userId,
  industry,
  clients,
  defaultTaxRate,
  money,
  businessName,
  businessAddressLines,
  logoUrl = null,
}: NewEstimateFormProps) {
  const t = useTranslations("estimateNew");
  const locale = useLocale();
  const router = useRouter();
  const [showNewClient, setShowNewClient] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);

  useEffect(() => {
    if (!showPreview) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showPreview]);

  const schema = useMemo(
    () =>
      z
        .object({
          search: z.string().optional(),
          clientId: z.string().optional(),
          newClientName: z.string().optional(),
          newClientEmail: z.string().optional(),
          newClientPhone: z.string().optional(),
          newClientStreet: z.string().optional(),
          newClientCity: z.string().optional(),
          newClientState: z.string().optional(),
          newClientZip: z.string().optional(),
          newClientNotes: z.string().optional(),
          lineItems: z
            .array(
              z.object({
                description: z.string().optional(),
                quantity: z.number(),
                unitPrice: z.number(),
              }),
            )
            .min(1),
          taxRate: z.number().min(0, t("validation.nonNegative")),
          notes: z.string().optional(),
          validUntil: z.string().min(1, t("validation.required")),
        })
        .superRefine((value, ctx) => {
          if (showNewClient) {
            if (!value.newClientName || value.newClientName.trim().length === 0) {
              ctx.addIssue({
                code: "custom",
                path: ["newClientName"],
                message: t("validation.required"),
              });
            }
          } else if (!value.clientId) {
            ctx.addIssue({
              code: "custom",
              path: ["clientId"],
              message: t("validation.selectClient"),
            });
          }
        }),
    [showNewClient, t],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      search: "",
      clientId: "",
      newClientName: "",
      newClientEmail: "",
      newClientPhone: "",
      newClientStreet: "",
      newClientCity: "",
      newClientState: "",
      newClientZip: "",
      newClientNotes: "",
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
      taxRate: defaultTaxRate,
      notes: "",
      validUntil: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    },
  });

  useEffect(() => {
    if (showNewClient) {
      form.setValue("clientId", "");
    }
  }, [showNewClient, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const search = useWatch({ control: form.control, name: "search" }) ?? "";
  const lineItems = useWatch({ control: form.control, name: "lineItems" });
  const safeLineItems = lineItems ?? EMPTY_LINE_ITEMS;
  const taxRate = useWatch({ control: form.control, name: "taxRate" }) ?? 0;
  const validUntil = useWatch({ control: form.control, name: "validUntil" }) ?? "";
  const notes = useWatch({ control: form.control, name: "notes" }) ?? "";
  const clientId = useWatch({ control: form.control, name: "clientId" }) ?? "";
  const newClientName = useWatch({ control: form.control, name: "newClientName" }) ?? "";
  const newClientEmail = useWatch({ control: form.control, name: "newClientEmail" }) ?? "";
  const newClientPhone = useWatch({ control: form.control, name: "newClientPhone" }) ?? "";

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return clients;
    }
    return clients.filter((client) => client.name.toLowerCase().includes(q));
  }, [clients, search]);

  const draftLineItems = useMemo(
    () => buildLineItemsFromFormRows(safeLineItems, t("draftLinePlaceholder")),
    [safeLineItems, t],
  );

  const subtotal = useMemo(
    () =>
      draftLineItems.reduce((sum, item) => sum + Number(item.line_total ?? 0), 0),
    [draftLineItems],
  );
  const taxAmount = subtotal * (Number(taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  const previewClientName = showNewClient
    ? newClientName.trim() || "—"
    : clients.find((c) => c.id === clientId)?.name ?? "—";

  const previewClientDetailLines = useMemo(() => {
    if (showNewClient) {
      return [newClientEmail.trim(), newClientPhone.trim()].filter(Boolean);
    }
    const c = clients.find((x) => x.id === clientId);
    if (!c) {
      return [];
    }
    return [c.email?.trim(), c.phone?.trim()].filter(Boolean) as string[];
  }, [showNewClient, newClientEmail, newClientPhone, clients, clientId]);

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

  async function resolveClientId(values: FormValues): Promise<string | null> {
    if (!showNewClient) {
      const id = typeof values.clientId === "string" ? values.clientId.trim() : "";
      return id.length > 0 ? id : null;
    }

    const supabase = createBrowserSupabaseClient();
    const { data: createdClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name: values.newClientName?.trim(),
        email: values.newClientEmail?.trim() || null,
        phone: values.newClientPhone?.trim() || null,
        street_address: values.newClientStreet?.trim() || null,
        city: values.newClientCity?.trim() || null,
        state: values.newClientState?.trim() || null,
        zip_code: values.newClientZip?.trim() || null,
        notes: values.newClientNotes?.trim() || null,
        is_archived: false,
      })
      .select("id")
      .single();

    if (clientError || !createdClient) {
      return null;
    }
    return createdClient.id;
  }

  async function saveDraft() {
    form.clearErrors();
    setSubmitError(null);
    setDraftSavedFlash(false);

    const values = form.getValues();

    if (showNewClient) {
      if (!values.newClientName?.trim()) {
        form.setError("newClientName", { type: "manual", message: t("validation.required") });
        setSubmitError(t("validation.required"));
        return;
      }
    } else if (!values.clientId) {
      form.setError("clientId", { type: "manual", message: t("validation.selectClient") });
      setSubmitError(t("validation.selectClient"));
      return;
    }

    if (!values.validUntil?.trim()) {
      form.setError("validUntil", { type: "manual", message: t("validation.required") });
      setSubmitError(t("validation.required"));
      return;
    }

    setSavingDraft(true);
    try {
      const clientRowId = await resolveClientId(values);
      if (!clientRowId) {
        setSubmitError(t("errors.saveClient"));
        return;
      }

      const normalizedItems = buildLineItemsFromFormRows(values.lineItems, t("draftLinePlaceholder"));

      const estimateNumber = `EST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const supabase = createBrowserSupabaseClient();
      const sub = normalizedItems.reduce((s, item) => s + Number(item.line_total ?? 0), 0);
      const tax = sub * (Number(values.taxRate ?? 0) / 100);

      const { error } = await supabase.from("estimates").insert({
        user_id: userId,
        client_id: String(clientRowId),
        estimate_number: estimateNumber,
        status: "draft",
        industry,
        industry_template_data: {},
        line_items: normalizedItems,
        subtotal: sub,
        tax_rate: Number(values.taxRate),
        tax_amount: tax,
        total: sub + tax,
        notes_client: values.notes?.trim() || null,
        valid_until: values.validUntil,
        public_token: crypto.randomUUID(),
      });

      if (error) {
        setSubmitError(t("errors.saveEstimate"));
        return;
      }

      setDraftSavedFlash(true);
      setTimeout(() => {
        router.replace(`/${locale}/estimates?draftSaved=1`);
        router.refresh();
      }, 450);
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-8 text-white">
      <main className="mx-auto w-full max-w-[400px] px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <Link href={`/${locale}/estimates`} className="text-sm text-[#A3A3A3]">
            {t("cancel")}
          </Link>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
            <p className="mb-2 text-sm font-medium">{t("clientSelector.title")}</p>
            <input
              placeholder={t("clientSelector.searchPlaceholder")}
              className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
              {...form.register("search")}
            />
            {!showNewClient ? (
              <Controller
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
                    {visibleClients.map((client) => (
                      <label
                        key={client.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-white/5"
                      >
                        <input
                          type="radio"
                          checked={field.value === client.id}
                          onChange={() => field.onChange(client.id)}
                        />
                        <span>{client.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
            ) : null}
            {form.formState.errors.clientId ? (
              <p className="mt-1 text-xs text-[#EF4444]">
                {form.formState.errors.clientId.message}
              </p>
            ) : null}

            <button
              type="button"
              className="mt-3 text-sm text-[#F26522]"
              onClick={() => setShowNewClient((prev) => !prev)}
            >
              {showNewClient ? t("clientSelector.useExisting") : t("clientSelector.addNew")}
            </button>

            {showNewClient ? (
              <div className="mt-2 space-y-2">
                <input
                  placeholder={t("clientSelector.newName")}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("newClientName")}
                />
                <input
                  placeholder={t("clientSelector.newEmail")}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("newClientEmail")}
                />
                <input
                  placeholder={t("clientSelector.newPhone")}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("newClientPhone")}
                />
                <input
                  placeholder={t("clientSelector.newStreet")}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("newClientStreet")}
                />
                <input
                  placeholder={t("clientSelector.newCity")}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("newClientCity")}
                />
                <input
                  placeholder={t("clientSelector.newState")}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("newClientState")}
                />
                <input
                  placeholder={t("clientSelector.newZip")}
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("newClientZip")}
                />
                <textarea
                  rows={2}
                  placeholder={t("clientSelector.newNotes")}
                  className="w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none"
                  {...form.register("newClientNotes")}
                />
                {form.formState.errors.newClientName ? (
                  <p className="text-xs text-[#EF4444]">
                    {form.formState.errors.newClientName.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
            <p className="mb-2 text-sm font-medium">{t("lineItems.title")}</p>
            <div className="space-y-3">
              {fields.map((field, index) => {
                const qty = Number(safeLineItems[index]?.quantity ?? 0);
                const price = Number(safeLineItems[index]?.unitPrice ?? 0);
                const lineTotal = qty * price;
                return (
                  <div key={field.id} className="rounded-md border border-white/10 p-2">
                    <input
                      placeholder={t("lineItems.description")}
                      className="mb-2 h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                      {...form.register(`lineItems.${index}.description`)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder={t("lineItems.quantity")}
                        className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                        {...form.register(`lineItems.${index}.quantity`, {
                          valueAsNumber: true,
                        })}
                        onFocus={selectZeroOnFocus}
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder={t("lineItems.price")}
                        className="h-10 rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                        {...form.register(`lineItems.${index}.unitPrice`, {
                          valueAsNumber: true,
                        })}
                        onFocus={selectZeroOnFocus}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#A3A3A3]">
                      <span>{t("lineItems.lineTotal")}</span>
                      <span>{formatCurrency(lineTotal, money)}</span>
                    </div>
                    {fields.length > 1 ? (
                      <button
                        type="button"
                        className="mt-2 flex items-center gap-1 text-xs text-[#EF4444]"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("lineItems.remove")}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full bg-white/10 text-white hover:bg-white/15"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("lineItems.add")}
            </Button>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-[#A3A3A3]">{t("taxRate")}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("taxRate", { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#A3A3A3]">{t("validUntil")}</label>
                <input
                  type="date"
                  className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none"
                  {...form.register("validUntil")}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-[#A3A3A3]">{t("notes")}</label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none"
                  {...form.register("notes")}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#A3A3A3]">{t("summary.subtotal")}</span>
              <span>{formatCurrency(subtotal, money)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[#A3A3A3]">{t("summary.tax")}</span>
              <span>{formatCurrency(taxAmount, money)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-semibold">
              <span>{t("summary.total")}</span>
              <span>{formatCurrency(total, money)}</span>
            </div>
          </section>

          {draftSavedFlash ? (
            <p className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-300">
              {t("draftSaved")}
            </p>
          ) : null}

          {submitError ? (
            <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
              {submitError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              className="h-11 rounded-md border-0 bg-[#F26522] text-white hover:bg-[#F26522]/90"
              disabled={savingDraft}
              onClick={() => void saveDraft()}
            >
              {savingDraft ? t("savingDraft") : t("saveDraft")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 rounded-md bg-white/10 text-white hover:bg-white/15"
              onClick={() => setShowPreview((prev) => !prev)}
            >
              {t("preview")}
            </Button>
          </div>
        </form>

        {showPreview ? (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-[#0A0A0A]"
            role="dialog"
            aria-modal="true"
            aria-label={t("previewModal.title")}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-[#141414] px-4">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10"
                aria-label={t("previewModal.close")}
              >
                <X className="h-6 w-6" />
              </button>
              <span className="text-sm font-medium text-white">{t("previewModal.title")}</span>
              <span className="w-10" aria-hidden />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-200 py-6">
              <EstimateDocumentPreview
                logoUrl={logoUrl}
                businessName={businessName}
                businessAddressLines={businessAddressLines}
                estimateNumber={t("pdf.previewNumber")}
                documentTitle={t("pdf.documentTitle")}
                clientName={previewClientName}
                clientDetailLines={previewClientDetailLines}
                lineItems={draftLineItems}
                subtotal={subtotal}
                taxRate={Number(taxRate || 0)}
                taxAmount={taxAmount}
                total={total}
                money={money}
                validUntilFormatted={validUntilFormatted}
                notes={notes.trim() || null}
                labels={{
                  documentTitle: t("pdf.documentTitle"),
                  footer: t("previewDoc.footer"),
                  billTo: t("previewDoc.billTo"),
                  lineItemsTitle: t("lineItems.title"),
                  description: t("previewDoc.description"),
                  quantity: t("previewDoc.quantity"),
                  unitPrice: t("previewDoc.unitPrice"),
                  amount: t("previewDoc.amount"),
                  subtotal: t("summary.subtotal"),
                  tax: t("summary.tax"),
                  total: t("summary.total"),
                  validUntil: t("validUntil"),
                  notes: t("pdf.notes"),
                }}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
