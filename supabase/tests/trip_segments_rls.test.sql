-- RLS + ownership tests for public.trip_segments (SPEC-04 AC-2..AC-7).
--
-- trip_segments is the first table whose ownership is derived THROUGH A PARENT (`trip_id ->
-- trips.user_id`), not a direct `user_id` column (`supabase/insights.md` 2026-09-22). Every
-- policy re-derives ownership via `exists (select 1 from trips where trips.id = trip_id and
-- trips.user_id = auth.uid())`; this file proves both halves of `update` (using + with check)
-- and both cascades (trip deleted, auth user deleted).
--
-- Conventions reused from trips_rls.test.sql:
--  * pgTAP is enabled INSIDE the test transaction; nothing extra lands in the prod schema.
--  * Users are plain `insert into auth.users (id, email)` rows.
--  * Identity switch: `set local role authenticated` + `set local "request.jwt.claims" = '{...}'`
--    (auth.uid() reads `sub` from it); anonymous: `set local role anon`; back to superuser: `reset role`.
--  * An RLS denial is ZERO ROWS (select / update / delete), asserted as a count -- not as an error.
--    Only an INSERT / UPDATE whose NEW row violates `with check` raises (SQLSTATE 42501).
--  * The whole file is `begin; ... rollback;` -- nothing persists.

begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

-- Fixtures (as the superuser test runner: RLS does not apply to it) -------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@example.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@example.test');

insert into public.trips (id, user_id, destination, place_kind) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Lisbon',  'city'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Tbilisi', 'city'),
  ('c0000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Oslo',    'city');

insert into public.trip_segments
  (id, trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
values
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'flight',
   'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-01 10:00:00+00'),
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'flight',
   'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-02 10:00:00+00'),
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'flight',
   'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-03 10:00:00+00');

-- Structure ---------------------------------------------------------------------------------------
select ok(
  (select relrowsecurity from pg_class where oid = 'public.trip_segments'::regclass),
  'RLS is enabled on public.trip_segments'
);
select policies_are(
  'public', 'trip_segments',
  array['trip_segments_select_own', 'trip_segments_insert_own', 'trip_segments_update_own',
        'trip_segments_delete_own'],
  'trip_segments has exactly the four owner-through-parent policies'
);

-- Owner (user A): select / insert / update / delete own trip's segments (AC-2) ---------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select is((select count(*)::int from public.trip_segments), 1, 'owner select: sees exactly own segment');

select lives_ok(
  $$insert into public.trip_segments
      (id, trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'flight',
            'CDG', 'Europe/Paris', 'FCO', 'Europe/Rome', '2026-05-05 10:00:00+00')$$,
  'owner insert: segment on own trip is accepted'
);

with u as (
  update public.trip_segments set seat = '12A'
   where id = 'e0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from u), 1, 'owner update: own segment is updated');

with d as (
  delete from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000004' returning 1
)
select is((select count(*)::int from d), 1, 'owner delete: own segment is deleted');

-- insert with someone else's trip_id or a nonexistent trip_id is rejected (AC-4) --------------------
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('b0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-06 10:00:00+00')$$,
  '42501', null,
  'insert into someone else''s trip is rejected'
);
select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('dddddddd-0000-4000-8000-000000000000', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-06 10:00:00+00')$$,
  '42501', null,
  'insert with a nonexistent trip_id is rejected (no trip to derive ownership from)'
);

-- Another user (B) against A's segments: zero rows, NOT an error (AC-3) -----------------------------
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select count(*)::int from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001'),
  0, 'other user select: A''s segment is invisible (0 rows)'
);
select is((select count(*)::int from public.trip_segments), 1, 'other user select: sees only own segment');

with u as (
  update public.trip_segments set seat = '99Z'
   where id = 'e0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from u), 0, 'other user update: 0 rows affected, no error');

with d as (
  delete from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from d), 0, 'other user delete: 0 rows affected, no error');

-- update that tries to move a segment into another user's trip is rejected (AC-5) -------------------
select throws_ok(
  $$update public.trip_segments set trip_id = 'a0000000-0000-4000-8000-000000000001'
     where id = 'e0000000-0000-4000-8000-000000000002'$$,
  '42501', null,
  'moving own segment into someone else''s trip violates WITH CHECK'
);
select is(
  (select trip_id from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000002'),
  'b0000000-0000-4000-8000-000000000001'::uuid,
  'the rejected re-assignment left trip_id unchanged'
);

-- anon: nothing at all (AC-6) ------------------------------------------------------------------------
set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';

select is((select count(*)::int from public.trip_segments), 0, 'anon select: 0 rows');

with u as (
  update public.trip_segments set seat = '1A'
   where id = 'e0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from u), 0, 'anon update: 0 rows affected');

with d as (
  delete from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from d), 0, 'anon delete: 0 rows affected');

select throws_ok(
  $$insert into public.trip_segments
      (trip_id, mode, from_airport_code, from_time_zone, to_airport_code, to_time_zone, departure_at)
    values ('a0000000-0000-4000-8000-000000000001', 'flight',
            'JFK', 'America/New_York', 'LHR', 'Europe/London', '2026-05-07 10:00:00+00')$$,
  '42501', null,
  'anon insert is rejected'
);

-- Back to the superuser: nothing above changed anyone's data ------------------------------------------
reset role;

select is(
  (select seat from public.trip_segments where id = 'e0000000-0000-4000-8000-000000000001'),
  '12A',
  'A''s segment survived B and anon untouched (only the owner''s own update applied)'
);
select is(
  (select count(*)::int from public.trip_segments),
  3, 'no denied statement removed or added a segment'
);

-- Cascade: deleting the trip leaves no segments (AC-7) -------------------------------------------------
select is(
  (select count(*)::int from public.trip_segments where trip_id = 'c0000000-0000-4000-8000-000000000001'),
  1, 'precondition: trip C has a segment'
);
select lives_ok(
  $$delete from public.trips where id = 'c0000000-0000-4000-8000-000000000001'$$,
  'deleting the trip succeeds'
);
select is(
  (select count(*)::int from public.trip_segments where trip_id = 'c0000000-0000-4000-8000-000000000001'),
  0, 'cascade: the deleted trip''s segments are gone'
);

-- Cascade: deleting the auth user leaves no segments (AC-7, account deletion) ---------------------------
select is(
  (select count(*)::int from public.trip_segments where trip_id = 'b0000000-0000-4000-8000-000000000001'),
  1, 'precondition: trip B (owned by user B) has a segment'
);
select lives_ok(
  $$delete from auth.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  'deleting the auth user succeeds (cascades through trips into trip_segments)'
);
select is(
  (select count(*)::int from public.trip_segments where trip_id = 'b0000000-0000-4000-8000-000000000001'),
  0, 'cascade: the deleted user''s segments are gone (via the deleted trip)'
);
select is(
  (select count(*)::int from public.trip_segments),
  1, 'cascade: only user A''s segment remains'
);

select * from finish();
rollback;
