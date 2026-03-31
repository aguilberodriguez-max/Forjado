"use client";

import {
  Plus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import type { MoneyFormat } from "@/lib/money";
import type { InvoiceStatus } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  dueDate: string;
  total: number;
  status: InvoiceStatus;
};

type InvoicesListClientProps = {
  invoices: InvoiceListItem[];
  money: MoneyFormat;
};

const FILTERS: Array<"all" | "draft" | "sent" | "paid" | "overdue"> = [
  "all",
  "draft",
  "sent",
  "paid",
  "overdue",
];

function statusClass(status: InvoiceStatus): string {
  if (status === "draft") return "border-white/20 bg-white/10 text-[#A3A3A3]";
  if (status === "sent") return "border-blue-400/40 bg-blue-400/10 text-blue-300";
  if (status === "paid") return "border-green-400/40 bg-green-400/10 text-green-300";
  if (status === "overdue") return "border-red-400/40 bg-red-400/10 text-red-300";
  return "border-white/20 bg-white/10 text-[#A3A3A3]";
}

export function InvoicesListClient({ invoices, money }: InvoicesListClientProps) {
  const t = useTranslations("invoices");
  const locale = useLocale();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const filtered = useMemo(
    () => invoices.filter((row) => filter === "all" || row.status === filter),
    [filter, invoices],
  );

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center justify-between px-4">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <Link
            href={`/${locale}/estimates/new`}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F26522] text-white"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[400px] flex-col gap-3 px-4 py-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm",
                filter === item
                  ? "border-[#F26522] bg-[#F26522]/15 text-[#F26522]"
                  : "border-white/10 bg-[#1A1A1A] text-[#A3A3A3]",
              )}
              onClick={() => setFilter(item)}
            >
              {t(`filters.${item}`)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-[#1A1A1A] p-6 text-center text-sm text-[#A3A3A3]">
            {t("empty")}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((row) => (
              <Link
                key={row.id}
                href={`/${locale}/invoices/${row.id}`}
                className="block rounded-xl border border-white/10 bg-[#1A1A1A] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{row.invoiceNumber}</p>
                    <p className="text-xs text-[#A3A3A3]">{row.clientName}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                      statusClass(row.status),
                    )}
                  >
                    {t(`status.${row.status}`)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-[#A3A3A3]">
                    {t("dueDate")}: {new Date(row.dueDate).toLocaleDateString(locale)}
                  </span>
                  <span className="font-semibold">{formatCurrency(row.total, money)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav locale={locale} />
    </div>
  );
}
