import { differenceInCalendarDays } from "date-fns";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BottomNav } from "@/components/layout/bottom-nav";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { LogoutButton } from "@/components/settings/logout-button";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const t = await getTranslations("settingsPage");
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select(
      "business_name,owner_name,phone,email,city,state,zip_code,country_code,subscription_status,trial_ends_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const trialDaysLeft =
    profile?.subscription_status === "trialing" && profile.trial_ends_at
      ? Math.max(0, differenceInCalendarDays(new Date(profile.trial_ends_at), new Date()))
      : null;

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0A0A0A]/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[400px] items-center px-4">
          <h1 className="text-xl font-semibold">{t("title")}</h1>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[400px] flex-col gap-4 px-4 py-4">
        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          {profile ? (
            <BusinessProfileForm
              userId={user.id}
              initial={{
                business_name: profile.business_name,
                owner_name: profile.owner_name,
                phone: profile.phone,
                email: profile.email,
                city: profile.city,
                state: profile.state,
                zip_code: profile.zip_code,
                country_code: profile.country_code,
              }}
            />
          ) : (
            <p className="text-sm text-[#A3A3A3]">—</p>
          )}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="mb-2 text-sm font-medium text-[#A3A3A3]">{t("language.title")}</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/en/settings`}
              className={`rounded-md border px-3 py-2 text-center text-sm ${
                locale === "en"
                  ? "border-[#F26522] bg-[#F26522]/15 text-[#F26522]"
                  : "border-white/10 text-[#A3A3A3]"
              }`}
            >
              {t("language.english")}
            </Link>
            <Link
              href={`/es/settings`}
              className={`rounded-md border px-3 py-2 text-center text-sm ${
                locale === "es"
                  ? "border-[#F26522] bg-[#F26522]/15 text-[#F26522]"
                  : "border-white/10 text-[#A3A3A3]"
              }`}
            >
              {t("language.spanish")}
            </Link>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="mb-2 text-sm font-medium text-[#A3A3A3]">{t("subscription.title")}</h2>
          <p className="text-sm">{t(`subscription.plan.${profile?.subscription_status ?? "active"}`)}</p>
          {trialDaysLeft !== null ? (
            <p className="mt-1 text-sm text-yellow-300">
              {t("subscription.trialDaysLeft", { days: trialDaysLeft })}
            </p>
          ) : null}
        </section>

        <section className="rounded-xl border border-white/10 bg-[#1A1A1A] p-4">
          <h2 className="mb-3 text-sm font-medium text-[#A3A3A3]">{t("account.title")}</h2>
          <LogoutButton locale={locale} />
        </section>
      </main>
      <BottomNav locale={locale} />
    </div>
  );
}
