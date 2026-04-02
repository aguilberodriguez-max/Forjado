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
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151518] px-5 py-6 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.65)]">
      <div
        className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[#F05A1A]/[0.12] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-[#F05A1A]/[0.06] blur-2xl"
        aria-hidden
      />
      <div className="relative border-l-2 border-[#F05A1A] pl-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#A1A1AA]">
          {t("brandName")}
        </p>
        <h1 className="mt-2 text-[1.65rem] font-semibold leading-snug tracking-tight text-[#F3F3F1] sm:text-[1.75rem]">
          {t(key, { ownerName })}
        </h1>
      </div>
    </div>
  );
}
