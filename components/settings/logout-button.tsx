"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  locale: string;
};

export function LogoutButton({ locale }: LogoutButtonProps) {
  const t = useTranslations("settingsPage");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace(`/${locale}/login`);
    router.refresh();
  }

  return (
    <button
      type="button"
      className="h-11 w-full rounded-md bg-[#F26522] text-sm font-medium text-white disabled:opacity-50"
      onClick={() => void handleLogout()}
      disabled={loading}
    >
      {loading ? t("loggingOut") : t("logOut")}
    </button>
  );
}
