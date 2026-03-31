import { redirect } from "next/navigation";

import { ClientsListClient } from "@/components/clients/clients-list-client";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ locale: string }> };

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
};

export default async function ClientsPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data } = await supabase
    .from("clients")
    .select("id,name,phone,created_at")
    .eq("user_id", user.id)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const clients = ((data ?? []) as ClientRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    lastJobDate: row.created_at,
  }));

  return <ClientsListClient clients={clients} />;
}
