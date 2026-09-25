import { CAR_FIELD_ERROR } from "@tripplanner/shared";

import { en } from "../locales/en";
import { ru } from "../locales/ru";
import { uk } from "../locales/uk";

function resolve(node: unknown, path: string[]): unknown {
  return path.reduce<unknown>(
    (acc, key) =>
      typeof acc === "object" && acc !== null ? (acc as Record<string, unknown>)[key] : undefined,
    node,
  );
}

function expectNonEmptyEverywhere(path: string[]) {
  for (const locale of [ru, en, uk]) {
    const value = resolve(locale, path);
    expect(typeof value).toBe("string");
    expect((value as string).length).toBeGreaterThan(0);
  }
}

describe("car:form.validation.<id>", () => {
  it.each([...Object.values(CAR_FIELD_ERROR), "pickup.inPast"])(
    "%s has a non-empty string in ru, en and uk",
    (id) => {
      expectNonEmptyEverywhere(["car", "form", "validation", ...id.split(".")]);
    },
  );
});

describe("car:dates", () => {
  it.each(Array.from({ length: 12 }, (_, i) => String(i + 1)))("month %s", (k) => {
    expectNonEmptyEverywhere(["car", "dates", "month", k]);
  });
  it.each(Array.from({ length: 7 }, (_, i) => String(i)))("weekday %s", (k) => {
    expectNonEmptyEverywhere(["car", "dates", "weekday", k]);
  });
});
