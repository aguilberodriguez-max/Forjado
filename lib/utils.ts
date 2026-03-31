import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { DEFAULT_BUSINESS_MONEY } from "@/lib/countries"
import type { MoneyFormat } from "@/lib/money"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a numeric amount using the business currency symbol (never assumes USD in the UI). */
export function formatCurrency(
  amount: number,
  money: MoneyFormat | null | undefined = DEFAULT_BUSINESS_MONEY,
): string {
  const symbol = money?.currencySymbol ?? DEFAULT_BUSINESS_MONEY.currencySymbol
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${symbol}${formatted}`
}

export type { MoneyFormat } from "@/lib/money"
