#!/usr/bin/env bash
# Runs one Maestro flow from e2e/flows/ against the booted iOS simulator.
#
#   ./scripts/e2e.sh <flow> [--locale ru|en] [--metro-url <url>]
#   ./scripts/e2e.sh skeleton-smoke
#   ./scripts/e2e.sh skeleton-smoke --locale en
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

  <flow>              flow name in e2e/flows/ without .yaml (skeleton-smoke | theme-persistence)
  --locale ru|en      UI language of the run (default: ru). Sent to the app as the launch argument
                      -AppleLanguages "(<locale>)" and used to pick the selector strings.
  --metro-url <url>   dev-client builds only: Metro URL to open after launch, e.g.
                      http://localhost:8081 (Metro must be running: cd mobile && npx expo start).
                      Omit for standalone (preview/release) builds.

Preconditions (not installed by this script):
  - Maestro:            curl -Ls "https://get.maestro.mobile.dev" | bash
  - Xcode + a booted iOS simulator: open -a Simulator
  - the app installed on it:        cd mobile && npx expo run:ios   (dev client)
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
#   CITY_LISBON, CITY_ROME     trips:cities.lisbon, trips:cities.rome
#   NEW_TRIP_A11Y              trips:a11y.newTrip
#   NEW_TRIP_CITY_LABEL        trips:newTrip.city
#   ADD_FLIGHT                 tripDetail:a11y.addFlight
#   FLIGHT_FORM_FROM           bookingForm:flight.from
#   LOGOUT                     profile:logout
#   THEME_LIGHT/THEME_DARK     profile:themeOptions.light|dark
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
CITY_LISBON=Лиссабон
CITY_ROME=Рим
NEW_TRIP_A11Y=Новая поездка
NEW_TRIP_CITY_LABEL=Город
ADD_FLIGHT=Добавить рейс
FLIGHT_FORM_FROM=Откуда
LOGOUT=Выйти
THEME_LIGHT=Светлая
THEME_DARK=Тёмная
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
CITY_LISBON=Lisbon
CITY_ROME=Rome
NEW_TRIP_A11Y=New trip
NEW_TRIP_CITY_LABEL=City
ADD_FLIGHT=Add flight
FLIGHT_FORM_FROM=From
LOGOUT=Sign out
THEME_LIGHT=Light
THEME_DARK=Dark
EOF
      ;;
  esac
}

MAESTRO_ARGS=(-e "LOCALE=$LOCALE_ARG" -e "DEV_CLIENT_LINK=$DEV_CLIENT_LINK")
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
