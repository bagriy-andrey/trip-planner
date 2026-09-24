/**
 * How a country flag is drawn (AC-22): "emoji" (regional-indicator pair) or "code" (two-letter
 * code in the mono face). The single place for this platform decision. An Android override
 * (`flag.android.ts` -> "code") appears only if a device turns up whose fonts lack flags.
 */
export const FLAG_DISPLAY: "emoji" | "code" = "emoji";
