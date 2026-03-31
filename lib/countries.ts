export {
  COUNTRIES,
  PRIORITY_COUNTRY_CODES,
  getCountryByCode,
  getCountriesSortedForSelect,
  type CountryRecord,
} from "./countries.generated";

import { COUNTRIES, getCountryByCode, type CountryRecord } from "./countries.generated";

const US = getCountryByCode("US")!;

/** Fallback when business profile has no currency fields yet. */
export const DEFAULT_BUSINESS_MONEY = {
  currencyCode: US.currencyCode,
  currencySymbol: US.currencySymbol,
} as const;

export function countryDisplayName(c: CountryRecord, locale: string): string {
  return locale.startsWith("es") ? c.nameEs : c.nameEn;
}

/** Options for `<select>`: label is localized, value is ISO country code. */
export function getCountryOptionsForLocale(locale: string): { value: string; label: string }[] {
  return COUNTRIES.map((c) => ({
    value: c.code,
    label: `${countryDisplayName(c, locale)} (${c.currencyCode})`,
  }));
}
