"use client";

import {
  Plus,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
type ClientRow = {
  id: string;
  name: string;
  phone?: string | null;
  lastJobDate?: string | null;
};

type Props = { clients: ClientRow[] };

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClientsListClient({ clients }: Props) {
  const t = useTranslations("clients");
  const locale = useLocale();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, query]);

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center justify-between px-4">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <Link href={`/${locale}/clients/new`} className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F26522] text-white"><Plus className="h-4 w-4" /></Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[400px] flex-col gap-3 px-4 py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white"
        />
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#1A1A1A] p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F26522]/20 text-sm font-semibold text-[#F26522]">
                {initials(c.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="text-xs text-[#A3A3A3]">{c.phone ?? "—"}</p>
              </div>
              <p className="text-xs text-[#A3A3A3]">
                {c.lastJobDate ? new Date(c.lastJobDate).toLocaleDateString(locale) : t("noJobs")}
              </p>
            </div>
          ))}
        </div>
      </main>
      <BottomNav locale={locale} />
    </div>
  );
}
