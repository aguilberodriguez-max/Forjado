"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MoneyFormat } from "@/lib/money";
import { formatCurrency } from "@/lib/utils";

export type PerformanceChartRow = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
};

type Props = {
  data: PerformanceChartRow[];
  money: MoneyFormat;
  seriesLabels: {
    revenue: string;
    expenses: string;
    profit: string;
  };
};

const BG = "#1A1A1A";
const AXIS = "#A3A3A3";
const GRID = "#333333";
const COLOR_REVENUE = "#F26522";
const COLOR_EXPENSES = "#EF4444";
const COLOR_PROFIT = "#22C55E";

export function DashboardPerformanceChart({ data, money, seriesLabels }: Props) {
  return (
    <div className="w-full rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: AXIS, fontSize: 10 }}
            interval={0}
            angle={data.length > 5 ? -35 : 0}
            textAnchor={data.length > 5 ? "end" : "middle"}
            height={data.length > 5 ? 52 : 28}
          />
          <YAxis
            tick={{ fill: AXIS, fontSize: 10 }}
            tickFormatter={(v) => formatCurrency(Number(v), money)}
            width={56}
          />
          <Tooltip
            content={
              <PerformanceTooltip money={money} seriesLabels={seriesLabels} />
            }
          />
          <Legend
            wrapperStyle={{ color: AXIS, fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span className="text-[#A3A3A3]">{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            name={seriesLabels.revenue}
            stroke={COLOR_REVENUE}
            strokeWidth={2}
            dot={{ r: 2, fill: COLOR_REVENUE }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            name={seriesLabels.expenses}
            stroke={COLOR_EXPENSES}
            strokeWidth={2}
            dot={{ r: 2, fill: COLOR_EXPENSES }}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="profit"
            name={seriesLabels.profit}
            stroke={COLOR_PROFIT}
            strokeWidth={2}
            dot={{ r: 2, fill: COLOR_PROFIT }}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function PerformanceTooltip({
  active,
  payload,
  label,
  money,
  seriesLabels,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  money: MoneyFormat;
  seriesLabels: Props["seriesLabels"];
}) {
  if (!active || !payload?.length) {
    return null;
  }
  const order = [
    seriesLabels.revenue,
    seriesLabels.expenses,
    seriesLabels.profit,
  ];
  const sorted = [...payload].sort(
    (a, b) => order.indexOf(String(a.name)) - order.indexOf(String(b.name)),
  );
  return (
    <div
      className="rounded-md border border-white/10 px-3 py-2 text-xs shadow-lg"
      style={{ background: BG }}
    >
      <p className="mb-1.5 font-medium text-[#A3A3A3]">{label}</p>
      <div className="space-y-0.5">
        {sorted.map((p) => (
          <p key={String(p.name)} style={{ color: p.color ?? AXIS }}>
            {p.name}: {formatCurrency(Number(p.value ?? 0), money)}
          </p>
        ))}
      </div>
    </div>
  );
}
