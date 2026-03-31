import { redirect } from "next/navigation";

import { ClientForm } from "@/components/clients/client-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function EditClientPage({ params }: Props) {
  const { locale, id } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [{ data: profile }, { data: client }] = await Promise.all([
    supabase.from("business_profiles").select("country_code").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("clients")
      .select(
        "id,name,phone,email,street_address,city,state,zip_code,country_code",
      )
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!client) {
    redirect(`/${locale}/clients`);
  }

  return (
    <div className="min-h-screen min-h-dvh bg-[#0A0A0A] pb-24 text-white">
      <ClientForm
        mode="edit"
        locale={locale}
        userId={user.id}
        clientId={client.id}
        defaultCountryCode={profile?.country_code ?? client.country_code ?? "US"}
        initial={{
          name: client.name,
          phone: client.phone,
          email: client.email,
          street_address: client.street_address,
          city: client.city,
          state: client.state,
          zip_code: client.zip_code,
          country_code: client.country_code,
        }}
      />
    </div>
  );
}
