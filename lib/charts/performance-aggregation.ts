import type { PerformanceBucket } from "./chart-range";

export type InvoicePaidRow = {
  paid_at: string | null;
  total: number | string | null;
};

export type ExpenseDateRow = {
  expense_date: string;
  amount: number | string | null;
};

function inRangeInclusive(t: number, start: Date, end: Date): boolean {
  return t >= start.getTime() && t <= end.getTime();
}

export function aggregatePerformanceSeries(
  invoices: InvoicePaidRow[],
  expenses: ExpenseDateRow[],
  buckets: PerformanceBucket[],
): {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}[] {
  return buckets.map((b) => {
    let revenue = 0;
    for (const inv of invoices) {
      if (!inv.paid_at) {
        continue;
      }
      const t = new Date(inv.paid_at).getTime();
      if (inRangeInclusive(t, b.start, b.end)) {
        revenue += Number(inv.total ?? 0);
      }
    }
    let exp = 0;
    for (const ex of expenses) {
      const t = new Date(ex.expense_date).getTime();
      if (inRangeInclusive(t, b.start, b.end)) {
        exp += Number(ex.amount ?? 0);
      }
    }
    return {
      key: b.key,
      label: b.label,
      revenue,
      expenses: exp,
      profit: revenue - exp,
    };
  });
}

export function sumPerformanceSeries(
  series: ReturnType<typeof aggregatePerformanceSeries>,
) {
  return series.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      expenses: acc.expenses + row.expenses,
      profit: acc.profit + row.profit,
    }),
    { revenue: 0, expenses: 0, profit: 0 },
  );
}
