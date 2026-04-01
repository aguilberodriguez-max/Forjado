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
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center justify-between px-4">
          <p className="text-xl font-bold text-[#F26522]">{t("brandName")}</p>
          <Link href={`/${locale}/settings`} aria-label={t("settings")}>
            <Settings className="h-5 w-5 text-[#A3A3A3]" />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[400px] flex-col gap-4 px-4 py-5">
        <DashboardGreeting ownerName={ownerName} />

        {hasDataError ? (
          <div className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
            {t("loadError")}
          </div>
        ) : null}

        {trialDaysLeft !== null ? (
          <div className="rounded-lg border border-yellow-400/40 bg-yellow-400/10 px-3 py-2 text-sm text-yellow-300">
            {t("trialBanner", { days: trialDaysLeft })}
          </div>
        ) : null}

        <section className="flex flex-col gap-2">
          <p className="text-sm font-medium text-white">{t("chart.title")}</p>
          <div className="flex flex-wrap gap-2">
            {RANGE_KEYS.map((key) => (
              <Link
                key={key}
                href={`/${locale}/dashboard?range=${key}`}
                className={`rounded-md px-2.5 py-1.5 text-center text-xs ${
                  chartRange === key
                    ? "bg-[#F26522] font-medium text-white"
                    : "bg-[#1A1A1A] text-[#A3A3A3]"
                }`}
              >
                {t(`chart.period.${key}`)}
              </Link>
            ))}
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

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <p className="text-sm text-[#A3A3A3]">{t("kpi.revenue")}</p>
          <p className="mt-2 text-3xl font-bold text-[#F26522]">
            {formatCurrency(revenue, money)}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
            <p className="text-sm text-[#A3A3A3]">{t("kpi.expenses")}</p>
            <p className="mt-2 text-xl font-semibold text-[#EF4444]">
              {formatCurrency(expenses, money)}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
            <p className="text-sm text-[#A3A3A3]">{t("kpi.profit")}</p>
            <p className="mt-2 text-xl font-semibold text-[#22C55E]">
              {formatCurrency(profit, money)}
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <p className="text-sm text-[#A3A3A3]">{t("outstanding.title")}</p>
          <p className="mt-1 text-base">
            {t("outstanding.summary", {
              count: outstandingCount,
              total: formatCurrency(outstandingTotal, money),
            })}
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="text-base font-semibold">{t("recentActivity.title")}</h2>
          <div className="mt-3 space-y-2">
            {(eventsResult.data ?? []).length === 0 ? (
              <p className="text-sm text-[#A3A3A3]">{t("recentActivity.empty")}</p>
            ) : (
              eventsResult.data?.map((event) => (
                <div key={event.id} className="rounded-md bg-white/5 px-3 py-2">
                  <p className="text-sm">{event.description}</p>
                  <p className="text-xs text-[#A3A3A3]">
                    {new Date(event.created_at).toLocaleString(locale)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <h2 className="col-span-2 text-base font-semibold">{t("quickActions.title")}</h2>
          <Link
            href={`/${locale}/estimates/new`}
            className="flex h-11 items-center justify-center gap-2 rounded-md bg-[#F26522] text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" />
            {t("quickActions.newEstimate")}
          </Link>
          <Link
            href={`/${locale}/expenses`}
            className="flex h-11 items-center justify-center gap-2 rounded-md border border-[#F26522] bg-transparent text-sm font-medium text-[#F26522]"
          >
            <Plus className="h-4 w-4" />
            {t("quickActions.addExpense")}
          </Link>
        </section>
      </main>

      <BottomNav locale={locale} />
    </div>
  );
}
