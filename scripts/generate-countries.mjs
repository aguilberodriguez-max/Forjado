/**
 * Generates lib/countries.generated.ts from restcountries.com API.
 * Run: node scripts/generate-countries.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PRIORITY_OVERRIDES = {
  US: { symbol: "$", currencyCode: "USD", currencyNameEn: "US Dollar", currencyNameEs: "Dólar estadounidense" },
  MX: { symbol: "$", currencyCode: "MXN", currencyNameEn: "Mexican Peso", currencyNameEs: "Peso mexicano" },
  PR: { symbol: "$", currencyCode: "USD", currencyNameEn: "US Dollar", currencyNameEs: "Dólar estadounidense" },
  HN: { symbol: "L", currencyCode: "HNL", currencyNameEn: "Honduran Lempira", currencyNameEs: "Lempira hondureña" },
  CO: { symbol: "$", currencyCode: "COP", currencyNameEn: "Colombian Peso", currencyNameEs: "Peso colombiano" },
  VE: { symbol: "Bs.S", currencyCode: "VES", currencyNameEn: "Venezuelan Bolívar", currencyNameEs: "Bolívar venezolano" },
  GT: { symbol: "Q", currencyCode: "GTQ", currencyNameEn: "Guatemalan Quetzal", currencyNameEs: "Quetzal guatemalteco" },
  SV: { symbol: "$", currencyCode: "USD", currencyNameEn: "US Dollar", currencyNameEs: "Dólar estadounidense" },
  DO: { symbol: "RD$", currencyCode: "DOP", currencyNameEn: "Dominican Peso", currencyNameEs: "Peso dominicano" },
  CU: { symbol: "₱", currencyCode: "CUP", currencyNameEn: "Cuban Peso", currencyNameEs: "Peso cubano" },
  PE: { symbol: "S/.", currencyCode: "PEN", currencyNameEn: "Peruvian Sol", currencyNameEs: "Sol peruano" },
  CL: { symbol: "$", currencyCode: "CLP", currencyNameEn: "Chilean Peso", currencyNameEs: "Peso chileno" },
  AR: { symbol: "$", currencyCode: "ARS", currencyNameEn: "Argentine Peso", currencyNameEs: "Peso argentino" },
  BO: { symbol: "Bs.", currencyCode: "BOB", currencyNameEn: "Bolivian Boliviano", currencyNameEs: "Boliviano" },
  EC: { symbol: "$", currencyCode: "USD", currencyNameEn: "US Dollar", currencyNameEs: "Dólar estadounidense" },
  CR: { symbol: "₡", currencyCode: "CRC", currencyNameEn: "Costa Rican Colón", currencyNameEs: "Colón costarricense" },
  PA: { symbol: "B/.", currencyCode: "PAB", currencyNameEn: "Panamanian Balboa", currencyNameEs: "Balboa panameño" },
  PY: { symbol: "₲", currencyCode: "PYG", currencyNameEn: "Paraguayan Guaraní", currencyNameEs: "Guaraní paraguayo" },
  UY: { symbol: "$U", currencyCode: "UYU", currencyNameEn: "Uruguayan Peso", currencyNameEs: "Peso uruguayo" },
  NI: { symbol: "C$", currencyCode: "NIO", currencyNameEn: "Nicaraguan Córdoba", currencyNameEs: "Córdoba nicaragüense" },
  ES: { symbol: "€", currencyCode: "EUR", currencyNameEn: "Euro", currencyNameEs: "Euro" },
  BR: { symbol: "R$", currencyCode: "BRL", currencyNameEn: "Brazilian Real", currencyNameEs: "Real brasileño" },
  CA: { symbol: "$", currencyCode: "CAD", currencyNameEn: "Canadian Dollar", currencyNameEs: "Dólar canadiense" },
};

const PRIORITY_ORDER = [
  "US", "MX", "PR", "HN", "CO", "VE", "GT", "SV", "DO", "CU", "PE", "CL", "AR", "BO", "EC", "CR", "PA", "PY", "UY", "NI", "ES", "BR", "CA",
];

const SPANISH_NAMES = {
  US: "Estados Unidos",
  PR: "Puerto Rico",
  MX: "México",
  ES: "España",
  GB: "Reino Unido",
  DO: "República Dominicana",
  BO: "Bolivia",
  VE: "Venezuela",
  // restcountries translations.spa will fill most
};

const res = await fetch(
  "https://restcountries.com/v3.1/all?fields=name,cca2,currencies,translations",
);
const data = await res.json();

const FALLBACK_USD = {
  currencyCode: "USD",
  symbol: "$",
  currencyNameEn: "US Dollar",
  currencyNameEs: "Dólar estadounidense",
};

function pickCurrency(c) {
  const cur = c.currencies;
  if (!cur || typeof cur !== "object" || Object.keys(cur).length === 0) {
    return { ...FALLBACK_USD };
  }
  const code = Object.keys(cur)[0];
  if (!code) {
    return { ...FALLBACK_USD };
  }
  const info = cur[code];
  return {
    currencyCode: code,
    symbol: info?.symbol ?? code,
    currencyNameEn: info?.name ?? code,
    currencyNameEs: info?.name ?? code,
  };
}

const rows = [];
for (const c of data) {
  const code = c.cca2;
  if (!code) continue;
  const nameEn = c.name?.common ?? code;
  const nameEs = c.translations?.spa?.common ?? SPANISH_NAMES[code] ?? nameEn;
  let currency = pickCurrency(c);
  if (PRIORITY_OVERRIDES[code]) {
    currency = { ...currency, ...PRIORITY_OVERRIDES[code] };
  }
  rows.push({
    code,
    nameEn,
    nameEs,
    currencyCode: currency.currencyCode ?? FALLBACK_USD.currencyCode,
    currencySymbol: currency.symbol ?? FALLBACK_USD.symbol,
    currencyNameEn: currency.currencyNameEn ?? FALLBACK_USD.currencyNameEn,
    currencyNameEs: currency.currencyNameEs ?? FALLBACK_USD.currencyNameEs,
  });
}

const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));

const prioritySet = new Set(PRIORITY_ORDER);
const priorityRows = PRIORITY_ORDER.map((code) => byCode[code]).filter(Boolean);

const restRows = rows
  .filter((r) => !prioritySet.has(r.code))
  .sort((a, b) => a.nameEn.localeCompare(b.nameEn, "en"));

const ALL = [...priorityRows, ...restRows];

const out = `/* eslint-disable max-lines */
/**
 * Auto-generated by scripts/generate-countries.mjs — do not edit by hand.
 * Priority block (Americas + Spain + Brazil + Canada) uses curated symbols.
 */

export type CountryRecord = {
  /** ISO 3166-1 alpha-2 */
  code: string;
  nameEn: string;
  nameEs: string;
  /** ISO 4217 */
  currencyCode: string;
  currencySymbol: string;
  currencyNameEn: string;
  currencyNameEs: string;
};

export const COUNTRIES: CountryRecord[] = ${JSON.stringify(ALL, null, 2)};

export const PRIORITY_COUNTRY_CODES = ${JSON.stringify(PRIORITY_ORDER)} as const;

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountryByCode(code: string | null | undefined): CountryRecord | undefined {
  if (!code) return undefined;
  return byCode.get(code.toUpperCase());
}

/** Priority countries first, then alphabetical by English name (excluding priority set). */
export function getCountriesSortedForSelect(): CountryRecord[] {
  return COUNTRIES;
}
`;

const outPath = path.join(__dirname, "..", "lib", "countries.generated.ts");
fs.writeFileSync(outPath, out, "utf8");
console.log("Wrote", outPath, "countries:", ALL.length);
