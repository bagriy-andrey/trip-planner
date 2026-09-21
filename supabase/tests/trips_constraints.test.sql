-- Constraint, index and trigger tests for public.trips (SPEC-03 AC-7).
--
-- The DB is the last line of defence: every check constraint gets one failing insert, and each failure
-- is asserted by its CONSTRAINT NAME (exact message), so a row rejected for a different reason
-- cannot make the test pass by accident. Runs as the superuser test runner (RLS is covered in
-- trips_rls.test.sql); pgTAP is enabled inside the transaction; everything rolls back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test');

-- Shape: exactly the 14 columns of the contract (no source / status / cover_index / currency) -------
select columns_are(
  'public', 'trips',
  array['id', 'user_id', 'destination', 'place_kind', 'place_id', 'country_code', 'iana_timezone',
        'airport_code', 'title', 'start_date', 'end_date', 'archived_at', 'created_at', 'updated_at'],
  'trips has exactly the 14 contract columns'
);
select has_index('public', 'trips', 'trips_user_id_start_date_idx', 'FK/list index (user_id, start_date)');
select has_index('public', 'trips', 'trips_user_id_archived_at_idx', 'FK/archive index (user_id, archived_at)');

-- Valid rows, including the boundaries ----------------------------------------------------------------
select lives_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city')$$,
  'valid: minimal trip (1-char destination, no dates)'
);
select lives_ok(
  format(
    $$insert into public.trips (user_id, destination, place_kind, place_id, country_code, iana_timezone,
                                airport_code, title, start_date, end_date)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', %L, 'city', 'geo:1', 'PT', 'Europe/Lisbon',
              'LIS', %L, '2026-01-01', '2027-01-01')$$,
    repeat('d', 80), repeat('t', 80)),
  'valid: full city trip at the boundaries (80-char destination and title, exactly 365 days)'
);
select lives_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'My hideout', 'custom')$$,
  'valid: custom place with no place metadata'
);
select lives_ok(
  $$insert into public.trips (user_id, destination, place_kind, country_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Portugal', 'country', 'PT')$$,
  'valid: country trip without an airport'
);

-- One failing insert per constraint ---------------------------------------------------------------------
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, start_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', '2026-05-01')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_dates_both_or_none"',
  'start_date without end_date is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, end_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', '2026-05-01')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_dates_both_or_none"',
  'end_date without start_date is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, start_date, end_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', '2026-05-02', '2026-05-01')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_dates_order"',
  'end_date before start_date is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, start_date, end_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', '2026-01-01', '2027-01-02')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_dates_max_span"',
  'a 366-day trip is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, iana_timezone)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'custom', 'Europe/Lisbon')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_custom_place_clean"',
  'custom place with a timezone is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, place_id)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'custom', 'geo:1')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_custom_place_clean"',
  'custom place with a place_id is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, country_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'custom', 'PT')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_custom_place_clean"',
  'custom place with a country_code is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, airport_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'custom', 'LIS')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_custom_place_clean"',
  'custom place with an airport_code is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, airport_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Portugal', 'country', 'LIS')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_country_no_airport"',
  'country trip with an airport is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '', 'city')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_destination_len"',
  'empty destination is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '   ', 'city')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_destination_len"',
  'spaces-only destination is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', E' \t\r\n ', 'city')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_destination_len"',
  'tab/newline-only destination is rejected (plain btrim() would let it through)'
);
select throws_ok(
  format(
    $$insert into public.trips (user_id, destination, place_kind)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', %L, 'city')$$, repeat('d', 81)),
  '23514', 'new row for relation "trips" violates check constraint "trips_destination_len"',
  '81-character destination is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, title)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', '')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_title_len"',
  'empty title is rejected (no title is NULL, not an empty string)'
);
select throws_ok(
  format(
    $$insert into public.trips (user_id, destination, place_kind, title)
      values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', %L)$$, repeat('t', 81)),
  '23514', 'new row for relation "trips" violates check constraint "trips_title_len"',
  '81-character title is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'planet')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_place_kind"',
  'unknown place_kind is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, country_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', 'pt')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_country_code_fmt"',
  'lower-case country_code is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, country_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', 'PRT')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_country_code_fmt"',
  'three-letter country_code is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, airport_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', 'lis')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_airport_code_fmt"',
  'lower-case airport_code is rejected'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind, airport_code)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X', 'city', 'LI')$$,
  '23514', 'new row for relation "trips" violates check constraint "trips_airport_code_fmt"',
  'two-letter airport_code is rejected'
);

-- NOT NULL and the foreign key ------------------------------------------------------------------------
select throws_ok(
  $$insert into public.trips (user_id, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'city')$$,
  '23502', null, 'destination is required'
);
select throws_ok(
  $$insert into public.trips (user_id, destination)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'X')$$,
  '23502', null, 'place_kind is required'
);
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'X', 'city')$$,
  '23503', null, 'user_id must reference an existing auth user'
);
select throws_ok(
  $$insert into public.trips (destination, place_kind) values ('X', 'city')$$,
  '23502', null, 'without a session (auth.uid() is null) user_id has no default and is required'
);

-- updated_at trigger ----------------------------------------------------------------------------------
-- now() is frozen inside a transaction, so the row is created with an old timestamp to make a bump visible.
insert into public.trips (id, user_id, destination, place_kind, created_at, updated_at)
values ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Lisbon', 'city',
        '2020-01-01 00:00:00+00', '2020-01-01 00:00:00+00');

update public.trips set title = 'Renamed', updated_at = '2000-01-01 00:00:00+00'
 where id = 'a0000000-0000-4000-8000-000000000001';

select is(
  (select updated_at from public.trips where id = 'a0000000-0000-4000-8000-000000000001'),
  now(),
  'update: the trigger sets updated_at to now(), overriding a client-written value'
);
select is(
  (select created_at from public.trips where id = 'a0000000-0000-4000-8000-000000000001'),
  '2020-01-01 00:00:00+00'::timestamptz,
  'update: created_at is left alone'
);

select * from finish();
rollback;
