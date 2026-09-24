-- RLS + ownership tests for public.profiles (SPEC-06 AC-2..AC-8).
-- All counts are scoped to the fixture users so the file passes on a non-empty database.
begin;
create extension if not exists pgtap with schema extensions;
select plan(21);

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'b@example.test'),
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'c@example.test');

insert into public.profiles (user_id, home_currency) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'USD');

select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'RLS is enabled on public.profiles');
select policies_are('public', 'profiles',
  array['profiles_select_own', 'profiles_insert_own', 'profiles_update_own'],
  'profiles has exactly three owner policies (no delete)');

-- Owner A ---------------------------------------------------------------------------------------
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$insert into public.profiles (user_id, home_currency) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'EUR')
    on conflict (user_id) do update set home_currency = excluded.home_currency$$,
  'owner upsert creates the row');
select lives_ok(
  $$insert into public.profiles (user_id, home_airport_code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'KRK')
    on conflict (user_id) do update set home_airport_code = excluded.home_airport_code$$,
  'owner upsert of one column on an existing row');
select is(
  (select home_currency from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'EUR', 'upsert of one column does not null the others');
select is(
  (select home_airport_code from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'KRK', 'upserted column is stored');
select is(
  (select count(*)::int from public.profiles
    where user_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc')),
  1, 'owner select sees only own row');

with d as (delete from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
select is((select count(*)::int from d), 0, 'owner delete affects 0 rows (no policy)');
select is(
  (select count(*)::int from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  1, 'row still there after delete attempt');

select throws_ok(
  $$insert into public.profiles (user_id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$,
  '42501', null, 'insert with a foreign user_id is denied');
select throws_ok(
  $$update public.profiles set user_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501', null, 'update moving user_id to a foreign id is denied');

-- Other user C against A's and B's rows -----------------------------------------------------------
set local "request.jwt.claims" = '{"sub":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","role":"authenticated"}';
select is(
  (select count(*)::int from public.profiles
    where user_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  0, 'other user select: 0 rows');
with u as (update public.profiles set home_currency = 'GBP'
  where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
select is((select count(*)::int from u), 0, 'other user update: 0 rows affected');
with d as (delete from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
select is((select count(*)::int from d), 0, 'other user delete: 0 rows affected');

reset role;
select is(
  (select home_currency from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'EUR', 'A''s value unchanged after the foreign update');

-- anon ------------------------------------------------------------------------------------------
set local role anon;
select is(
  (select count(*)::int from public.profiles
    where user_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')),
  0, 'anon select: 0 rows');
with u as (update public.profiles set home_currency = 'GBP'
  where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' returning 1)
select is((select count(*)::int from u), 0, 'anon update: 0 rows affected');
select throws_ok(
  $$insert into public.profiles (user_id) values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc')$$,
  '42501', null, 'anon insert is denied');
reset role;

-- Cascade on account deletion (AC-5) --------------------------------------------------------------
delete from auth.users where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is(
  (select count(*)::int from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  0, 'deleting the user removes the profile row');
select is(
  (select count(*)::int from public.profiles where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1, 'other users'' rows survive');
select is(
  (select count(*)::int from pg_policies where schemaname = 'public' and tablename = 'profiles' and cmd = 'DELETE'),
  0, 'no delete policy exists');

select * from finish();
rollback;
