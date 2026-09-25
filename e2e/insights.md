# Insights

Append-only. Managed by the `engineering-insights` skill. Add only substantive, non-obvious learnings.

## What Works
## What Doesn't Work
- 2026-09-23: `mobile/app/trips/[tripId]/route.tsx` (S13, wired in PLAN-04 step 8) still passes
  no-op callbacks for `onAddSegment`/`onSegmentPress`/`onAddFromNotClosed` — tapping a segment in
  the chain, the "+", or the "not closed" card's own button on the Route screen itself does NOTHING
  on device. That file is step 8's alone; neither step 9 (`segment-form`) nor step 10
  (`trip-detail`) owns it, so nothing ever wired the Route screen's own navigation once the targets
  it needs (the segment form, S9b) existed. `segment-chain.yaml` works around this: every
  add/edit/delete goes through S7's "Add flight" button and the "Транспорт"/"Transport" block's
  nearest-segment card (both correctly wired in `trip-detail/components/TripDetailContent.tsx`),
  and the Route screen is only ever used to ASSERT the chain/closed state, never to navigate from.
  This is a real product gap (AC-67 "tap the not-closed card to add a flight from there" and
  tapping a chain segment to edit it are both silently inert) for whichever step next touches
  `route.tsx` to fix, not fixed here (outside this step's file list).
- 2026-09-23: `segment-form`'s on-screen delete confirmation (`SegmentFormScreen.tsx`'s
  `ConfirmOverlay`) does NOT hide the inline "Delete flight" link behind it the way
  `trip-detail`'s own `SheetOverlay` hides the "…" menu behind the delete-confirm sheet (no
  `accessibilityElementsHidden`/`importantForAccessibility="no-hide-descendants"` guard on the rest
  of the screen while the overlay is open). So once the confirm sheet is open, BOTH the covered
  link and the confirm button share the exact same accessible label — unlike `trip-crud.yaml`'s
  "Delete permanently" case, where the earlier menu is actually REPLACED (unmounted), not just
  covered. `segment-chain.yaml`'s confirm tap relies on Maestro picking the frontmost/visible match;
  NOT YET VERIFIED — flagged as a candidate follow-up for `SegmentFormScreen` to adopt the same
  hidden-behind-overlay guard `TripDetailContent` already uses.
## Codebase Patterns
- 2026-09-19: Flows hold no literal UI text: `scripts/e2e.sh --locale ru|en` passes `LOCALE` plus one `-e KEY=value` per string, so one YAML serves both languages (Maestro `text:` is a full-string regex, hence `.*Краков.*` for trip cards whose label is "city, dates, status", and pre-escaped `\?`). The table in the script mirrors `mobile/src/lib/i18n/locales/*` by hand: when a string changes, change it there. Tab label == screen title on S4/S5/S6, so tabs are only tapped from a screen where the label is the tab alone and asserted with `selected: true`.
- 2026-09-19: `config.yaml` in `e2e/flows/` is only the Maestro workspace config; it cannot carry `appId`. Each flow repeats `appId` (= `ios.bundleIdentifier`, temporary placeholder) and `e2e.sh` fails fast on drift.
## Tool & Library Notes
- 2026-09-19: Maestro `launchApp` takes launch args under `arguments:` (not `launchArguments`). NOT YET VERIFIED (the flows were authored with no Maestro and no working simulator): (1) that iOS honours `"-AppleLanguages": "(en)"` for the dev-client build (PLAN-01 R-9); fallback is switching the simulator language by hand (Settings > General > Language & Region) and rerunning, moving AC-35 to the manual checklist; (2) that Maestro exposes RN `accessibilityState.checked` on a `radio` (theme flow asserts `checked: true`; RN iOS puts it into `accessibilityValue` as "radio button, checked", so if the selector never matches, fall back to the screenshots the flow saves in `.maestro/screenshots/`); (3) that `selected: true` matches the active tab button (RN sets the iOS Selected trait); (4) that tapping a nested consent link on S3 hits the link, not the paragraph centre; (5) the dev-client system prompts ("Open", "Continue") handled by optional taps.
- 2026-09-21: Auth flows (`auth-email`, and the sign-up step of `skeleton-smoke`) hit the REAL local Supabase, so they need `supabase start -x vector` up and `mobile/.env` pointing at it; `e2e.sh` mints a fresh `RUN_ID` (timestamp + `$RANDOM`), `E2E_EMAIL=e2e-<RUN_ID>@example.com` and a fixed local-only `E2E_PASSWORD` per run (a preset `RUN_ID` replays one account). The email deliberately has no `+`: Maestro `text:` is a regex, so `assertVisible: "${E2E_EMAIL}"` with a `+` would never match itself. Password recovery is NOT automated (the 6-digit code is only in the email, unreadable from a flow; built-in mailer is rate limited): it stays manual checklist M7 (PLAN-02 R-7). NOT YET VERIFIED (authored blind): (1) form fields are tapped by PLACEHOLDER (`FIELD_*_PLACEHOLDER`), assuming Maestro's iOS text match also covers `placeholderValue`; the label is a poor selector because the caption Text and the input share it (two matches) and an errored field's label turns into "Label, error text"; fallback: tap the caption, or focus the first field and chain `pressKey: Enter`/`inputText` through the `returnKeyType="next"` order; (2) `inputText` into a real (secure) field works and the `newPassword` autofill ("Strong Password" bar) does not steal focus; (3) `hideKeyboard` reliably dismisses the iOS keyboard so the submit button is tappable (fallback: type the password and `pressKey: Enter`, the password field submits on "go"); (4) the iOS "Save Password?" sheet after sign-up is dismissed by the optional `SYSTEM_NOT_NOW` tap ("Not Now" / "Не сейчас" — a system string, not mirrored from `locales/`, and it may not appear at all on a simulator without Keychain autofill); (5) the profile row renders the name and email as separate texts, so both `assertVisible` calls match.
- 2026-09-21: The session is now persisted in SecureStore, so a restart WITHOUT `clearState` no longer lands on onboarding: any flow that "restarts and signs in again" (theme-persistence's second half) must expect the tabs directly, and any flow that signs in needs an account that exists (sign up first or reuse `E2E_EMAIL`), because an empty form is now rejected by validation instead of being accepted.
- 2026-09-22: `trip-crud` (SPEC-03 AC-80) is the first flow that CREATES and DELETES server data: it needs the local Supabase stack WITH the trips migration applied (`supabase db reset`), and its fresh per-run account (RUN_ID) is what keeps both lists empty at start and lets it end with both empty again. It signs UP rather than in (there is no seeded account), and it types a free-text place, `E2E_PLACE="E2E Place <RUN_ID>"` (minted by `e2e.sh`, locale-independent, regex-safe), so no directory suggestion is tapped and the flow does not depend on the place directory. `skeleton-smoke` no longer opens S7 from a mock card: a fresh account has an EMPTY list, so it creates a trip through S8 (PLAN-03 Q-C default) and walks S7 / S9 from there; its History-card -> S7 step was dropped (History needs an archived trip; `trip-crud` opens that card). NOT YET VERIFIED (authored blind, Maestro not installed): (1) a trip card is one accessible element labelled "place, status, dates" (`trips:list.a11y.card`), so it is selected as `<place>,.*` (the comma tells it from the S7 header whose text is the bare place) and the archived chip as `<place>,.*<archived>.*`; this depends on the card's `accessible` Pressable swallowing its child texts on iOS, and on the label template keeping "title, status" order; (2) after "Create trip" the flow waits for an S7-only control (`ADD_FLIGHT`), not for the place text: the form input's VALUE is the place and would satisfy the wait while the sheet is still up; (3) the create form starts with dates unset and "no dates" OFF, so an undated trip needs the "No dates yet" checkbox tapped by label (asserted by its hint text, not `checked:`) and the flow assumes the whole form fits above the keyboard-less screen after `hideKeyboard` (no `scrollUntilVisible`); (4) the place field is typed by PLACEHOLDER (same assumption as the auth fields) and is autofocused, so the tap is a no-op safety; (5) the "..." button is found by its a11y label (`tripDetail:a11y.more`) and the menu items by their labels; the live-trip menu is asserted NOT to hold "Delete permanently" (AC-47), and the delete confirmation REPLACES the menu, so the identical "Delete permanently" texts never match twice; (6) the status chip on S7 is a separate element with the exact text `common:status.archived`, so `assertVisible` on it works once the trip is refetched after archiving; (7) after delete the details leave to the list they came from (History) and both lists are checked by their empty texts plus `assertNotVisible: .*<place>.*`, which relies on Maestro retrying `assertNotVisible` through the back transition. Also assumed: `tapOn` of a regex that matches two elements (S7's "Add flight" section button AND its empty-block caption share the label) takes the first, and both go to the same route.

- 2026-09-23: `segment-chain` (SPEC-04 AC-99/AC-100, PLAN-04 step 12) is the first flow to touch S9/
  S9b (`features/segment-form`) and S13 (`features/transport/RouteScreen`). Two findings worth
  keeping for the next flow that touches a date/time field or a form with a caption-labelled field:
  (1) **R-6's time-picker risk did not materialize for CREATING a valid segment.**
  `DepartureBlock`/`ArrivalBlock` (`mobile/src/platform/datePicker.tsx`) render a plain placeholder
  `Pressable` while a date/time is `null`; tapping it calls `onChange` DIRECTLY with a deterministic
  fallback (today's date / midnight) — the real `@react-native-community/datetimepicker` control
  (iOS compact inline / Android imperative dialog) only mounts AFTER a value exists, so the flow
  never has to touch it at all. AC-100's "move the time steps to the manual checklist" fallback was
  NOT needed here. It would still be needed for a SPECIFIC time value (e.g. the 55-minute
  risky-layover case, M4) — that stays manual, unchanged.
  (2) **Every `segment-form` field pairs a static caption with a control that starts out sharing the
  EXACT SAME accessible text** — not just "shares a label with its placeholder" the way the auth/
  trip-crud forms do (where PLACEHOLDER text differs from the caption, so tapping by placeholder
  disambiguates), but the literal same string twice on one screen: `AirportField`'s `placeholder`
  prop IS `t("field.from")`, identical to its own `label`; `DepartureBlock`'s empty-state button's
  `accessibilityLabel` is the bare field label too (e.g. "Departure"). PLACEHOLDER selection cannot
  disambiguate these. `segment-chain.yaml` uses Maestro's `index: 1` instead (caption renders first
  in the JSX, the field/button second) — still a text selector, not `id:`/testID (AC-19 holds), but
  the render-order assumption is NOT YET VERIFIED (no Maestro/simulator while authoring). The same
  `{text: DEPARTURE_TIME_LABEL, index: 1}` selector doubles as the sync barrier after "Save and add
  next": it only has two matches once the mutation round-trip is done AND the form has reset to the
  next-segment prefill (while the outbound segment's own time control is still showing, its label is
  `"Departure: 00:00"`, not the bare caption, so only one match exists until the reset happens).
  (3) Both segments end up with the exact same `departureAt` instant (LIS and OPO share
  `Europe/Lisbon`, and the fallback time is always midnight): the route's `nearestSegmentId` is not
  predictable ahead of time, so the flow matches EITHER leg's route label
  (`"(${SEGMENT_OUTBOUND_ROUTE}|${SEGMENT_RETURN_ROUTE}),.*"`) when it opens the "Транспорт"/
  "Transport" block's nearest-segment card — whichever one buildRoute picked, that regex still has
  exactly one match on screen.
## Recurring Errors & Fixes
## Session Notes
## Open Questions
- 2026-09-24 (PLAN-05 hotels): the `hotel-stay` flow (add hotel -> card on S7 -> open -> delete) was NOT authored and has never run: Maestro is not installed and the plan allows deferring step 10. When written, the time step is the risk — an empty `TimePicker` now opens the native control (not a fallback value), which Maestro may not drive; if so, move the time steps to the manual checklist (M3).
- 2026-09-25 (PLAN-06 step 10): `profile-home-airport.yaml` (sign up -> Profile -> "Home airport" -> search KRK -> row shows KRK -> new no-dates trip -> "Add flight" -> "From" prefilled KRK -> "To" = LIS) was written blind and has NEVER RUN (no Maestro/simulator). Unverified assumptions: (1) the profile picker `Modal` content is reachable by Maestro and its search field (label == placeholder == "Search") autofocuses; the flow taps it anyway; (2) picker rows are matched by label "<airport name>, KRK" (picker:a11y.item); (3) the profile row and prefilled "From" are asserted by regex `.*KRK.*` since their labels embed the code; (4) the trip is created WITHOUT dates (plan said "with dates") because dates need the native picker; (5) "To" reuses AIRPORT_FROM_CODE (LIS), tapped via the FLIGHT_FORM_TO label with `index: 1` (caption and field share the label).
- 2026-09-25 (PLAN-07 step 11): `car-rental.yaml` (sign up -> no-dates trip -> "Add car" -> booking ref + pick-up place -> dates sheet -> two time sheets -> Save -> S7 card -> S17 shows ref -> Edit -> Delete rental -> confirm -> empty state) was written blind and has NEVER RUN (no Maestro/simulator; only YAML + `bash -n` validated). Assumptions: (1) time wheel NOT needed: the time sheet opens at its 11:00 start and "Done" confirms without touching the wheel (timeSheetPicker.tsx; iOS-only path, Android opens an imperative dialog); (2) dates via the in-tree calendar: next month, day 10 then 12 (per-locale regex CAR_DAY_PICK_1/2, since dayMonth is "{{day}} {{month}}" ru vs "{{month}} {{day}}" en), keeping the range in the future; trip has no dates for the same reason as trip-crud; (3) text fields and empty time buttons share caption/label -> `index: 1`; (4) the card is tapped by regex `"<untitled>, .*"` (no company typed); (5) after deleting from the edit form the app is assumed to land on S7 showing the empty "Add car" block; (6) `TIME_DONE` and `CAR_DATES_DONE` are the same word but separate keys.
