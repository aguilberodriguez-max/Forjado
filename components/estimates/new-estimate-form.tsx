"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { Industry } from "@/types";
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
};

type FormValues = {
  search?: string;
  clientId?: string;
  newClientName?: string;
  newClientEmail?: string;
  newClientPhone?: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  taxRate: number;
  notes?: string;
  validUntil: string;
};

const EMPTY_LINE_ITEMS: FormValues["lineItems"] = [];

export function NewEstimateForm({
  userId,
  industry,
  clients,
  defaultTaxRate,
}: NewEstimateFormProps) {
  const t = useTranslations("estimateNew");
  const locale = useLocale();
  const router = useRouter();
  const [showNewClient, setShowNewClient] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          search: z.string().optional(),
          clientId: z.string().optional(),
          newClientName: z.string().optional(),
          newClientEmail: z.string().optional(),
          newClientPhone: z.string().optional(),
          lineItems: z
            .array(
              z.object({
                description: z.string().min(1, t("validation.required")),
                quantity: z.number().positive(t("validation.quantity")),
                unitPrice: z.number().min(0, t("validation.nonNegative")),
              }),
            )
            .min(1, t("validation.lineItemsMin")),
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
      lineItems: [{ description: "", quantity: 1, unitPrice: 0 }],
      taxRate: defaultTaxRate,
      notes: "",
      validUntil: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const search = useWatch({ control: form.control, name: "search" }) ?? "";
  const lineItems = useWatch({ control: form.control, name: "lineItems" });
  const safeLineItems = lineItems ?? EMPTY_LINE_ITEMS;
  const taxRate = useWatch({ control: form.control, name: "taxRate" }) ?? 0;

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return clients;
    }
    return clients.filter((client) => client.name.toLowerCase().includes(q));
  }, [clients, search]);

  const subtotal = useMemo(
    () =>
      safeLineItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      ),
    [safeLineItems],
  );
  const taxAmount = subtotal * (Number(taxRate || 0) / 100);
  const total = subtotal + taxAmount;

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    const supabase = createBrowserSupabaseClient();

    let clientId = values.clientId;
    if (showNewClient) {
      const { data: createdClient, error: clientError } = await supabase
        .from("clients")
        .insert({
          user_id: userId,
          name: values.newClientName?.trim(),
          email: values.newClientEmail?.trim() || null,
          phone: values.newClientPhone?.trim() || null,
          is_archived: false,
        })
        .select("id")
        .single();

      if (clientError || !createdClient) {
        setSubmitError(t("errors.saveClient"));
        return;
      }
      clientId = createdClient.id;
    }

    if (!clientId) {
      setSubmitError(t("validation.selectClient"));
      return;
    }

    const normalizedItems = values.lineItems.map((item) => {
      const quantity = Number(item.quantity);
      const unitPrice = Number(item.unitPrice);
      return {
        id: crypto.randomUUID(),
        description: item.description,
        quantity,
        unit_price: unitPrice,
        line_total: quantity * unitPrice,
      };
    });

    const estimateNumber = `EST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { error } = await supabase.from("estimates").insert({
      user_id: userId,
      client_id: clientId,
      estimate_number: estimateNumber,
      status: "draft",
      industry,
      industry_template_data: {},
      line_items: normalizedItems,
      subtotal,
      tax_rate: Number(values.taxRate),
      tax_amount: taxAmount,
      total,
      notes_client: values.notes || null,
      valid_until: values.validUntil,
      public_token: crypto.randomUUID(),
    });

    if (error) {
      setSubmitError(t("errors.saveEstimate"));
      return;
    }

    router.replace(`/${locale}/estimates`);
    router.refresh();
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

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
            <p className="mb-2 text-sm font-medium">{t("clientSelector.title")}</p>
            <input
              placeholder={t("clientSelector.searchPlaceholder")}
              className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
              {...form.register("search")}
            />
            <div className="mt-2 max-h-36 space-y-1 overflow-y-auto">
              {visibleClients.map((client) => (
                <label
                  key={client.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-white/5"
                >
                  <input type="radio" value={client.id} {...form.register("clientId")} />
                  <span>{client.name}</span>
                </label>
              ))}
            </div>
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
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-[#A3A3A3]">
                      <span>{t("lineItems.lineTotal")}</span>
                      <span>{formatCurrency(lineTotal)}</span>
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
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[#A3A3A3]">{t("summary.tax")}</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
            <div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-semibold">
              <span>{t("summary.total")}</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </section>

          {submitError ? (
            <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
              {submitError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="submit"
              className="h-11 rounded-md border-0 bg-[#F26522] text-white hover:bg-[#F26522]/90"
              disabled={form.formState.isSubmitting}
            >
              {t("saveDraft")}
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
          <div className="mt-4 rounded-xl border border-[#F26522]/40 bg-[#F26522]/10 p-3 text-sm">
            <p className="font-medium">{t("previewTitle")}</p>
            <p className="mt-1 text-[#A3A3A3]">
              {t("previewBody", {
                count: safeLineItems.length,
                total: formatCurrency(total),
              })}
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
