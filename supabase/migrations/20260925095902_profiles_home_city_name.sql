-- SPEC-06 amendment (2026-09-25): a home city that is not in the offline directory.
-- `home_city_place_id` keeps a directory id (`city-…`); `home_city_name` holds the user's own text.
-- At most one of the two is set: a directory city and a typed city never coexist.
alter table public.profiles
  add column home_city_name text;

alter table public.profiles
  add constraint profiles_home_city_name_fmt check (
    home_city_name is null
    or (
      char_length(home_city_name) between 2 and 80
      and btrim(home_city_name, E' \t\r\n') = home_city_name
      and home_city_name !~ '[\r\n\t]'
    )
  ),
  add constraint profiles_home_city_exclusive check (
    home_city_name is null or home_city_place_id is null
  );
