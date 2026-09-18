---
name: react-native-testing
description: "Testing guide for mobile/ — Jest + jest-expo + @testing-library/react-native for components/hooks, pure-function unit tests, mocking native modules and the network, and Maestro flows for e2e. Use when writing, reviewing, or setting up tests under mobile/ or e2e/. Trigger terms: jest, jest-expo, React Native Testing Library, renderHook, Maestro, e2e flow, mock expo module."
---

# React Native testing

Philosophy is the same as the rest of the repo: **typological, not
exhaustive** — cover the kinds of things that can break at each seam; test
behavior, not implementation; no line-coverage chasing.

## Pyramid for `mobile/`
1. **Pure logic (most tests):** utils, reducers, mappers, date/budget math —
   plain Jest, no rendering.
2. **Hooks & components:** `@testing-library/react-native` with the `jest-expo`
   preset. Query by role/label/text (`getByRole`, `getByLabelText`,
   `getByText`); `getByTestId` only as a last resort. Use `userEvent`
   (`await user.press(...)`), and `findBy*`/`waitFor` for async.
3. **Server-state hooks:** wrap in a fresh `QueryClientProvider` per test
   (`retry: false`); mock the network at the boundary (MSW or a mocked
   `features/*/api` module), not `fetch` internals.
4. **E2E (few, critical paths):** Maestro flows in `e2e/` against a dev/preview
   build. One flow per core journey (create trip → add item → see itinerary).

## Rules
- Mock native modules in `jest.setup.ts` (secure-store, notifications,
  location, haptics…) with the minimal behavior a test needs — don't mock the
  code under test or its own hooks.
- Never assert on internal state, style objects, or render counts. Assert what
  the user sees/does and what leaves the component (API call, navigation).
- Navigation: render with expo-router's `renderRouter` testing utility or
  mock `useRouter`; assert the route pushed.
- Time/randomness: fake timers + fixed clock for anything date-based
  (itineraries are date-sensitive — always test across a day/timezone boundary).
- Snapshots: only tiny, stable ones. No whole-screen snapshots.
- Each bug fix gets a regression test at the lowest layer that reproduces it.

## Maestro (e2e)
- YAML flows in `e2e/flows/`, selectors by accessibility label/text — which
  doubles as an accessibility check.
- Deterministic: seeded test account/data, no live third-party APIs.
- Run on iOS simulator first; keep flows platform-neutral so they run on
  Android unchanged later.

## Commands
- Unit/component: `cd mobile && pnpm test`
- Typecheck: `cd mobile && pnpm typecheck`
- E2E: `./scripts/e2e.sh` (see `e2e/AGENTS.md`)
