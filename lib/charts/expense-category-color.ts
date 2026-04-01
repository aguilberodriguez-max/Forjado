/** Default category colors (Supplies … Other). Unknown / custom categories use a stable palette. */
const DEFAULT_COLORS: Record<string, string> = {
  supplies: "#F26522",
  fuel: "#3B82F6",
  equipment: "#22C55E",
  marketing: "#EAB308",
  food: "#EC4899",
  insurance: "#8B5CF6",
  subcontractor: "#14B8A6",
  rent: "#EF4444",
  phone: "#F97316",
  other: "#A3A3A3",
};

const CUSTOM_FALLBACK = [
  "#6366F1",
  "#D946EF",
  "#84CC16",
  "#06B6D4",
  "#F43F5E",
  "#0EA5E9",
  "#B45309",
];

export function getExpenseCategoryColor(category: string): string {
  const key = category.trim().toLowerCase();
  if (DEFAULT_COLORS[key]) {
    return DEFAULT_COLORS[key];
  }
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h + key.charCodeAt(i) * (i + 1)) % CUSTOM_FALLBACK.length;
  }
  return CUSTOM_FALLBACK[h];
}
