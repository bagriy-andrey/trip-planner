import type { ru } from "./locales/ru";

// Typed resources: `t("common:actions.cancle")` is a `tsc` error (AC-24).
// Russian is the source shape; en/ru key parity (modulo plural suffixes, which
// legitimately differ per language) is enforced by __tests__/parity.test.ts.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: typeof ru;
  }
}
