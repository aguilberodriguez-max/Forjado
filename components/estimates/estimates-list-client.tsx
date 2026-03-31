"use client";

import {
  Plus,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { TouchEvent } from "react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/bottom-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { MoneyFormat } from "@/lib/money";
import type { EstimateStatus } from "@/types";
import { cn, formatCurrency } from "@/lib/utils";

type EstimateListItem = {
  id: string;
  clientName: string;
  estimateNumber: string;
  createdAt: string;
  total: number;
  status: EstimateStatus;
};

type EstimatesListClientProps = {
  estimates: EstimateListItem[];
  money: MoneyFormat;
};

const FILTERS: Array<"all" | "draft" | "sent" | "accepted" | "expired"> = [
  "all",
  "draft",
  "sent",
  "accepted",
  "expired",
];

function statusClass(status: EstimateStatus): string {
  if (status === "draft") {
    return "border-white/20 bg-white/10 text-[#A3A3A3]";
  }
  if (status === "sent") {
    return "border-blue-400/40 bg-blue-400/10 text-blue-300";
  }
  if (status === "accepted") {
    return "border-green-400/40 bg-green-400/10 text-green-300";
  }
  if (status === "expired") {
    return "border-red-400/40 bg-red-400/10 text-red-300";
  }
  return "border-white/20 bg-white/10 text-[#A3A3A3]";
}

export function EstimatesListClient({ estimates, money }: EstimatesListClientProps) {
  const t = useTranslations("estimates");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [pullStartY, setPullStartY] = useState<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return estimates.filter((item) => {
      if (filter !== "all" && item.status !== filter) {
        return false;
      }
      const search = query.trim().toLowerCase();
      if (!search) {
        return true;
      }
      return (
        item.clientName.toLowerCase().includes(search) ||
        item.estimateNumber.toLowerCase().includes(search)
      );
    });
  }, [estimates, filter, query]);

  async function triggerRefresh() {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }

  async function handleDelete(itemId: string) {
    const confirmed = window.confirm(t("delete.confirm"));
    if (!confirmed) {
      return;
    }
    setActionError(null);
    setDeletingId(itemId);
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase
      .from("estimates")
      .delete()
      .eq("id", itemId)
      .eq("status", "draft");
    setDeletingId(null);
    if (error) {
      setActionError(t("delete.error"));
      return;
    }
    router.refresh();
  }

  function onTouchStart(event: TouchEvent<HTMLDivElement>) {
    if (window.scrollY === 0) {
      setPullStartY(event.touches[0]?.clientY ?? null);
    }
  }

  function onTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (pullStartY === null) {
      return;
    }
    const currentY = event.touches[0]?.clientY ?? pullStartY;
    const distance = Math.max(0, currentY - pullStartY);
    setPullDistance(Math.min(distance, 90));
  }

  function onTouchEnd() {
    if (pullDistance > 70 && !isRefreshing) {
      void triggerRefresh();
    }
    setPullStartY(null);
    setPullDistance(0);
  }

  return (
    <div
      className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center justify-between px-4">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <Link
            href={`/${locale}/estimates/new`}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F26522] text-white"
            aria-label={t("newEstimate")}
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[400px] flex-col gap-3 px-4 py-4">
        <div
          className={cn(
            "text-center text-xs text-[#A3A3A3] transition-all",
            pullDistance > 10 || isRefreshing ? "h-4 opacity-100" : "h-0 opacity-0",
          )}
        >
          {isRefreshing ? t("refreshing") : t("pullToRefresh")}
        </div>
        {actionError ? (
          <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
            {actionError}
          </p>
        ) : null}

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
        />

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
          <div className="mt-8 rounded-xl border border-white/10 bg-[#1A1A1A] p-6 text-center">
            <p className="text-sm text-[#A3A3A3]">{t("empty")}</p>
            <Button
              asChild
              className="mt-4 h-10 rounded-md border-0 bg-[#F26522] text-white hover:bg-[#F26522]/90"
            >
              <Link href={`/${locale}/estimates/new`}>
                <Plus className="mr-1 h-4 w-4" />
                {t("newEstimate")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-white/10 bg-[#1A1A1A] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/${locale}/estimates/${item.id}`} className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{item.estimateNumber}</p>
                        <p className="text-xs text-[#A3A3A3]">{item.clientName}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
                          statusClass(item.status),
                        )}
                      >
                        {t(`status.${item.status}`)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-[#A3A3A3]">
                        {new Date(item.createdAt).toLocaleDateString(locale)}
                      </span>
                      <span className="font-semibold">{formatCurrency(item.total, money)}</span>
                    </div>
                  </Link>
                  {item.status === "draft" ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-red-400/40 bg-red-400/10 text-red-300 disabled:opacity-50"
                      aria-label={t("delete.label")}
                      title={t("delete.label")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav locale={locale} />
    </div>
  );
}
