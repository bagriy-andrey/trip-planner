-- SPEC-04 / PLAN-04 §1.1: first table with OWNERSHIP DERIVED THROUGH A PARENT (no `user_id`
-- column on this table). A segment belongs to the trip's owner via `trip_id -> trips.user_id`
-- (`supabase/insights.md` 2026-09-22): the ownership check must be duplicated in every policy,
-- not stored as a denormalised copy on the child.

create table public.trip_segments (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  mode              text not null,
  source            text not null default 'manual',
  flight_number     text,
  carrier_code      text,
  from_airport_code text not null,
  from_time_zone    text not null,
  to_airport_code   text not null,
  to_time_zone      text not null,
  departure_at      timestamptz not null,
  arrival_at        timestamptz,
  baggage_included  boolean not null default false,
  passengers        smallint not null default 1,
  seat              text,
  ticket_number     text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint trip_segments_mode        check (mode in ('flight','train','car','bus')),
  constraint trip_segments_source      check (source in ('manual','imported_pending','imported_confirmed')),
  constraint trip_segments_from_fmt    check (from_airport_code ~ '^[A-Z]{3}$'),
  constraint trip_segments_to_fmt      check (to_airport_code ~ '^[A-Z]{3}$'),
  constraint trip_segments_airports    check (from_airport_code <> to_airport_code),
  constraint trip_segments_from_tz_fmt check (from_time_zone ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)+$'),
  constraint trip_segments_to_tz_fmt   check (to_time_zone   ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+)+$'),
  constraint trip_segments_arrival     check (arrival_at is null or arrival_at > departure_at),
  constraint trip_segments_duration    check (arrival_at is null
                                              or arrival_at - departure_at <= interval '48 hours'),
  constraint trip_segments_passengers  check (passengers between 1 and 9),
  constraint trip_segments_flight_no   check (flight_number is null
                                              or (char_length(flight_number) between 1 and 10
                                                  and flight_number !~ '\s')),
  constraint trip_segments_carrier_fmt check (carrier_code is null or carrier_code ~ '^[A-Z0-9]{2}$'),
  constraint trip_segments_carrier_src check (carrier_code is null or flight_number is not null),
  constraint trip_segments_seat_len    check (seat is null
                                              or (char_length(seat) <= 16
                                                  and btrim(seat, E' \t\r\n') <> '')),
  constraint trip_segments_ticket_len  check (ticket_number is null
                                              or (char_length(ticket_number) <= 32
                                                  and btrim(ticket_number, E' \t\r\n') <> ''))
);

-- Segments of a trip are listed ordered by departure; also backs the FK.
create index trip_segments_trip_id_departure_at_idx
  on public.trip_segments (trip_id, departure_at);

-- Reuses the trigger function created by the `trips` migration; do not redefine it here.
create trigger trip_segments_set_updated_at
  before update on public.trip_segments
  for each row execute function public.set_updated_at();

-- RLS: ownership derived through the parent trip, not a direct `user_id` column. Every policy
-- re-checks `trips.user_id` via `trip_id`; `update` needs the check in BOTH `using` (can't touch
-- someone else's segment) AND `with check` (can't move a segment into someone else's trip).
alter table public.trip_segments enable row level security;

create policy trip_segments_select_own on public.trip_segments for select to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));

create policy trip_segments_insert_own on public.trip_segments for insert to authenticated
  with check (exists (select 1 from public.trips t
                      where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));

create policy trip_segments_update_own on public.trip_segments for update to authenticated
  using      (exists (select 1 from public.trips t
                      where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t
                      where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));

create policy trip_segments_delete_own on public.trip_segments for delete to authenticated
  using (exists (select 1 from public.trips t
                 where t.id = trip_segments.trip_id and t.user_id = (select auth.uid())));
