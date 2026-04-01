"use client";

import { useTranslations } from "next-intl";

/** Local device hour (0–23) → translation key. Uses same ranges on every render. */
function greetingKeyFromHour(hour: number) {
  if (hour >= 5 && hour <= 11) {
    return "greetingMorning" as const;
  }
  if (hour >= 12 && hour <= 17) {
    return "greetingAfternoon" as const;
  }
  if (hour >= 18 && hour <= 20) {
    return "greetingEvening" as const;
  }
  return "greetingNight" as const;
}

type Props = {
  ownerName: string;
};

export function DashboardGreeting({ ownerName }: Props) {
  const t = useTranslations("dashboard");
  const hour = new Date().getHours();
  const key = greetingKeyFromHour(hour);
  return <h1 className="text-2xl font-bold">{t(key, { ownerName })}</h1>;
}
