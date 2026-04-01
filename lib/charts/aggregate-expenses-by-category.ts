export type ExpenseForCategoryAgg = {
  expense_date: string;
  amount: number;
  category: string;
};

export function aggregateExpensesByCategoryInRange(
  rows: ExpenseForCategoryAgg[],
  rangeStart: Date,
  rangeEnd: Date,
): { category: string; value: number }[] {
  const startMs = rangeStart.getTime();
  const endMs = rangeEnd.getTime();
  const byCat = new Map<string, number>();
  for (const r of rows) {
    const t = new Date(r.expense_date).getTime();
    if (t < startMs || t > endMs) {
      continue;
    }
    const cat = (r.category || "other").trim() || "other";
    byCat.set(cat, (byCat.get(cat) ?? 0) + r.amount);
  }
  return Array.from(byCat.entries())
    .map(([category, value]) => ({ category, value }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);
}
