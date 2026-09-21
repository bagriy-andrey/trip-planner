-- SPEC-03 / PLAN-03 §1.1: first table. A trip belongs to exactly one user (no companions in phase 1).
-- Dates are calendar dates (`date`), not instants: a trip "12–18 May" is the same on every device.

create table public.trips (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  destination   text not null,
  place_kind    text not null,
  place_id      text,
  country_code  text,
  iana_timezone text,
  airport_code  text,
  title         text,
  start_date    date,
  end_date      date,
  archived_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- btrim() alone strips only U+0020; tab / CR / LF are listed so a "blank" destination cannot slip through.
  constraint trips_destination_len   check (char_length(destination) between 1 and 80
                                            and btrim(destination, E' \t\r\n') <> ''),
  constraint trips_title_len         check (title is null or char_length(title) between 1 and 80),
  constraint trips_place_kind        check (place_kind in ('city','country','custom')),
  constraint trips_country_code_fmt  check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint trips_airport_code_fmt  check (airport_code is null or airport_code ~ '^[A-Z]{3}$'),
  constraint trips_dates_both_or_none check ((start_date is null) = (end_date is null)),
  constraint trips_dates_order        check (end_date is null or end_date >= start_date),
  constraint trips_dates_max_span     check (end_date is null or end_date - start_date <= 365),
  constraint trips_custom_place_clean check (place_kind <> 'custom'
                                             or (place_id is null and country_code is null
                                                 and iana_timezone is null and airport_code is null)),
  constraint trips_country_no_airport check (place_kind <> 'country' or airport_code is null)
);

-- Postgres does not index foreign keys by itself.
create index trips_user_id_start_date_idx on public.trips (user_id, start_date);
create index trips_user_id_archived_at_idx on public.trips (user_id, archived_at);

-- Keeps updated_at honest regardless of which client wrote the row.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- RLS: same migration as the table. All policies are `to authenticated`, so `anon` gets nothing.
alter table public.trips enable row level security;

create policy trips_select_own on public.trips for select to authenticated
  using (user_id = (select auth.uid()));
create policy trips_insert_own on public.trips for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy trips_update_own on public.trips for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy trips_delete_own on public.trips for delete to authenticated
  using (user_id = (select auth.uid()));
