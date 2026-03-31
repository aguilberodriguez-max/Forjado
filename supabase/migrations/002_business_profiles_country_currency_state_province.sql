-- Location + currency columns for business_profiles (idempotent).
-- Run after 001 or standalone: adds any missing columns.

alter table public.business_profiles
  add column if not exists country_code text,
  add column if not exists currency_code text,
  add column if not exists currency_symbol text,
  add column if not exists state_province text;

comment on column public.business_profiles.country_code is 'ISO 3166-1 alpha-2';
comment on column public.business_profiles.currency_code is 'ISO 4217';
comment on column public.business_profiles.currency_symbol is 'Display symbol for UI/PDF';
comment on column public.business_profiles.state_province is 'State, province, or region';

-- If a legacy `state` column exists, copy into state_province once.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_profiles'
      and column_name = 'state'
  ) then
    update public.business_profiles
    set state_province = coalesce(state_province, state)
    where state_province is null
      and state is not null;
  end if;
end $$;
