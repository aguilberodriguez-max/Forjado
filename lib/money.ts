import { DEFAULT_BUSINESS_MONEY } from "@/lib/countries";

export type MoneyFormat = {
  currencySymbol: string;
  currencyCode?: string;
};

export function moneyFromBusinessProfile(
  row:
    | {
        currency_symbol?: string | null;
        currency_code?: string | null;
      }
    | null
    | undefined,
): MoneyFormat {
  if (row?.currency_symbol && row?.currency_code) {
    return {
      currencySymbol: row.currency_symbol,
      currencyCode: row.currency_code,
    };
  }
  return { ...DEFAULT_BUSINESS_MONEY };
}
