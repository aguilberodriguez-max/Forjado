"use client";

import {
  Plus,
  Receipt,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MoneyFormat } from "@/lib/money";
import type { ExpenseCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";

type ExpenseRow = {
  id: string;
  category: ExpenseCategory;
  description?: string | null;
  amount: number;
  expenseDate: string;
};

type Props = {
  expenses: ExpenseRow[];
  money: MoneyFormat;
};

const CATEGORIES: ExpenseCategory[] = [
  "supplies",
  "fuel",
  "equipment",
  "marketing",
  "food",
  "insurance",
  "subcontractor",
  "rent",
  "phone",
  "other",
];

export function ExpensesListClient({ expenses, money }: Props) {
  const t = useTranslations("expenses");
  const locale = useLocale();
  const [filter, setFilter] = useState<ExpenseCategory | "all">("all");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("supplies");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(
    () => expenses.filter((e) => filter === "all" || e.category === filter),
    [expenses, filter],
  );

  async function saveExpense() {
    setSaving(true);
    setError(null);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError(t("errors.save"));
      return;
    }
    const { error: insertError } = await supabase.from("expenses").insert({
      user_id: user.id,
      amount: Number(amount),
      category,
      description: description || null,
      expense_date: date,
    });
    setSaving(false);
    if (insertError) {
      setError(t("errors.save"));
      return;
    }
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center justify-between px-4">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[400px] flex-col gap-3 px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full border px-3 py-1.5 text-sm ${filter === "all" ? "border-[#F26522] text-[#F26522]" : "border-white/10 text-[#A3A3A3]"}`}
          >
            {t("all")}
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={`rounded-full border px-3 py-1.5 text-sm ${filter === c ? "border-[#F26522] text-[#F26522]" : "border-white/10 text-[#A3A3A3]"}`}
            >
              {t(`categories.${c}`)}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F26522]/15 text-[#F26522]">
                <Receipt className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{row.description || t(`categories.${row.category}`)}</p>
                <p className="text-xs text-[#A3A3A3]">{new Date(row.expenseDate).toLocaleDateString(locale)}</p>
              </div>
              <p className="text-sm font-semibold">
                {formatCurrency(row.amount, money)}
              </p>
            </div>
          ))}
        </div>
      </main>

      <button
        type="button"
        className="fixed bottom-20 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#F26522] text-white shadow-lg"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-5 w-5" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-[400px] rounded-t-xl border border-white/10 bg-[#1A1A1A] p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold">{t("newTitle")}</h3>
            <div className="space-y-3">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={t("amount")} className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm" />
              <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{t(`categories.${c}`)}</option>)}
              </select>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("description")} className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 w-full rounded-md border border-white/10 bg-[#0A0A0A] px-3 text-sm" />
              {error ? <p className="text-xs text-[#EF4444]">{error}</p> : null}
              <button disabled={saving} onClick={() => void saveExpense()} className="h-11 w-full rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50">
                {saving ? t("saving") : t("save")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <BottomNav locale={locale} />
    </div>
  );
}
