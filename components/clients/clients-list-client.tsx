"use client";

import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import { BottomNav } from "@/components/layout/bottom-nav";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type ClientRow = {
  id: string;
  name: string;
  phone?: string | null;
  lastJobDate?: string | null;
};

type Props = { clients: ClientRow[] };

const SWIPE_REVEAL_PX = 80;

function ClientSwipeLink({ children }: { children: ReactNode }) {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);
  const startX = useRef(0);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        className="touch-pan-y"
        style={{
          transform: `translateX(${offset}px)`,
          transition:
            offset === 0 || offset === -SWIPE_REVEAL_PX ? "transform 0.2s ease-out" : "none",
        }}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX - offsetRef.current;
        }}
        onTouchMove={(e) => {
          const x = e.touches[0].clientX - startX.current;
          setOffset(Math.min(0, Math.max(-SWIPE_REVEAL_PX, x)));
        }}
        onTouchEnd={() => {
          setOffset((prev) => (prev < -SWIPE_REVEAL_PX / 2 ? -SWIPE_REVEAL_PX : 0));
        }}
      >
        {children}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function buildArchiveMessage(
  t: (key: string, values?: Record<string, string | number | Date>) => string,
  name: string,
  estimateCount: number,
  invoiceCount: number,
) {
  const lines: string[] = [t("delete.confirmLead", { name })];
  if (estimateCount > 0) {
    lines.push(t("delete.hasEstimates", { count: estimateCount }));
  }
  if (invoiceCount > 0) {
    lines.push(t("delete.hasInvoices", { count: invoiceCount }));
  }
  lines.push(t("delete.archiveNote"));
  return lines.join("\n\n");
}

export function ClientsListClient({ clients }: Props) {
  const t = useTranslations("clients");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, query]);

  async function archiveClient(client: ClientRow) {
    setActionError(null);
    const supabase = createBrowserSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return;
    }

    const [estRes, invRes] = await Promise.all([
      supabase
        .from("estimates")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id),
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("client_id", client.id),
    ]);

    const estimateCount = estRes.count ?? 0;
    const invoiceCount = invRes.count ?? 0;

    const message = buildArchiveMessage(t, client.name, estimateCount, invoiceCount);
    if (!window.confirm(message)) {
      return;
    }

    setDeletingId(client.id);
    const { error } = await supabase
      .from("clients")
      .update({ is_archived: true })
      .eq("id", client.id)
      .eq("user_id", user.id);

    setDeletingId(null);
    if (error) {
      setActionError(t("delete.error"));
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center justify-between px-4">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <Link
            href={`/${locale}/clients/new`}
            className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F26522] text-white"
          >
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[400px] flex-col gap-3 px-4 py-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="h-11 w-full rounded-md border border-white/10 bg-[#1A1A1A] px-3 text-white outline-none focus-visible:ring-2 focus-visible:ring-[#F26522]/50"
        />
        {actionError ? (
          <p className="rounded-md border border-[#EF4444]/40 bg-[#EF4444]/10 px-3 py-2 text-sm text-[#EF4444]">
            {actionError}
          </p>
        ) : null}
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="flex items-stretch gap-0 overflow-hidden rounded-xl border border-white/10 bg-[#1A1A1A]"
            >
              <ClientSwipeLink>
                <Link
                  href={`/${locale}/clients/${c.id}/edit`}
                  className="flex min-w-0 flex-1 items-center gap-3 p-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F26522]/20 text-sm font-semibold text-[#F26522]">
                    {initials(c.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{c.name}</p>
                    <p className="text-xs text-[#A3A3A3]">{c.phone ?? "—"}</p>
                  </div>
                  <p className="shrink-0 text-xs text-[#A3A3A3]">
                    {c.lastJobDate
                      ? new Date(c.lastJobDate).toLocaleDateString(locale)
                      : t("noJobs")}
                  </p>
                </Link>
              </ClientSwipeLink>
              <button
                type="button"
                onClick={() => void archiveClient(c)}
                disabled={deletingId === c.id}
                className={cn(
                  "inline-flex w-14 shrink-0 flex-col items-center justify-center gap-1 border-l border-red-400/30 bg-red-500/15 px-1 text-[10px] font-medium text-red-200 disabled:opacity-50 sm:w-16",
                )}
                aria-label={t("delete.label")}
                title={t("delete.label")}
              >
                <Trash2 className="h-5 w-5" />
                <span className="leading-tight">
                  {deletingId === c.id ? t("delete.archiving") : t("delete.shortLabel")}
                </span>
              </button>
            </div>
          ))}
        </div>
      </main>
      <BottomNav locale={locale} />
    </div>
  );
}
