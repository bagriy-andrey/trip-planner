import { z } from "zod";
import { isAuthFieldErrorId, type AuthFieldErrorId } from "./errorCodes";

/** Field name (schema key) -> error id. Only invalid fields are present. */
export type AuthFieldErrors = Partial<Record<string, AuthFieldErrorId>>;

export type AuthFormResult<S extends z.ZodObject> =
  | { ok: true; value: z.output<S> }
  | { ok: false; fieldErrors: AuthFieldErrors };

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

/**
 * Validates (and normalises) a form with `safeParse`. Never throws. On failure returns the error
 * identifier of EVERY invalid field (the first issue per field), never texts.
 * A non-object input is treated as a form with every field missing.
 */
export function parseAuthForm<S extends z.ZodObject>(schema: S, input: unknown): AuthFormResult<S> {
  const result = schema.safeParse(isRecord(input) ? input : {});
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const { fieldErrors: raw } = z.flattenError(result.error);
  const fieldErrors: AuthFieldErrors = {};
  for (const [field, messages] of Object.entries(raw)) {
    const id = (messages ?? []).find(isAuthFieldErrorId);
    if (id !== undefined) {
      fieldErrors[field] = id;
    }
  }
  return { ok: false, fieldErrors };
}
