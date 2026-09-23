-- RLS + ownership tests for public.trip_hotels (SPEC-05 AC-2..AC-5). Ownership is derived through
-- the parent trip (no user_id). Every count is restricted to THIS file's fixture trips so the file
-- stays green on a non-empty local database. Denial = zero rows (select/update/delete) or 42501
-- (insert / with-check violation). Rolls back.

begin;
create extension if not exists pgtap with schema extensions;
select plan(27);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@example.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@example.test');
insert into public.trips (id, user_id, destination, place_kind) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Lisbon', 'city'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Tbilisi', 'city'),
  ('c0000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Oslo', 'city');
insert into public.trip_hotels (id, trip_id, name, city_place_id, time_zone, check_in_at, check_out_at) values ('e2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'H', 'city-porto', 'Europe/Lisbon', '2026-06-01 14:00+00', '2026-06-02 10:00+00');
insert into public.trip_hotels (id, trip_id, name, city_place_id, time_zone, check_in_at, check_out_at) values ('e2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', 'H', 'city-porto', 'Europe/Lisbon', '2026-06-02 14:00+00', '2026-06-03 10:00+00');
insert into public.trip_hotels (id, trip_id, name, city_place_id, time_zone, check_in_at, check_out_at) values ('e2000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'H', 'city-porto', 'Europe/Lisbon', '2026-06-03 14:00+00', '2026-06-04 10:00+00');

select ok((select relrowsecurity from pg_class where oid = 'public.trip_hotels'::regclass), 'RLS is enabled on public.trip_hotels');
select policies_are('public', 'trip_hotels', array['trip_hotels_select_own','trip_hotels_insert_own','trip_hotels_update_own','trip_hotels_delete_own'], 'exactly the four owner-through-parent policies');
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is((select count(*)::int from public.trip_hotels where trip_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')), 1, 'owner select: sees exactly own hotel among fixtures');
select lives_ok($q$insert into public.trip_hotels (id, trip_id, name, city_place_id, time_zone, check_in_at, check_out_at) values ('e2000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'H', 'city-porto', 'Europe/Lisbon', '2026-06-05 14:00+00', '2026-06-06 10:00+00')$q$, 'owner insert: hotel on own trip accepted');
with u as (update public.trip_hotels set notes = 'x' where id = 'e2000000-0000-4000-8000-000000000001' returning 1) select is((select count(*)::int from u), 1, 'owner update: own hotel updated');
with d as (delete from public.trip_hotels where id = 'e2000000-0000-4000-8000-000000000004' returning 1) select is((select count(*)::int from d), 1, 'owner delete: own hotel deleted');
select throws_ok($q$insert into public.trip_hotels (trip_id, name, city_place_id, time_zone, check_in_at, check_out_at) values ('b0000000-0000-4000-8000-000000000001', 'H', 'city-porto', 'Europe/Lisbon', '2026-06-06 14:00+00', '2026-06-07 10:00+00')$q$, '42501', null, 'insert into someone else''s trip is rejected');
select throws_ok($q$insert into public.trip_hotels (trip_id, name, city_place_id, time_zone, check_in_at, check_out_at) values ('dddddddd-0000-4000-8000-000000000000', 'H', 'city-porto', 'Europe/Lisbon', '2026-06-06 14:00+00', '2026-06-07 10:00+00')$q$, '42501', null, 'insert with nonexistent trip_id is rejected');
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
select is((select count(*)::int from public.trip_hotels where id = 'e2000000-0000-4000-8000-000000000001'), 0, 'other user select: A''s hotel invisible');
select is((select count(*)::int from public.trip_hotels where trip_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')), 1, 'other user select: sees only own hotel among fixtures');
with u as (update public.trip_hotels set notes = 'z' where id = 'e2000000-0000-4000-8000-000000000001' returning 1) select is((select count(*)::int from u), 0, 'other user update: 0 rows, no error');
with d as (delete from public.trip_hotels where id = 'e2000000-0000-4000-8000-000000000001' returning 1) select is((select count(*)::int from d), 0, 'other user delete: 0 rows, no error');
select throws_ok($q$update public.trip_hotels set trip_id = 'a0000000-0000-4000-8000-000000000001' where id = 'e2000000-0000-4000-8000-000000000002'$q$, '42501', null, 'moving own hotel into someone else''s trip violates WITH CHECK');
select is((select trip_id from public.trip_hotels where id = 'e2000000-0000-4000-8000-000000000002'), 'b0000000-0000-4000-8000-000000000001'::uuid, 'rejected re-assignment left trip_id unchanged');
set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';
select is((select count(*)::int from public.trip_hotels where trip_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')), 0, 'anon select: 0 rows');
with u as (update public.trip_hotels set notes = 'a' where id = 'e2000000-0000-4000-8000-000000000001' returning 1) select is((select count(*)::int from u), 0, 'anon update: 0 rows');
with d as (delete from public.trip_hotels where id = 'e2000000-0000-4000-8000-000000000001' returning 1) select is((select count(*)::int from d), 0, 'anon delete: 0 rows');
select throws_ok($q$insert into public.trip_hotels (trip_id, name, city_place_id, time_zone, check_in_at, check_out_at) values ('a0000000-0000-4000-8000-000000000001', 'H', 'city-porto', 'Europe/Lisbon', '2026-06-07 14:00+00', '2026-06-08 10:00+00')$q$, '42501', null, 'anon insert is rejected');
reset role;
select is((select notes from public.trip_hotels where id = 'e2000000-0000-4000-8000-000000000001'), 'x', 'A''s hotel survived B and anon (only the owner update applied)');
select is((select count(*)::int from public.trip_hotels where trip_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')), 3, 'no denied statement removed or added a hotel');
select is((select count(*)::int from public.trip_hotels where trip_id = 'c0000000-0000-4000-8000-000000000001'), 1, 'precondition: trip C has a hotel');
select lives_ok($q$delete from public.trips where id = 'c0000000-0000-4000-8000-000000000001'$q$, 'deleting the trip succeeds');
select is((select count(*)::int from public.trip_hotels where trip_id = 'c0000000-0000-4000-8000-000000000001'), 0, 'cascade: deleted trip''s hotels are gone');
select is((select count(*)::int from public.trip_hotels where trip_id = 'b0000000-0000-4000-8000-000000000001'), 1, 'precondition: trip B has a hotel');
select lives_ok($q$delete from auth.users where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$q$, 'deleting the auth user succeeds (cascades via trips)');
select is((select count(*)::int from public.trip_hotels where trip_id = 'b0000000-0000-4000-8000-000000000001'), 0, 'cascade: deleted user''s hotels are gone');
select is((select count(*)::int from public.trip_hotels where trip_id in ('a0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001')), 1, 'cascade: only user A''s hotel remains among fixtures');

select * from finish();
rollback;
