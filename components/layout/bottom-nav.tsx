"use client";

import {
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Receipt,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BottomNavProps = {
  locale: string;
};

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav({ locale }: BottomNavProps) {
  const t = useTranslations("bottomNav");
  const pathname = usePathname();

  const items = [
    {
      key: "dashboard",
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard,
      label: t("dashboard"),
    },
    {
      key: "estimates",
      href: `/${locale}/estimates`,
      icon: FileText,
      label: t("estimates"),
    },
    {
      key: "invoices",
      href: `/${locale}/invoices`,
      icon: CircleDollarSign,
      label: t("invoices"),
    },
    {
      key: "clients",
      href: `/${locale}/clients`,
      icon: Users,
      label: t("clients"),
    },
    {
      key: "expenses",
      href: `/${locale}/expenses`,
      icon: Receipt,
      label: t("expenses"),
    },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.08] bg-[#0B0B0D]/95 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-[#0B0B0D]/90">
      <div className="mx-auto grid h-[4.25rem] w-full max-w-[400px] grid-cols-5 px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? "text-[#F05A1A]"
                  : "text-[#A1A1AA] hover:text-[#F3F3F1]/90"
              }`}
            >
              <Icon className={`h-[18px] w-[18px] ${active ? "drop-shadow-[0_0_12px_rgba(240,90,26,0.35)]" : ""}`} />
              <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-tight tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
