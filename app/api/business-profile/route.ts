import { NextResponse } from "next/server";
import { z } from "zod";

import { getCountryByCode } from "@/lib/countries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const patchBodySchema = z.object({
  businessName: z.string().min(1),
  ownerName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  city: z.string().min(1),
  countryCode: z.string().min(1),
  stateProvince: z.string().min(1),
  zip: z.string().optional(),
});

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const country = getCountryByCode(values.countryCode);
  if (!country) {
    return NextResponse.json({ error: "Invalid country code" }, { status: 400 });
  }

  const { error } = await supabase
    .from("business_profiles")
    .update({
      business_name: values.businessName,
      owner_name: values.ownerName,
      phone: values.phone,
      email: values.email,
      city: values.city,
      state_province: values.stateProvince,
      zip_code: values.zip?.trim() || null,
      country_code: country.code,
      currency_code: country.currencyCode,
      currency_symbol: country.currencySymbol,
    })
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
