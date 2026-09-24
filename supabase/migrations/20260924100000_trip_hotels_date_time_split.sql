-- Hotel check-in/out: required local DATES + optional local TIMES (replaces the two instants).

alter table public.trip_hotels
  add column check_in_date  date,
  add column check_out_date date,
  add column check_in_time  time,
  add column check_out_time time;

-- Backfill: the old instants read on the wall clock of the row's own time zone.
update public.trip_hotels set
  check_in_date  = (check_in_at  at time zone time_zone)::date,
  check_out_date = (check_out_at at time zone time_zone)::date,
  check_in_time  = date_trunc('minute', check_in_at  at time zone time_zone)::time,
  check_out_time = date_trunc('minute', check_out_at at time zone time_zone)::time;

alter table public.trip_hotels
  alter column check_in_date  set not null,
  alter column check_out_date set not null;

alter table public.trip_hotels
  drop constraint trip_hotels_stay_order,
  drop constraint trip_hotels_stay_max;
drop index public.trip_hotels_trip_id_check_in_at_idx;
alter table public.trip_hotels drop column check_in_at, drop column check_out_at;

alter table public.trip_hotels
  add constraint trip_hotels_stay_order check (check_out_date >= check_in_date),
  add constraint trip_hotels_stay_max   check (check_out_date - check_in_date <= 365),
  add constraint trip_hotels_stay_times check (check_in_time is null or check_out_time is null
                                               or check_out_date > check_in_date
                                               or check_out_time > check_in_time);

create index trip_hotels_trip_id_check_in_date_idx on public.trip_hotels (trip_id, check_in_date);
