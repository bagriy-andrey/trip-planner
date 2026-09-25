import { HOTEL_FIELD_ERROR } from "@tripplanner/shared";

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

describe("hotel:form.validation.<id>", () => {
  it.each(Object.values(HOTEL_FIELD_ERROR))("%s has a non-empty string in ru, en and uk", (id) => {
    const path = ["hotel", "form", "validation", ...id.split(".")];
    for (const locale of [ru, en, uk]) {
      const value = resolve(locale, path);
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(0);
    }
  });
});
