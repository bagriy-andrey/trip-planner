-- SPEC-06: one optional "about me" row per user. Lazy upsert: no row = every field empty.
create table public.profiles (
  user_id                  uuid primary key default auth.uid()
                           references auth.users (id) on delete cascade,
  citizenship_country_code text,
  residence_country_code   text,
  home_city_place_id       text,
  home_airport_code        text,
  home_currency            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),

  constraint profiles_citizenship_fmt   check (citizenship_country_code is null
                                               or citizenship_country_code ~ '^[A-Z]{2}$'),
  constraint profiles_residence_fmt     check (residence_country_code is null
                                               or residence_country_code ~ '^[A-Z]{2}$'),
  constraint profiles_home_city_fmt     check (home_city_place_id is null
                                               or (char_length(home_city_place_id) <= 64
                                                   and home_city_place_id ~ '^city-[a-z0-9-]+$')),
  constraint profiles_home_airport_fmt  check (home_airport_code is null
                                               or home_airport_code ~ '^[A-Z]{3}$'),
  constraint profiles_home_currency_fmt check (home_currency is null
                                               or home_currency ~ '^[A-Z]{3}$')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- No delete policy: clearing a field writes null; the row goes only with the user (cascade).
