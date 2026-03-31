-- Country + currency for business and clients (run against your Supabase project).

alter table business_profiles
  add column if not exists country_code text,
  add column if not exists currency_code text,
  add column if not exists currency_symbol text;

alter table clients
  add column if not exists country_code text;

comment on column business_profiles.country_code is 'ISO 3166-1 alpha-2';
comment on column business_profiles.currency_code is 'ISO 4217';
comment on column business_profiles.currency_symbol is 'Display symbol for UI/PDF';
comment on column clients.country_code is 'ISO 3166-1 alpha-2';
