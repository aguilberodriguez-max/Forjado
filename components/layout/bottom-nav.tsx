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
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0A0A0A]">
      <div className="mx-auto grid h-16 w-full max-w-[400px] grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 ${
                active ? "text-[#F26522]" : "text-[#A3A3A3]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="text-[11px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
