#!/usr/bin/env bash
# Runs one Maestro flow from e2e/flows/ against the booted iOS simulator.
#
#   ./scripts/e2e.sh <flow> [--locale ru|en] [--metro-url <url>]
#   ./scripts/e2e.sh skeleton-smoke
#   ./scripts/e2e.sh skeleton-smoke --locale en
#   ./scripts/e2e.sh auth-email
#   ./scripts/e2e.sh trip-crud --locale en
#   ./scripts/e2e.sh segment-chain --locale en
#   ./scripts/e2e.sh theme-persistence --metro-url http://localhost:8081
#
# The flows contain NO literal UI text: every selector is an env var (LOCALE plus one variable per
# string) that this script fills from the table in `locale_strings` below, so `--locale ru|en`
# drives the same flow in either language. The table mirrors mobile/src/lib/i18n/locales/{ru,en}/*.ts;
# when a string there changes, change it here too (the comment above the table maps each key).
#
# Bash 3.2 compatible (macOS default): no associative arrays.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FLOWS_DIR="$REPO_ROOT/e2e/flows"

usage() {
  cat <<'EOF'
Usage: scripts/e2e.sh <flow> [--locale ru|en] [--metro-url <url>]

  <flow>              flow name in e2e/flows/ without .yaml (skeleton-smoke | auth-email | theme-persistence | trip-crud | segment-chain)
  --locale ru|en      UI language of the run (default: ru). Sent to the app as the launch argument
                      -AppleLanguages "(<locale>)" and used to pick the selector strings.
  --metro-url <url>   dev-client builds only: Metro URL to open after launch, e.g.
                      http://localhost:8081 (Metro must be running: cd mobile && npx expo start).
                      Omit for standalone (preview/release) builds.

Preconditions (not installed by this script):
  - Maestro:            curl -Ls "https://get.maestro.mobile.dev" | bash
  - Xcode + a booted iOS simulator: open -a Simulator
  - the app installed on it:        cd mobile && npx expo run:ios   (dev client)
  - auth-email / skeleton-smoke / theme-persistence / trip-crud / segment-chain sign up on the LOCAL
    Supabase stack: supabase start -x vector (see supabase/README.md; migrations applied, including
    trip_segments — trip-crud, skeleton-smoke and segment-chain all create trips, segment-chain also
    creates flight segments) with mobile/.env pointing at it. Each run uses a fresh e-mail.
EOF
}

fail() {
  printf 'e2e: %s\n' "$1" >&2
  exit 1
}

# --- arguments -------------------------------------------------------------------------------
FLOW=""
LOCALE_ARG="ru"
METRO_URL="${METRO_URL:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --locale)
      [ $# -ge 2 ] || fail "--locale needs a value (ru or en)"
      LOCALE_ARG="$2"
      shift 2
      ;;
    --locale=*)
      LOCALE_ARG="${1#--locale=}"
      shift
      ;;
    --metro-url)
      [ $# -ge 2 ] || fail "--metro-url needs a value, e.g. http://localhost:8081"
      METRO_URL="$2"
      shift 2
      ;;
    --metro-url=*)
      METRO_URL="${1#--metro-url=}"
      shift
      ;;
    -*)
      usage >&2
      fail "unknown option: $1"
      ;;
    *)
      [ -z "$FLOW" ] || fail "only one flow name is accepted (got '$FLOW' and '$1')"
      FLOW="$1"
      shift
      ;;
  esac
done

if [ -z "$FLOW" ]; then
  usage >&2
  fail "missing flow name"
fi
case "$LOCALE_ARG" in
  ru | en) ;;
  *) fail "--locale must be 'ru' or 'en' (got '$LOCALE_ARG')" ;;
esac

# The name becomes a path: allow only a plain flow name, never a path or a config file.
case "$FLOW" in
  *[!A-Za-z0-9_-]* | config) fail "invalid flow name '$FLOW'" ;;
esac
FLOW_FILE="$FLOWS_DIR/$FLOW.yaml"
if [ ! -f "$FLOW_FILE" ]; then
  available="$(cd "$FLOWS_DIR" && ls ./*.yaml | sed 's#^\./##; s#\.yaml$##' | grep -vx config | tr '\n' ' ')"
  fail "no such flow: $FLOW (available: $available)"
fi

# --- tooling preconditions -------------------------------------------------------------------
if ! command -v maestro >/dev/null 2>&1; then
  fail "the 'maestro' CLI is not in PATH.
  Install it:  curl -Ls \"https://get.maestro.mobile.dev\" | bash
  then restart the shell (or: export PATH=\"\$PATH:\$HOME/.maestro/bin\") and check: maestro --version"
fi

if ! command -v xcrun >/dev/null 2>&1; then
  fail "'xcrun' not found: install Xcode (App Store) and run: sudo xcode-select -s /Applications/Xcode.app"
fi

if ! xcrun simctl list devices booted 2>/dev/null | grep -q "(Booted)"; then
  fail "no booted iOS simulator.
  Boot one:  open -a Simulator   (or: xcrun simctl boot \"<device name>\")
  Devices:   xcrun simctl list devices available"
fi

# --- app identity (single source: mobile/) ---------------------------------------------------
APP_ID="$(sed -n 's/.*bundleIdentifier: *"\([^"]*\)".*/\1/p' "$REPO_ROOT/mobile/app.config.ts" | head -n 1)"
[ -n "$APP_ID" ] || fail "could not read ios.bundleIdentifier from mobile/app.config.ts"
if ! grep -q "^appId: $APP_ID\$" "$FLOW_FILE"; then
  fail "appId in $FLOW.yaml does not match ios.bundleIdentifier ($APP_ID) in mobile/app.config.ts: update the flows' appId line"
fi

if ! xcrun simctl get_app_container booted "$APP_ID" >/dev/null 2>&1; then
  fail "the app ($APP_ID) is not installed on the booted simulator.
  Build and install the dev client:  cd mobile && npx expo run:ios"
fi

# --- dev-client link -------------------------------------------------------------------------
DEV_CLIENT_LINK="none"
if [ -n "$METRO_URL" ]; then
  command -v node >/dev/null 2>&1 || fail "node is required to build the dev-client link (--metro-url)"
  APP_SLUG="$(sed -n 's/.*APP_SLUG *= *"\([^"]*\)".*/\1/p' "$REPO_ROOT/mobile/app.constants.ts" | head -n 1)"
  [ -n "$APP_SLUG" ] || fail "could not read APP_SLUG from mobile/app.constants.ts"
  ENCODED_URL="$(node -p 'encodeURIComponent(process.argv[1])' "$METRO_URL")"
  DEV_CLIENT_LINK="exp+${APP_SLUG}://expo-development-client/?url=${ENCODED_URL}"
fi

# --- selector strings ------------------------------------------------------------------------
# One KEY=VALUE per line. Text selectors in Maestro are full-string regexes, so values that hold
# regex metacharacters are escaped here (SIGNIN_FORGOT: "?").
# KEY -> i18n key (mobile/src/lib/i18n/locales/<locale>/<namespace>.ts):
#   TAB_TRIPS/HISTORY/PROFILE  common:tabs.trips|history|profile
#   BACK, CANCEL               common:actions.back, common:actions.cancel
#   ONBOARDING_TITLE/START     onboarding:title, onboarding:start
#   ONBOARDING_SIGNIN_LINK     onboarding:signInLink
#   SIGNUP_TITLE/SUBMIT        auth:signUp.title, auth:signUp.submit
#   SIGNUP_TERMS_LINK/PRIVACY  auth:signUp.termsLink, auth:signUp.privacyLink
#   SIGNUP_SIGNIN_LINK         auth:signUp.signInLink
#   SIGNIN_TITLE/SUBMIT        auth:signIn.title, auth:signIn.submit
#   SIGNIN_FORGOT              auth:signIn.forgotPassword (regex-escaped)
#   SIGNIN_CREATE_LINK         auth:signIn.createLink
#   FORGOT_TITLE               auth:forgotPassword.title
#   LEGAL_BODY                 legal:placeholderBody
#   NEW_TRIP_A11Y              trips:a11y.newTrip
#   TRIPS_EMPTY_TITLE          trips:list.emptyTitle
#   HISTORY_EMPTY              history:empty
#   FORM_DESTINATION_PLACEHOLDER trips:form.destination.placeholder (typed by placeholder, like the
#                              auth fields: caption and input share one label)
#   FORM_NO_DATES / _HINT      trips:form.dates.noDates, trips:form.dates.noDatesHint
#   FORM_CREATE                trips:form.create
#   STATUS_ARCHIVED            common:status.archived (chip text; also the status part of a card label)
#   MORE_ACTIONS               tripDetail:a11y.more
#   MENU_ARCHIVE / MENU_DELETE tripDetail:menu.archive, tripDetail:menu.delete
#   DELETE_CONFIRM_TITLE       tripDetail:deleteConfirm.title (regex-escaped "?")
#   DELETE_CONFIRM             tripDetail:deleteConfirm.confirm
#   ADD_FLIGHT                 tripDetail:a11y.addFlight
#   FLIGHT_FORM_FROM/TO        transport:field.from|to (segment-form S9/S9b; the caption AppText and
#                              the field itself share this exact text — segment-chain.yaml taps them
#                              with `index: 1`, see its own header comment)
#   DEPARTURE_DATE_LABEL       transport:field.departureDate (segment-form; caption + empty-state
#                              button share this text too, same `index: 1` treatment)
#   DEPARTURE_TIME_LABEL       transport:field.departureTime (NOTE: the i18n VALUE is "Departure"/
#                              "Вылет", not "Departure time" — see the source key name vs. its value)
#   SEGMENT_SAVE_NEXT          transport:form.saveAndNext
#   DONE                       common:actions.done
#   DELETE_FLIGHT               transport:segment.delete
#   DELETE_CONFIRM_MESSAGE     transport:form.deleteConfirmMessage
#   NOT_CLOSED_TITLE           transport:route.notClosedTitle
#   SUMMARY_TITLE              transport:summary.title (constant part of the S7 "Транспорт" block's
#                              route-summary row label; the rest of that label — codes + counts — is
#                              data-dependent, so segment-chain.yaml only ever matches this substring)
#   SEGMENT_OUTBOUND_ROUTE /
#   SEGMENT_RETURN_ROUTE       tripDetail:flight.route ("{{from}} to {{to}}" / ru "{{from}} — {{to}}")
#                              filled in with AIRPORT_FROM_CODE/AIRPORT_TO_CODE below
#   AIRPORT_FROM_SUGGESTION /
#   AIRPORT_TO_SUGGESTION      "<airport name in LOCALE>, <IATA>" — the accessible label of an
#                              AirportSuggestions row (shared/src/places/airports.ts data, not a
#                              locales/ string, but still routed through this table per the "no
#                              literal in the yaml" rule)
#   LOGOUT                     profile:logout
#   THEME_LIGHT/THEME_DARK     profile:themeOptions.light|dark
#   FIELD_NAME_PLACEHOLDER     auth:fields.name.placeholder      (fields are typed by placeholder:
#   FIELD_EMAIL_PLACEHOLDER    auth:fields.email.placeholder      the caption and the input share one
#   FIELD_PASSWORD_PLACEHOLDER auth:fields.password.placeholder   label, see auth-email.yaml)
#   SYSTEM_NOT_NOW             NOT an app string: iOS's "Not Now" button on the save-password prompt
locale_strings() {
  case "$1" in
    ru)
      cat <<'EOF'
TAB_TRIPS=Поездки
TAB_HISTORY=История
TAB_PROFILE=Профиль
BACK=Назад
CANCEL=Отмена
ONBOARDING_TITLE=Все поездки — в одном месте
ONBOARDING_START=Начать
ONBOARDING_SIGNIN_LINK=Войти
SIGNUP_TITLE=Создать аккаунт
SIGNUP_SUBMIT=Зарегистрироваться
SIGNUP_TERMS_LINK=Условиями использования
SIGNUP_PRIVACY_LINK=Политикой конфиденциальности
SIGNUP_SIGNIN_LINK=Войти
SIGNIN_TITLE=С возвращением
SIGNIN_FORGOT=Забыли пароль\?
SIGNIN_SUBMIT=Войти
SIGNIN_CREATE_LINK=Создать
FORGOT_TITLE=Восстановление пароля
LEGAL_BODY=Текст будет добавлен позже
NEW_TRIP_A11Y=Новая поездка
TRIPS_EMPTY_TITLE=Поездок пока нет
HISTORY_EMPTY=Завершённых поездок пока нет
FORM_DESTINATION_PLACEHOLDER=Город или страна
FORM_NO_DATES=Пока без дат
FORM_NO_DATES_HINT=Поездка сохранится как черновик. Даты можно добавить позже
FORM_CREATE=Создать поездку
STATUS_ARCHIVED=архив
MORE_ACTIONS=Дополнительные действия
MENU_ARCHIVE=Отправить в архив
MENU_DELETE=Удалить навсегда
DELETE_CONFIRM_TITLE=Удалить поездку навсегда\?
DELETE_CONFIRM=Удалить навсегда
ADD_FLIGHT=Добавить рейс
FLIGHT_FORM_FROM=Откуда
FLIGHT_FORM_TO=Куда
DEPARTURE_DATE_LABEL=Дата вылета
DEPARTURE_TIME_LABEL=Вылет
SEGMENT_SAVE_NEXT=Сохранить и добавить следующий
DONE=Готово
DELETE_FLIGHT=Удалить рейс
DELETE_CONFIRM_MESSAGE=Рейс будет удалён без возможности восстановления.
NOT_CLOSED_TITLE=Маршрут не замкнут
SUMMARY_TITLE=Весь маршрут
SEGMENT_OUTBOUND_ROUTE=LIS — OPO
SEGMENT_RETURN_ROUTE=OPO — LIS
AIRPORT_FROM_SUGGESTION=Аэропорт «Лиссабон», LIS
AIRPORT_TO_SUGGESTION=Аэропорт «Порту», OPO
LOGOUT=Выйти
THEME_LIGHT=Светлая
THEME_DARK=Тёмная
FIELD_NAME_PLACEHOLDER=Andrew
FIELD_EMAIL_PLACEHOLDER=you@example.com
FIELD_PASSWORD_PLACEHOLDER=Введите пароль
SYSTEM_NOT_NOW=Не сейчас
EOF
      ;;
    en)
      cat <<'EOF'
TAB_TRIPS=Trips
TAB_HISTORY=History
TAB_PROFILE=Profile
BACK=Back
CANCEL=Cancel
ONBOARDING_TITLE=All your trips in one place
ONBOARDING_START=Get started
ONBOARDING_SIGNIN_LINK=Sign in
SIGNUP_TITLE=Create account
SIGNUP_SUBMIT=Sign up
SIGNUP_TERMS_LINK=Terms of Use
SIGNUP_PRIVACY_LINK=Privacy Policy
SIGNUP_SIGNIN_LINK=Sign in
SIGNIN_TITLE=Welcome back
SIGNIN_FORGOT=Forgot password\?
SIGNIN_SUBMIT=Sign in
SIGNIN_CREATE_LINK=Create one
FORGOT_TITLE=Reset password
LEGAL_BODY=Text will be added later
NEW_TRIP_A11Y=New trip
TRIPS_EMPTY_TITLE=No trips yet
HISTORY_EMPTY=No past trips yet
FORM_DESTINATION_PLACEHOLDER=City or country
FORM_NO_DATES=No dates yet
FORM_NO_DATES_HINT=The trip is saved as a draft. You can add dates later
FORM_CREATE=Create trip
STATUS_ARCHIVED=archived
MORE_ACTIONS=More actions
MENU_ARCHIVE=Move to archive
MENU_DELETE=Delete permanently
DELETE_CONFIRM_TITLE=Delete this trip permanently\?
DELETE_CONFIRM=Delete permanently
ADD_FLIGHT=Add flight
FLIGHT_FORM_FROM=From
FLIGHT_FORM_TO=To
DEPARTURE_DATE_LABEL=Departure date
DEPARTURE_TIME_LABEL=Departure
SEGMENT_SAVE_NEXT=Save and add next
DONE=Done
DELETE_FLIGHT=Delete flight
DELETE_CONFIRM_MESSAGE=The flight will be deleted and cannot be restored.
NOT_CLOSED_TITLE=Route not closed
SUMMARY_TITLE=Whole route
SEGMENT_OUTBOUND_ROUTE=LIS to OPO
SEGMENT_RETURN_ROUTE=OPO to LIS
AIRPORT_FROM_SUGGESTION=Lisbon Airport, LIS
AIRPORT_TO_SUGGESTION=Porto Airport, OPO
LOGOUT=Sign out
THEME_LIGHT=Light
THEME_DARK=Dark
FIELD_NAME_PLACEHOLDER=Andrew
FIELD_EMAIL_PLACEHOLDER=you@example.com
FIELD_PASSWORD_PLACEHOLDER=Enter your password
SYSTEM_NOT_NOW=Not Now
EOF
      ;;
  esac
}

# --- per-run credentials ---------------------------------------------------------------------
# Sign-up and sign-in hit the real (local) Supabase, so every run registers a NEW account: the
# address is derived from a timestamp (+ $RANDOM so two runs in the same second, e.g. the ru and en
# runs back to back, never collide). RUN_ID may be preset by the caller to replay one account.
# The password is a fixed, non-secret, local-only value (>= 8 chars, shared/ passwordSchema).
# The email avoids "+" on purpose: Maestro text selectors are regexes and "+" is a quantifier.
# E2E_PLACE is the free-text place the trip flows type into the new-trip form (a directory
# suggestion is never tapped, so the flows do not depend on the place directory). It embeds the
# RUN_ID, is the same in both locales, and holds letters, digits and spaces only (regex-safe).
RUN_ID="${RUN_ID:-$(date +%s)$RANDOM}"
E2E_NAME="E2E Tester"
E2E_EMAIL="e2e-${RUN_ID}@example.com"
E2E_PASSWORD="e2e-local-password-1"
E2E_PLACE="E2E Place ${RUN_ID}"
# segment-chain.yaml: two IATA codes from shared/src/places/airports.ts (both cities' primary
# airport, both in Europe/Lisbon so the segments' "same-day" arithmetic never crosses a DST/offset
# boundary). Directory DATA, not a locale/UI string, and the same in both locales — kept out of the
# `locale_strings` table on purpose, unlike AIRPORT_FROM_SUGGESTION/AIRPORT_TO_SUGGESTION below
# (those repeat the airport's ru/en NAME, which does vary by locale).
AIRPORT_FROM_CODE="LIS"
AIRPORT_TO_CODE="OPO"

MAESTRO_ARGS=(
  -e "LOCALE=$LOCALE_ARG"
  -e "DEV_CLIENT_LINK=$DEV_CLIENT_LINK"
  -e "RUN_ID=$RUN_ID"
  -e "E2E_NAME=$E2E_NAME"
  -e "E2E_EMAIL=$E2E_EMAIL"
  -e "E2E_PASSWORD=$E2E_PASSWORD"
  -e "E2E_PLACE=$E2E_PLACE"
  -e "AIRPORT_FROM_CODE=$AIRPORT_FROM_CODE"
  -e "AIRPORT_TO_CODE=$AIRPORT_TO_CODE"
)
while IFS= read -r line; do
  [ -n "$line" ] || continue
  MAESTRO_ARGS+=(-e "$line")
done < <(locale_strings "$LOCALE_ARG")

# --- run -------------------------------------------------------------------------------------
# Repo root as cwd: screenshots go to .maestro/screenshots/ (git-ignored).
cd "$REPO_ROOT"
mkdir -p .maestro/screenshots

echo "e2e: flow=$FLOW locale=$LOCALE_ARG app=$APP_ID dev-client=$([ "$DEV_CLIENT_LINK" = none ] && echo no || echo yes)"
exec maestro test "${MAESTRO_ARGS[@]}" "e2e/flows/$FLOW.yaml"
