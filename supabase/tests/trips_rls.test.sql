-- RLS + ownership tests for public.trips (SPEC-03 AC-2..AC-6).
--
-- Conventions for every future table's test file (written down so the next one isn't guesswork):
--  * pgTAP is enabled INSIDE the test transaction; nothing extra lands in the prod schema.
--  * Users are plain `insert into auth.users (id, email)` rows: on the installed GoTrue schema
--    (`\d auth.users`) `id` is the only NOT NULL column without a default.
--  * Identity switch: `set local role authenticated` + `set local "request.jwt.claims" = '{...}'`
--    (auth.uid() reads `sub` from it); anonymous: `set local role anon`; back to superuser: `reset role`.
--  * An RLS denial is ZERO ROWS (select / update / delete), asserted as a count -- not as an error.
--    Only an INSERT / UPDATE whose NEW row violates `with check` raises (SQLSTATE 42501).
--  * The whole file is `begin; ... rollback;` -- nothing persists.

begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

-- Fixtures (as the superuser test runner: RLS does not apply to it) -------------------------------
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@example.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@example.test');

insert into public.trips (id, user_id, destination, place_kind) values
  ('a0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Lisbon',  'city'),
  ('b0000000-0000-4000-8000-000000000001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Tbilisi', 'city'),
  ('c0000000-0000-4000-8000-000000000001', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Oslo',    'city');

-- Structure ---------------------------------------------------------------------------------------
select ok(
  (select relrowsecurity from pg_class where oid = 'public.trips'::regclass),
  'RLS is enabled on public.trips'
);
select policies_are(
  'public', 'trips',
  array['trips_select_own', 'trips_insert_own', 'trips_update_own', 'trips_delete_own'],
  'trips has exactly the four owner policies'
);

-- Owner (user A): select / insert / update / delete own rows (AC-2) --------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select is((select count(*)::int from public.trips), 1, 'owner select: sees exactly own row');

select lives_ok(
  $$insert into public.trips (id, destination, place_kind)
    values ('a0000000-0000-4000-8000-000000000002', 'Porto', 'city')$$,
  'owner insert: user_id is filled from auth.uid() by the column default'
);
select is(
  (select user_id from public.trips where id = 'a0000000-0000-4000-8000-000000000002'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'owner insert: the default user_id is the caller'
);

with u as (
  update public.trips set title = 'Renamed' where id = 'a0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from u), 1, 'owner update: own row is updated');

with d as (
  delete from public.trips where id = 'a0000000-0000-4000-8000-000000000002' returning 1
)
select is((select count(*)::int from d), 1, 'owner delete: own row is deleted');

-- Another user (B) against A's rows: zero rows, NOT an error (AC-3) --------------------------------
set local "request.jwt.claims" = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';

select is(
  (select count(*)::int from public.trips where id = 'a0000000-0000-4000-8000-000000000001'),
  0, 'other user select: A''s row is invisible (0 rows)'
);
select is((select count(*)::int from public.trips), 1, 'other user select: sees only own row');

with u as (
  update public.trips set title = 'Hijacked' where id = 'a0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from u), 0, 'other user update: 0 rows affected, no error');

with d as (
  delete from public.trips where id = 'a0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from d), 0, 'other user delete: 0 rows affected, no error');

with u as (
  update public.trips set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
   where id = 'a0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from u), 0, 'other user: cannot take over A''s row (0 rows, invisible)');

-- Foreign user_id on insert / update is rejected (AC-5) -------------------------------------------
select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Stolen', 'city')$$,
  '42501', null,
  'insert with someone else''s user_id violates RLS'
);
select throws_ok(
  $$update public.trips set user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     where id = 'b0000000-0000-4000-8000-000000000001'$$,
  '42501', null,
  'update of own row to someone else''s user_id violates WITH CHECK'
);
select is(
  (select user_id from public.trips where id = 'b0000000-0000-4000-8000-000000000001'),
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid,
  'the rejected re-assignment left user_id unchanged'
);

-- anon: nothing at all (AC-4) ---------------------------------------------------------------------
set local role anon;
set local "request.jwt.claims" = '{"role":"anon"}';

select is((select count(*)::int from public.trips), 0, 'anon select: 0 rows');

with u as (
  update public.trips set title = 'Anon' where id = 'a0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from u), 0, 'anon update: 0 rows affected');

with d as (
  delete from public.trips where id = 'a0000000-0000-4000-8000-000000000001' returning 1
)
select is((select count(*)::int from d), 0, 'anon delete: 0 rows affected');

select throws_ok(
  $$insert into public.trips (user_id, destination, place_kind)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Anon trip', 'city')$$,
  '42501', null,
  'anon insert is rejected'
);

-- Back to the superuser: nothing above changed anyone's data ---------------------------------------
reset role;

select is(
  (select title from public.trips where id = 'a0000000-0000-4000-8000-000000000001'),
  'Renamed',
  'A''s row survived B and anon untouched (only the owner''s own rename applied)'
);
select is(
  (select count(*)::int from public.trips),
  3, 'no denied statement removed or added a row'
);

-- Cascade: deleting the auth user leaves no trips (AC-6, account deletion) --------------------------
select is(
  (select count(*)::int from public.trips where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  1, 'precondition: user C owns a trip'
);
select lives_ok(
  $$delete from auth.users where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'$$,
  'deleting the auth user succeeds (no trigger/cascade blocks account deletion)'
);
select is(
  (select count(*)::int from public.trips where user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  0, 'cascade: the deleted user''s trips are gone'
);
select is(
  (select count(*)::int from public.trips),
  2, 'cascade: other users'' trips are untouched'
);

select * from finish();
rollback;
