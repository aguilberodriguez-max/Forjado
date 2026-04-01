import { redirect } from "next/navigation";

import { ExpensesListClient } from "@/components/expenses/expenses-list-client";
import { parseChartRange } from "@/lib/charts/chart-range";
import { moneyFromBusinessProfile } from "@/lib/money";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string }>;
};

type ExpenseRow = {
  id: string;
  category: string;
  description: string | null;
  amount: number;
  expense_date: string;
};

export default async function ExpensesPage({ params, searchParams }: Props) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const chartRange = parseChartRange(sp.range);

  const [expensesRes, profileRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("id,category,description,amount,expense_date")
      .eq("user_id", user.id)
      .order("expense_date", { ascending: false }),
    supabase
      .from("business_profiles")
      .select("currency_code,currency_symbol")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const { data } = expensesRes;
  const money = moneyFromBusinessProfile(profileRes.data);

  const expenses = ((data ?? []) as ExpenseRow[]).map((row) => ({
    id: row.id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount ?? 0),
    expenseDate: row.expense_date,
  }));

  return (
    <ExpensesListClient
      expenses={expenses}
      money={money}
      chartRange={chartRange}
    />
  );
}
