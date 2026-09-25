-- Constraint tests for public.profiles (SPEC-06 AC-6): failing inserts per CHECK, plus valid edges.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, email) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'a@example.test');

select is(
  (select count(*)::int from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c'),
  7, 'profiles has exactly 7 check constraints');

-- One failing insert per constraint (two shapes for the code-like ones)
select throws_ok($$insert into public.profiles (user_id, citizenship_country_code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pl')$$,
  '23514', null, 'profiles_citizenship_fmt rejects lowercase');
select throws_ok($$insert into public.profiles (user_id, citizenship_country_code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'POL')$$,
  '23514', null, 'profiles_citizenship_fmt rejects three letters');
select throws_ok($$insert into public.profiles (user_id, residence_country_code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'pl')$$,
  '23514', null, 'profiles_residence_fmt rejects lowercase');
select throws_ok($$insert into public.profiles (user_id, residence_country_code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'POL')$$,
  '23514', null, 'profiles_residence_fmt rejects three letters');
select throws_ok($$insert into public.profiles (user_id, home_city_place_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'City-krakow')$$,
  '23514', null, 'profiles_home_city_fmt rejects a wrong prefix case');
select throws_ok($$insert into public.profiles (user_id, home_city_place_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'city-' || repeat('a', 60))$$,
  '23514', null, 'profiles_home_city_fmt rejects 65 characters');
select throws_ok($$insert into public.profiles (user_id, home_airport_code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'krk')$$,
  '23514', null, 'profiles_home_airport_fmt rejects lowercase');
select throws_ok($$insert into public.profiles (user_id, home_airport_code) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'KR')$$,
  '23514', null, 'profiles_home_airport_fmt rejects two letters');
select throws_ok($$insert into public.profiles (user_id, home_currency) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'eur')$$,
  '23514', null, 'profiles_home_currency_fmt rejects lowercase');
select throws_ok($$insert into public.profiles (user_id, home_currency) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'EU')$$,
  '23514', null, 'profiles_home_currency_fmt rejects two letters');

-- Own city (home_city_name): length, whitespace, line breaks, and exclusivity with the directory id
select throws_ok($$insert into public.profiles (user_id, home_city_name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'K')$$,
  '23514', null, 'profiles_home_city_name_fmt rejects one character');
select throws_ok($$insert into public.profiles (user_id, home_city_name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', repeat('a', 81))$$,
  '23514', null, 'profiles_home_city_name_fmt rejects 81 characters');
select throws_ok($$insert into public.profiles (user_id, home_city_name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ' Krakow')$$,
  '23514', null, 'profiles_home_city_name_fmt rejects a leading space');
select throws_ok($$insert into public.profiles (user_id, home_city_name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', E'Kra\nkow')$$,
  '23514', null, 'profiles_home_city_name_fmt rejects a line break');
select throws_ok($$insert into public.profiles (user_id, home_city_place_id, home_city_name) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'city-krakow', 'Krakow')$$,
  '23514', null, 'profiles_home_city_exclusive rejects a directory id together with an own name');

-- Valid rows
select lives_ok($$insert into public.profiles (user_id) values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'every optional column accepts null');
select lives_ok($$update public.profiles set citizenship_country_code = 'XK', residence_country_code = 'ZZ',
  home_city_place_id = 'city-unknown', home_airport_code = 'ZZZ', home_currency = 'ZZZ'
  where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'right-format values outside the reference lists are accepted (format only)');
select lives_ok($$update public.profiles set home_city_place_id = 'city-' || repeat('a', 59)
  where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a city id of exactly 64 characters is accepted');
select lives_ok($$update public.profiles set home_city_place_id = 'city-new-york-2'
  where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'a city id with digits and hyphens is accepted');
select lives_ok($$update public.profiles set home_city_place_id = null, home_city_name = repeat('a', 80)
  where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'an own city name of exactly 80 characters is accepted');
select lives_ok($$update public.profiles set home_city_name = 'Nowy Sącz-2' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'an own city name with spaces, diacritics and digits is accepted');

-- updated_at trigger: now() is frozen in a transaction, so start from an old value
update public.profiles set created_at = '2020-01-01 00:00:00+00', updated_at = '2020-01-01 00:00:00+00'
 where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.profiles set home_currency = 'EUR', updated_at = '2000-01-01 00:00:00+00'
 where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is((select updated_at from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  now(), 'update: the trigger sets updated_at to now()');
select is((select created_at from public.profiles where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  '2020-01-01 00:00:00+00'::timestamptz, 'update: created_at is left alone');

select * from finish();
rollback;
