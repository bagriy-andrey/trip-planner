---
name: mobile-architecture
description: "Mobile app code organization for mobile/ (Expo + React Native + expo-router) — folder structure, feature modules, component splitting, where business logic / API calls / types / constants live, and the platform-parity rule that keeps iOS-first code Android-ready. Use when deciding where a file belongs, how to structure a feature, when to split a screen/component, or when adding anything platform-specific. Trigger terms: where do I put, feature module, screen, expo-router, hook, service, platform-specific, Platform.OS, .ios.tsx, .android.tsx."
---

# Mobile architecture (`mobile/`)

Feature-based structure on top of expo-router. Screens are thin; features own
their logic. Server-layer rules live in `onion-architecture` — this skill
covers `mobile/` only.

## Layout

```
mobile/
  app/                      # expo-router: ROUTES ONLY (thin screens, layouts)
    (tabs)/…  _layout.tsx
  src/
    features/<feature>/     # one folder per product feature (trips, itinerary, map, auth…)
      components/           # feature-private UI
      hooks/                # feature hooks (useTrip, useCreateTrip) — TanStack Query lives here
      api/                  # typed calls to the server; only place that touches the network client
      store/                # feature-local client state (only if server-state/hooks aren't enough)
      types.ts  constants.ts  utils.ts
      index.ts              # PUBLIC surface of the feature — other features import only from here
    components/             # shared, feature-agnostic UI primitives (Button, Sheet, Screen)
    lib/                    # cross-cutting infra: api client, storage, analytics, i18n, theme
    platform/               # ALL platform-specific code (see parity rule)
```

## Rules

1. **`app/` files stay thin** — they compose feature components and read route
   params. No fetching, no business logic, no >~80 lines of JSX.
2. **Dependency direction:** `app/` → `features/*` → `components/`, `lib/`,
   `platform/`. Features do NOT import each other's internals; cross-feature
   use goes through `features/<x>/index.ts`. `components/` and `lib/` never
   import from `features/`.
3. **Business logic in hooks / pure functions**, never inline in components.
   Pure functions (itinerary date math, budget totals, sorting) go in
   `utils.ts` and get unit-tested without rendering.
4. **Network only through `features/*/api/` + `lib/api-client`.** Request and
   response types come from `@tripplanner/shared` (Zod schemas) — never
   redeclare a contract in `mobile/`. Parse responses with the shared schema.
5. **Server state ≠ client state.** Server data → TanStack Query. Only true
   UI/session state (draft form, selected tab) → local state / small store.
6. **Split a component when** it exceeds ~150 lines, has 2+ unrelated
   responsibilities, or a subtree re-renders independently (extract + memo).
7. **Constants/types:** feature-specific → the feature folder; shared by 2+
   features → `src/lib/` or `@tripplanner/shared` if the server needs it too.
8. **Offline-aware by default:** anything the user edits on a trip must
   tolerate no connectivity (optimistic update + retry, or explicit "needs
   connection" state). Decide per feature in the spec.

## Platform-parity rule (iOS first, Android later)

The app ships on iOS first but must not need a rewrite for Android.

- Shared logic, hooks, API, state, and screens are **platform-neutral**.
  No `Platform.OS === 'ios'` scattered through feature code.
- Anything genuinely platform-specific goes behind an interface in
  `src/platform/` with per-platform files (`haptics.ios.ts` /
  `haptics.android.ts`, or a `.ts` default + `.ios.ts` override). Features
  import the neutral name only.
- **Only cross-platform Expo/React Native APIs** in feature code. If a native
  module is iOS-only (e.g. Live Activities, WidgetKit, Apple Pay), isolate it
  in `src/platform/` with a no-op/fallback Android implementation from day one.
- No hard-coded iOS assumptions: safe-area via `react-native-safe-area-context`,
  no fixed status-bar/notch heights, no iOS-only gestures as the sole path,
  keyboard handling via a shared wrapper, fonts/icons that exist on both.
- Each SPEC records a `Platforms:` line (`ios`, `ios+android`) and states any
  iOS-only behavior explicitly, so the Android backlog is visible.
- Design tokens (color, spacing, type) live in `src/lib/theme`; support
  light/dark from the start.
