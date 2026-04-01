import {
  addDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  min,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
} from "date-fns";
import { enUS, es } from "date-fns/locale";

export type ChartRange = "week" | "month" | "last12" | "ytd";

export function parseChartRange(v: string | undefined): ChartRange {
  if (v === "month" || v === "last12" || v === "ytd") {
    return v;
  }
  return "week";
}

function dfLocale(locale: string) {
  return locale.startsWith("es") ? es : enUS;
}

export type PerformanceBucket = {
  key: string;
  start: Date;
  end: Date;
  label: string;
};

export function getOverallRange(
  range: ChartRange,
  now: Date,
): { start: Date; end: Date } {
  switch (range) {
    case "week":
      return {
        start: startOfDay(startOfWeek(now, { weekStartsOn: 1 })),
        end: endOfDay(endOfWeek(now, { weekStartsOn: 1 })),
      };
    case "month":
      return {
        start: startOfDay(startOfMonth(now)),
        end: endOfDay(endOfMonth(now)),
      };
    case "last12":
      return {
        start: startOfDay(startOfMonth(subMonths(now, 11))),
        end: endOfDay(now),
      };
    case "ytd":
      return {
        start: startOfDay(startOfYear(now)),
        end: endOfDay(now),
      };
    default:
      return getOverallRange("week", now);
  }
}

export function buildPerformanceBuckets(
  range: ChartRange,
  now: Date,
  locale: string,
): PerformanceBucket[] {
  const loc = dfLocale(locale);

  if (range === "week") {
    const ws = startOfWeek(now, { weekStartsOn: 1 });
    const we = endOfWeek(now, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: ws, end: we });
    return days.map((day, i) => ({
      key: `d${i}`,
      start: startOfDay(day),
      end: endOfDay(day),
      label: format(day, "EEE", { locale: loc }),
    }));
  }

  if (range === "month") {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const buckets: PerformanceBucket[] = [];
    let cursor = startOfDay(monthStart);
    let i = 0;
    while (cursor.getTime() <= monthEnd.getTime()) {
      const candidateEnd = endOfDay(addDays(cursor, 6));
      const segEnd = min([candidateEnd, endOfDay(monthEnd)]);
      buckets.push({
        key: `mw${i}`,
        start: cursor,
        end: segEnd,
        label:
          format(cursor, "d", { locale: loc }) +
          "–" +
          format(segEnd, "d MMM", { locale: loc }),
      });
      cursor = startOfDay(addDays(segEnd, 1));
      i++;
    }
    return buckets;
  }

  if (range === "last12") {
    const rangeStart = startOfMonth(subMonths(now, 11));
    const months = eachMonthOfInterval({ start: rangeStart, end: now });
    return months.map((m, i) => {
      const monthEnd = endOfMonth(m);
      const end = min([monthEnd, endOfDay(now)]);
      return {
        key: `m${i}`,
        start: startOfDay(m),
        end,
        label: format(m, "MMM yyyy", { locale: loc }),
      };
    });
  }

  const months = eachMonthOfInterval({ start: startOfYear(now), end: now });
  return months.map((m, i) => {
    const monthEnd = endOfMonth(m);
    const end = min([monthEnd, endOfDay(now)]);
    return {
      key: `ytd${i}`,
      start: startOfDay(m),
      end,
      label: format(m, "MMM yyyy", { locale: loc }),
    };
  });
}
