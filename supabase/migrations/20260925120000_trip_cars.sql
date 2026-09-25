-- SPEC-07 / PLAN-07: trip_cars (ownership derived through trips, no own user_id, no time zone).

create table public.trip_cars (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  source            text not null default 'manual',
  booking_ref       text not null,
  company           text,
  pickup_place      text not null,
  pickup_date       date not null,
  pickup_time       time not null,
  return_date       date not null,
  return_time       time not null,
  return_same_place boolean not null default true,
  return_place      text,
  maps_url          text,
  address           text,
  phone             text,
  car_class         text,
  insurance         text,
  fuel_policy       text,
  cost_amount       numeric(12,2),
  cost_currency     text,
  payment_status    text,
  extra_driver      boolean not null default false,
  deposit_amount    numeric(12,2),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint trip_cars_source            check (source in ('manual','imported_pending','imported_confirmed')),
  constraint trip_cars_ref_len           check (char_length(booking_ref) between 1 and 32
                                                and btrim(booking_ref, E' \t\r\n') <> ''),
  constraint trip_cars_company_len       check (company is null or (char_length(company) <= 120
                                                and btrim(company, E' \t\r\n') <> '')),
  constraint trip_cars_pickup_place_len  check (char_length(pickup_place) between 1 and 300
                                                and btrim(pickup_place, E' \t\r\n') <> ''),
  constraint trip_cars_return_place_len  check (return_place is null or (char_length(return_place) <= 300
                                                and btrim(return_place, E' \t\r\n') <> '')),
  constraint trip_cars_return_place_pair check ((return_place is null) = return_same_place),
  constraint trip_cars_rental_order      check (return_date >= pickup_date),
  constraint trip_cars_rental_max        check (return_date - pickup_date <= 365),
  constraint trip_cars_rental_times      check (return_date > pickup_date or return_time > pickup_time),
  constraint trip_cars_maps_url          check (maps_url is null
                                                or (char_length(maps_url) <= 2048
                                                    and maps_url ~ '^https://(www\.google\.com/maps|google\.com/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl/maps)([/?#]|$)')),
  constraint trip_cars_address_len       check (address is null or (char_length(address) <= 300
                                                and btrim(address, E' \t\r\n') <> '')),
  constraint trip_cars_phone_fmt         check (phone is null or (char_length(phone) <= 32
                                                and regexp_replace(phone, '[ ()-]', '', 'g') ~ '^\+?[0-9]{3,15}$')),
  constraint trip_cars_class_len         check (car_class is null or (char_length(car_class) <= 120
                                                and btrim(car_class, E' \t\r\n') <> '')),
  constraint trip_cars_insurance         check (insurance is null or insurance in ('none','excess','full')),
  constraint trip_cars_fuel_policy       check (fuel_policy is null or fuel_policy in ('full_full','full_empty','other')),
  constraint trip_cars_payment_status    check (payment_status is null or payment_status in ('paid','on_site')),
  constraint trip_cars_cost_amount       check (cost_amount is null or cost_amount >= 0),
  constraint trip_cars_deposit_amount    check (deposit_amount is null or deposit_amount >= 0),
  constraint trip_cars_currency_fmt      check (cost_currency is null or cost_currency ~ '^[A-Z]{3}$'),
  constraint trip_cars_currency_pair     check ((cost_currency is null) = (cost_amount is null and deposit_amount is null)),
  constraint trip_cars_notes_len         check (notes is null or (char_length(notes) <= 1000
                                                and btrim(notes, E' \t\r\n') <> ''))
);

create index trip_cars_trip_id_pickup_idx on public.trip_cars (trip_id, pickup_date, pickup_time);

create trigger trip_cars_set_updated_at
  before update on public.trip_cars
  for each row execute function public.set_updated_at();

alter table public.trip_cars enable row level security;

create policy trip_cars_select_own on public.trip_cars for select to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_cars.trip_id and t.user_id = (select auth.uid())));
create policy trip_cars_insert_own on public.trip_cars for insert to authenticated
  with check (exists (select 1 from public.trips t
                      where t.id = trip_cars.trip_id and t.user_id = (select auth.uid())));
create policy trip_cars_update_own on public.trip_cars for update to authenticated
  using      (exists (select 1 from public.trips t
                      where t.id = trip_cars.trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t
                      where t.id = trip_cars.trip_id and t.user_id = (select auth.uid())));
create policy trip_cars_delete_own on public.trip_cars for delete to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_cars.trip_id and t.user_id = (select auth.uid())));
