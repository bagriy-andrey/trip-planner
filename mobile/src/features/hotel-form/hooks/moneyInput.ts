import { MONEY_MAX_INTEGER_DIGITS } from "@tripplanner/shared";

/** `numeric(12,2)`: the fraction never has more than two digits. */
const MAX_FRACTION_DIGITS = 2;

/**
 * Input filter for the cost field (typing AND pasting): digits plus at most one decimal separator
 * (`.` or `,`), at most 2 fraction digits and `MONEY_MAX_INTEGER_DIGITS` integer digits. It only
 * decides what can be typed; whether the value is a valid amount stays with `parseMoneyAmount`.
 */
export function filterMoneyInput(text: string): string {
  const separatorAt = text.search(/[.,]/);
  const digitsOnly = (part: string) => part.replace(/\D/g, "");
  if (separatorAt === -1) return digitsOnly(text).slice(0, MONEY_MAX_INTEGER_DIGITS);
  const integer = digitsOnly(text.slice(0, separatorAt)).slice(0, MONEY_MAX_INTEGER_DIGITS);
  const fraction = digitsOnly(text.slice(separatorAt + 1)).slice(0, MAX_FRACTION_DIGITS);
  return `${integer}${text[separatorAt]}${fraction}`;
}
