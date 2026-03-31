import { redirect } from "next/navigation";

import { ExpensesListClient } from "@/components/expenses/expenses-list-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/types";

type Props = { params: Promise<{ locale: string }> };

type ExpenseRow = {
  id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expense_date: string;
};

export default async function ExpensesPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data } = await supabase
    .from("expenses")
    .select("id,category,description,amount,expense_date")
    .eq("user_id", user.id)
    .order("expense_date", { ascending: false });

  const expenses = ((data ?? []) as ExpenseRow[]).map((row) => ({
    id: row.id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount ?? 0),
    expenseDate: row.expense_date,
  }));

  return <ExpensesListClient expenses={expenses} />;
}
