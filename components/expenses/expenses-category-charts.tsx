"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { aggregateExpensesByCategoryInRange } from "@/lib/charts/aggregate-expenses-by-category";
import type { ChartRange } from "@/lib/charts/chart-range";
import { getOverallRange } from "@/lib/charts/chart-range";
import { getExpenseCategoryColor } from "@/lib/charts/expense-category-color";
import type { MoneyFormat } from "@/lib/money";
import type { ExpenseCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";

const RANGE_KEYS: ChartRange[] = ["week", "month", "last12", "ytd"];

const KNOWN_CATEGORIES: ExpenseCategory[] = [
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

type ExpenseRow = {
  expenseDate: string;
  amount: number;
  category: string;
};

type Props = {
  locale: string;
  expenses: ExpenseRow[];
  money: MoneyFormat;
  chartRange: ChartRange;
};

const AXIS = "#A3A3A3";
const GRID = "#333333";
const BG = "#1A1A1A";

export function ExpensesCategoryCharts({
  locale,
  expenses,
  money,
  chartRange,
}: Props) {
  const t = useTranslations("expenses");
  const tDash = useTranslations("dashboard");
  const now = new Date();
  const { start, end } = getOverallRange(chartRange, now);

  function labelCategory(category: string) {
    if (KNOWN_CATEGORIES.includes(category as ExpenseCategory)) {
      return t(`categories.${category as ExpenseCategory}`);
    }
    return category.trim() || t("categories.other");
  }

  const rows = expenses.map((e) => ({
    expense_date: e.expenseDate,
    amount: e.amount,
    category: e.category,
  }));
  const agg = aggregateExpensesByCategoryInRange(rows, start, end);
  const total = agg.reduce((s, x) => s + x.value, 0);

  const pieData = agg.map(({ category, value }) => ({
    name: labelCategory(category),
    categoryKey: category,
    value,
    fill: getExpenseCategoryColor(category),
  }));

  const barData = agg.map(({ category, value }) => ({
    name: labelCategory(category),
    categoryKey: category,
    value,
    fill: getExpenseCategoryColor(category),
  }));

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
      <p className="text-sm font-medium text-white">{t("charts.title")}</p>
      <div className="flex flex-wrap gap-2">
        {RANGE_KEYS.map((key) => (
          <Link
            key={key}
            href={`/${locale}/expenses?range=${key}`}
            scroll={false}
            className={`rounded-md px-2.5 py-1.5 text-center text-xs ${
              chartRange === key
                ? "bg-[#F26522] font-medium text-white"
                : "bg-white/5 text-[#A3A3A3]"
            }`}
          >
            {tDash(`chart.period.${key}`)}
          </Link>
        ))}
      </div>

      {total <= 0 ? (
        <p className="text-sm text-[#A3A3A3]">{t("charts.empty")}</p>
      ) : (
        <>
          <div>
            <p className="mb-2 text-xs text-[#A3A3A3]">{t("charts.donutTitle")}</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="mx-auto h-[220px] w-full max-w-[280px] sm:shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={2}
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.categoryKey} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={
                        <CategoryTooltip
                          money={money}
                          total={total}
                          getLabel={labelCategory}
                        />
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
                {pieData.map((row) => (
                  <li
                    key={row.categoryKey}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ background: row.fill }}
                      />
                      <span className="truncate text-[#A3A3A3]">{row.name}</span>
                    </span>
                    <span className="shrink-0 text-[#A3A3A3]">
                      {((row.value / total) * 100).toFixed(0)}% ·{" "}
                      {formatCurrency(row.value, money)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-[#A3A3A3]">{t("charts.barTitle")}</p>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 8, left: 4, bottom: 64 }}
                >
                  <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: AXIS, fontSize: 10 }}
                    interval={0}
                    angle={-40}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis
                    tick={{ fill: AXIS, fontSize: 10 }}
                    tickFormatter={(v) => formatCurrency(Number(v), money)}
                    width={56}
                  />
                  <Tooltip
                    content={
                      <BarTooltip money={money} getLabel={labelCategory} />
                    }
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((row) => (
                      <Cell key={row.categoryKey} fill={row.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function CategoryTooltip({
  active,
  payload,
  money,
  total,
  getLabel,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    payload?: { categoryKey?: string; value?: number; fill?: string };
  }>;
  money: MoneyFormat;
  total: number;
  getLabel: (k: string) => string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const first = payload[0];
  const inner = first.payload ?? first;
  const value = Number(
    inner && typeof inner === "object" && "value" in inner
      ? (inner as { value?: number }).value
      : first.value ?? 0,
  );
  const categoryKey =
    inner && typeof inner === "object" && "categoryKey" in inner
      ? String((inner as { categoryKey?: string }).categoryKey ?? "")
      : String(first.name ?? "");
  const fill =
    inner && typeof inner === "object" && "fill" in inner
      ? (inner as { fill?: string }).fill
      : undefined;
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  const name = getLabel(categoryKey);
  return (
    <div
      className="rounded-md border border-white/10 px-3 py-2 text-xs shadow-lg"
      style={{ background: BG }}
    >
      <p className="font-medium text-[#A3A3A3]">{name}</p>
      <p style={{ color: fill ?? AXIS }}>
        {pct}% · {formatCurrency(value, money)}
      </p>
    </div>
  );
}

function BarTooltip({
  active,
  payload,
  money,
  getLabel,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: { categoryKey?: string; value?: number; fill?: string };
  }>;
  money: MoneyFormat;
  getLabel: (c: string) => string;
}) {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }
  const p = payload[0].payload;
  const value = Number(p.value ?? 0);
  const name = getLabel(String(p.categoryKey ?? ""));
  return (
    <div
      className="rounded-md border border-white/10 px-3 py-2 text-xs shadow-lg"
      style={{ background: BG }}
    >
      <p className="font-medium text-[#A3A3A3]">{name}</p>
      <p style={{ color: p.fill ?? AXIS }}>{formatCurrency(value, money)}</p>
    </div>
  );
}
