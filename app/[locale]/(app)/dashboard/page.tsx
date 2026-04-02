import {
  Plus,
  Settings,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";

import { DashboardPerformanceChart } from "@/components/dashboard/dashboard-performance-chart";
import { moneyFromBusinessProfile } from "@/lib/money";
import {
  aggregatePerformanceSeries,
  sumPerformanceSeries,
  type ExpenseDateRow,
  type InvoicePaidRow,
} from "@/lib/charts/performance-aggregation";
import {
  buildPerformanceBuckets,
  getOverallRange,
  parseChartRange,
} from "@/lib/charts/chart-range";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { BottomNav } from "@/components/layout/bottom-nav";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
};

const RANGE_KEYS = ["week", "month", "last12", "ytd"] as const;

const cardSurface =
  "rounded-2xl border border-white/[0.08] bg-[#151518] shadow-[0_8px_32px_-14px_rgba(0,0,0,0.55)]";

export default async function DashboardPage({
  params,
  searchParams,
}: DashboardPageProps) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const t = await getTranslations("dashboard");
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const chartRange = parseChartRange(sp.range);
  const now = new Date();
  const { start: periodStart, end: periodEnd } = getOverallRange(chartRange, now);

  const [profileResult, paidInvoicesResult, expensesResult, outstandingResult, eventsResult] =
    await Promise.all([
      supabase
        .from("business_profiles")
        .select("owner_name,subscription_status,trial_ends_at,currency_code,currency_symbol")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("invoices")
        .select("total,paid_at")
        .eq("user_id", user.id)
        .eq("status", "paid")
        .gte("paid_at", periodStart.toISOString())
        .lte("paid_at", periodEnd.toISOString()),
      supabase
        .from("expenses")
        .select("amount,expense_date")
        .eq("user_id", user.id)
        .gte("expense_date", periodStart.toISOString())
        .lte("expense_date", periodEnd.toISOString()),
      supabase
        .from("invoices")
        .select("id,total")
        .eq("user_id", user.id)
        .in("status", ["sent", "overdue"]),
      supabase
        .from("events")
        .select("id,type,description,amount,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const profile = profileResult.data;
  const money = moneyFromBusinessProfile(profile);
  const ownerName =
    profile?.owner_name?.trim() || t("fallbackOwner");

  const invoices = (paidInvoicesResult.data ?? []) as InvoicePaidRow[];
  const expensesRows = (expensesResult.data ?? []) as ExpenseDateRow[];

  const buckets = buildPerformanceBuckets(chartRange, now, locale);
  const series = aggregatePerformanceSeries(invoices, expensesRows, buckets);
  const { revenue, expenses, profit } = sumPerformanceSeries(series);

  const outstandingCount = outstandingResult.data?.length ?? 0;
  const outstandingTotal =
    outstandingResult.data?.reduce((sum, row) => sum + Number(row.total ?? 0), 0) ?? 0;
  const hasDataError =
    Boolean(profileResult.error) ||
    Boolean(paidInvoicesResult.error) ||
    Boolean(expensesResult.error) ||
    Boolean(outstandingResult.error);

  const trialDaysLeft =
    profile?.subscription_status === "trialing" && profile.trial_ends_at
      ? Math.max(0, differenceInCalendarDays(new Date(profile.trial_ends_at), now))
      : null;

  return (
    <div className="relative min-h-screen min-h-dvh bg-[#0B0B0D] pb-28 text-[#F3F3F1]">
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_100%_60%_at_50%_-20%,rgba(240,90,26,0.09),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_80%_50%_at_100%_100%,rgba(255,255,255,0.03),transparent_50%)]"
        aria-hidden
      />

      <header className="relative z-20 border-b border-white/[0.08] bg-[#0B0B0D]/90 backdrop-blur-md supports-[backdrop-filter]:bg-[#0B0B0D]/75">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center justify-between px-4">
          <p className="text-lg font-semibold tracking-tight text-[#F05A1A]">
            {t("brandName")}
          </p>
          <Link
            href={`/${locale}/settings`}
            aria-label={t("settings")}
            className="rounded-lg p-2 text-[#A1A1AA] transition-colors hover:bg-white/[0.06] hover:text-[#F3F3F1]"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[400px] flex-col gap-6 px-4 py-6">
        <DashboardGreeting ownerName={ownerName} />

        {hasDataError ? (
          <div
            className={`${cardSurface} border-[#F87171]/35 bg-[#F87171]/[0.08] px-4 py-3 text-sm text-[#FCA5A5]`}
          >
            {t("loadError")}
          </div>
        ) : null}

        {trialDaysLeft !== null ? (
          <div
            className={`${cardSurface} border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-100/95`}
          >
            {t("trialBanner", { days: trialDaysLeft })}
          </div>
        ) : null}

        <section className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#A1A1AA]">
            {t("chart.title")}
          </p>
          <div className="rounded-2xl border border-white/[0.08] bg-[#1C1C20] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="grid grid-cols-4 gap-1">
              {RANGE_KEYS.map((key) => {
                const active = chartRange === key;
                return (
                  <Link
                    key={key}
                    href={`/${locale}/dashboard?range=${key}`}
                    className={`flex min-h-[2.85rem] items-center justify-center rounded-xl px-1 py-2 text-center text-[10px] font-medium leading-snug transition-all sm:text-[11px] ${
                      active
                        ? "bg-[#151518] text-[#F3F3F1] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.06]"
                        : "text-[#A1A1AA] hover:bg-white/[0.04] hover:text-[#F3F3F1]/90"
                    }`}
                  >
                    {t(`chart.period.${key}`)}
                  </Link>
                );
              })}
            </div>
          </div>
          <DashboardPerformanceChart
            data={series}
            money={money}
            seriesLabels={{
              revenue: t("kpi.revenue"),
              expenses: t("kpi.expenses"),
              profit: t("kpi.profit"),
            }}
          />
        </section>

        <section className={`${cardSurface} p-5`}>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#A1A1AA]">
            {t("kpi.revenue")}
          </p>
          <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums text-[#F05A1A]">
            {formatCurrency(revenue, money)}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className={`${cardSurface} p-5`}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#A1A1AA]">
              {t("kpi.expenses")}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-[#F87171]">
              {formatCurrency(expenses, money)}
            </p>
          </div>
          <div className={`${cardSurface} p-5`}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#A1A1AA]">
              {t("kpi.profit")}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums text-[#2ED47A]">
              {formatCurrency(profit, money)}
            </p>
          </div>
        </section>

        <section className={`${cardSurface} p-5`}>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#A1A1AA]">
            {t("outstanding.title")}
          </p>
          <p className="mt-2 text-base font-medium leading-relaxed text-[#F3F3F1]">
            {t("outstanding.summary", {
              count: outstandingCount,
              total: formatCurrency(outstandingTotal, money),
            })}
          </p>
        </section>

        <section className={`${cardSurface} p-5`}>
          <h2 className="text-base font-semibold tracking-tight text-[#F3F3F1]">
            {t("recentActivity.title")}
          </h2>
          <div className="mt-4 space-y-2">
            {(eventsResult.data ?? []).length === 0 ? (
              <p className="text-sm text-[#A1A1AA]">{t("recentActivity.empty")}</p>
            ) : (
              eventsResult.data?.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-white/[0.06] bg-[#1C1C20] px-3.5 py-3"
                >
                  <p className="text-sm leading-snug text-[#F3F3F1]">{event.description}</p>
                  <p className="mt-1.5 text-xs text-[#A1A1AA]">
                    {new Date(event.created_at).toLocaleString(locale)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <h2 className="col-span-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#A1A1AA]">
            {t("quickActions.title")}
          </h2>
          <Link
            href={`/${locale}/estimates/new`}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl bg-[#F05A1A] px-2 text-center text-xs font-semibold text-white shadow-[0_4px_24px_-6px_rgba(240,90,26,0.55)] transition-[transform,box-shadow] hover:bg-[#E04F15] hover:shadow-[0_6px_28px_-4px_rgba(240,90,26,0.6)] active:scale-[0.99] sm:text-sm"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            <span className="leading-tight">{t("quickActions.newEstimate")}</span>
          </Link>
          <Link
            href={`/${locale}/expenses`}
            className="flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-[#F05A1A]/35 bg-[#1C1C20] px-2 text-center text-xs font-semibold text-[#F05A1A] shadow-[0_4px_20px_-8px_rgba(0,0,0,0.4)] transition-colors hover:border-[#F05A1A]/55 hover:bg-[#252528] active:scale-[0.99] sm:text-sm"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            <span className="leading-tight">{t("quickActions.addExpense")}</span>
          </Link>
        </section>
      </main>

      <BottomNav locale={locale} />
    </div>
  );
}
