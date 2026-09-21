// Shared helpers for the auth screen tests. Jest collects every file under `__tests__/`, so this
// helper module carries one tiny test of its own (the `deferred` helper) instead of an ignore
// pattern in the shared jest config.
import { act, screen } from "@testing-library/react-native";

import * as api from "../api";

// Screens import the api through `../api`; each test file mocks that module with `mockApiModule`.
export const mockedApi = api as jest.Mocked<typeof api>;

export const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
};

export const SESSION_OK = { ok: true, session: { access_token: "opaque" } } as never;

/** A promise settled from the outside, to hold a request "in flight". */
export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** The input of a field, found by its plain label (no error on it). */
export const field = (label: string) => screen.getByLabelText(label);

/** The input of a field that currently shows `error` (its accessible name is "label, error"). */
export const erroredField = (label: string, error: string) =>
  screen.getByLabelText(`${label}, ${error}`);

export async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("testKit deferred", () => {
  it("settles from the outside", async () => {
    const pending = deferred<number>();
    pending.resolve(7);
    await expect(pending.promise).resolves.toBe(7);
  });
});
