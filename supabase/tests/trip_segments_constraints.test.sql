-- Constraint, index, default and trigger tests for public.trip_segments (SPEC-04 AC-8).
--
-- The DB is the last line of defence: every check constraint gets one failing insert, and each
-- failure is asserted by its CONSTRAINT NAME (exact message), so a row rejected for a different
-- reason cannot make the test pass by accident. Runs as the superuser test runner (RLS is covered
-- in trip_segments_rls.test.sql); pgTAP is enabled inside the transaction; everything rolls back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test');
insert into public.trips (id, user_id, destination, place_kind) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Lisbon', 'city');

-- Shape: exactly the 17 columns of the contract (no user_id, no order_index, no money) -----------------
select columns_are(
  'public', 'trip_segments',
  array['id', 'trip_id', 'mode', 'source', 'flight_number', 'carrier_code', 'from_airport_code',
        'from_time_zone', 'to_airport_code', 'to_time_zone', 'departure_at', 'arrival_at',
        'baggage_included', 'passengers', 'seat', 'ticket_number', 'created_at', 'updated_at'],
  'trip_segments has exactly the 18 contract columns'
);
select has_index(
  'public', 'trip_segments', 'trip_segments_trip_id_departure_at_idx',
  'FK/list index (trip_id, departure_at)'
);

-- Valid rows, including the boundaries ------------------------------------------------------------------
select lives_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  'valid: minimal segment (only the required columns)'
);
select lives_ok(
  format(
    $$insert into public.trip_segments
        (trip_id, mode, flight_number, carrier_code, from_airport_code, from_time_zone,
         to_airport_code, to_time_zone, departure_at, arrival_at, baggage_included, passengers,
         seat, ticket_number)
      values ('a0000000-0000-4000-8000-000000000001', 'flight', 'LO12345', 'LO',
              'JFK', 'America/New_York', 'LHR', 'Europe/London',
              '2026-05-01 10:00:00+00', '2026-05-03 10:00:00+00', true, 9, %L, %L)$$,
    repeat('s', 16), repeat('t', 32)),
  'valid: full segment at the boundaries (exactly 48h duration, 9 passengers, 16/32-char seat/ticket)'
);

-- One failing insert per constraint ------------------------------------------------------------------------
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'plane',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_mode"',
  'unknown mode is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, source, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight', 'pending',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_source"',
  'unknown source is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'jfk', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_from_fmt"',
  'lower-case from_airport_code is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'lhr', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_to_fmt"',
  'lower-case to_airport_code is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'JFK', 'America/New_York', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_airports"',
  'identical from/to airport codes are rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'UTC', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_from_tz_fmt"',
  'from_time_zone without an Area/Location form is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'not-a-zone!', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_to_tz_fmt"',
  'to_time_zone with an invalid character is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
       departure_at, arrival_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London',
            '2026-05-01 10:00:00+00', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_arrival"',
  'arrival_at equal to departure_at is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
       departure_at, arrival_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London',
            '2026-05-01 10:00:00+00', '2026-05-03 10:00:01+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_duration"',
  '48h and 1 second duration is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
       departure_at, passengers)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00', 0)$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_passengers"',
  'zero passengers is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
       departure_at, passengers)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00', 10)$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_passengers"',
  '10 passengers is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, flight_number, from_airport_code, from_time_zone, to_airport_code,
       to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight', 'LO 1234',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_flight_no"',
  'flight_number containing a space is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, flight_number, from_airport_code, from_time_zone, to_airport_code,
       to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight', 'LO123456789',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_flight_no"',
  '11-character flight_number is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, flight_number, carrier_code, from_airport_code, from_time_zone,
       to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight', 'LO123', 'lo',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_carrier_fmt"',
  'lower-case carrier_code is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, flight_number, carrier_code, from_airport_code, from_time_zone,
       to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight', 'LO123', 'LOX',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_carrier_fmt"',
  'three-character carrier_code is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, carrier_code, from_airport_code, from_time_zone, to_airport_code,
       to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight', 'LO',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_carrier_src"',
  'carrier_code without a flight_number is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
       departure_at, seat)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00', E' \t\r\n ')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_seat_len"',
  'blank-only seat is rejected (plain btrim() would let it through)'
);
select throws_ok(
  format(
    $$insert into public.trip_segments
        (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
         departure_at, seat)
      values ('a0000000-0000-4000-8000-000000000001', 'flight',
              'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00', %L)$$,
    repeat('s', 17)),
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_seat_len"',
  '17-character seat is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
       departure_at, ticket_number)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00', '')$$,
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_ticket_len"',
  'empty ticket_number is rejected (no ticket is NULL, not an empty string)'
);
select throws_ok(
  format(
    $$insert into public.trip_segments
        (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone,
         departure_at, ticket_number)
      values ('a0000000-0000-4000-8000-000000000001', 'flight',
              'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00', %L)$$,
    repeat('t', 33)),
  '23514', 'new row for relation "trip_segments" violates check constraint "trip_segments_ticket_len"',
  '33-character ticket_number is rejected'
);

-- Defaults -----------------------------------------------------------------------------------------------
insert into public.trip_segments
  (id, trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'flight',
   'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00');

select is(
  (select source from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001'),
  'manual', 'default: source is manual'
);
select is(
  (select passengers from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001'),
  1::smallint, 'default: passengers is 1'
);
select is(
  (select baggage_included from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001'),
  false, 'default: baggage_included is false'
);

-- updated_at trigger ---------------------------------------------------------------------------------------
-- now() is frozen inside a transaction, so the row is created with an old timestamp to make a bump visible.
update public.trip_segments set created_at = '2020-01-01 00:00:00+00', updated_at = '2020-01-01 00:00:00+00'
 where id = 'e0000000-0000-4000-8000-000000000001';

update public.trip_segments set seat = '3B', updated_at = '2000-01-01 00:00:00+00'
 where id = 'e0000000-0000-4000-8000-000000000001';

select is(
  (select updated_at from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001'),
  now(),
  'update: the trigger sets updated_at to now(), overriding a client-written value'
);

select * from finish();
rollback;
