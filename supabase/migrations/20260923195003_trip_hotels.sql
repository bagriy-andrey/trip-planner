-- SPEC-05 / PLAN-05: trip_hotels (ownership derived through trips, no own user_id).

create table public.trip_hotels (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid not null references public.trips (id) on delete cascade,
  source         text not null default 'manual',
  name           text not null,
  city_place_id  text not null,
  time_zone      text not null,
  address        text,
  maps_url       text,
  check_in_at    timestamptz not null,
  check_out_at   timestamptz not null,
  guests         smallint not null default 1,
  parking        text not null default 'none',
  breakfast      text not null default 'none',
  breakfast_days smallint,
  cost_amount    numeric(12,2),
  cost_currency  text,
  booking_ref    text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint trip_hotels_source        check (source in ('manual','imported_pending','imported_confirmed')),
  constraint trip_hotels_name_len      check (char_length(name) between 1 and 120
                                              and btrim(name, E' \t\r\n') <> ''),
  constraint trip_hotels_city_fmt      check (city_place_id ~ '^city-[a-z0-9-]+$'),
  constraint trip_hotels_tz_fmt        check (time_zone ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)+$'),
  constraint trip_hotels_address_len   check (address is null
                                              or (char_length(address) <= 300
                                                  and btrim(address, E' \t\r\n') <> '')),
  constraint trip_hotels_maps_url      check (maps_url is null
                                              or (char_length(maps_url) <= 2048
                                                  and maps_url ~ '^https://(www\.google\.com/maps|google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl/maps)([/?#]|$)')),
  constraint trip_hotels_stay_order    check (check_out_at > check_in_at),
  constraint trip_hotels_stay_max      check (check_out_at - check_in_at <= interval '367 days'),
  constraint trip_hotels_guests        check (guests between 1 and 9),
  constraint trip_hotels_parking       check (parking in ('none','free','paid')),
  constraint trip_hotels_breakfast     check (breakfast in ('all','partial','none')),
  constraint trip_hotels_bdays_partial check ((breakfast_days is not null) = (breakfast = 'partial')),
  constraint trip_hotels_bdays_range   check (breakfast_days is null or breakfast_days between 1 and 365),
  constraint trip_hotels_cost_pair     check ((cost_amount is null) = (cost_currency is null)),
  constraint trip_hotels_cost_amount   check (cost_amount is null or cost_amount >= 0),
  constraint trip_hotels_currency_fmt  check (cost_currency is null or cost_currency ~ '^[A-Z]{3}$'),
  constraint trip_hotels_ref_len       check (booking_ref is null
                                              or (char_length(booking_ref) <= 32
                                                  and btrim(booking_ref, E' \t\r\n') <> '')),
  constraint trip_hotels_notes_len     check (notes is null
                                              or (char_length(notes) <= 1000
                                                  and btrim(notes, E' \t\r\n') <> ''))
);

create index trip_hotels_trip_id_check_in_at_idx on public.trip_hotels (trip_id, check_in_at);

create trigger trip_hotels_set_updated_at
  before update on public.trip_hotels
  for each row execute function public.set_updated_at();

alter table public.trip_hotels enable row level security;

create policy trip_hotels_select_own on public.trip_hotels for select to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
create policy trip_hotels_insert_own on public.trip_hotels for insert to authenticated
  with check (exists (select 1 from public.trips t
                      where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
create policy trip_hotels_update_own on public.trip_hotels for update to authenticated
  using      (exists (select 1 from public.trips t
                      where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t
                      where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
create policy trip_hotels_delete_own on public.trip_hotels for delete to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_hotels.trip_id and t.user_id = (select auth.uid())));
