import { redirect } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

export default async function NewClientPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("country_code")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <ClientForm
        mode="create"
        locale={locale}
        userId={user.id}
        defaultCountryCode={profile?.country_code ?? "US"}
      />
    </div>
  );
}
