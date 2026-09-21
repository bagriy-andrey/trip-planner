import { z } from "zod";

/** Field name (schema key) -> error id. Only invalid fields are present. */
export type FormFieldErrors<Id extends string = string> = Partial<Record<string, Id>>;

export type FormResult<S extends z.ZodType, Id extends string = string> =
  | { ok: true; value: z.output<S> }
  | { ok: false; fieldErrors: FormFieldErrors<Id> };

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

/**
 * Validates (and normalises) a form with `safeParse`. Never throws. On failure returns the error
 * identifier of EVERY invalid top-level field (the first issue per field whose message is a known
 * id, judged by `isErrorId`), never texts. A non-object input is treated as a form with every
 * field missing.
 *
 * Generalisation of `auth/parseAuthForm` (which this module does not replace yet).
 */
export function parseForm<S extends z.ZodType, Id extends string>(
  schema: S,
  input: unknown,
  isErrorId: (value: unknown) => value is Id,
): FormResult<S, Id> {
  const result = schema.safeParse(isRecord(input) ? input : {});
  if (result.success) {
    return { ok: true, value: result.data };
  }
  const { fieldErrors: raw } = z.flattenError(result.error);
  const fieldErrors: FormFieldErrors<Id> = {};
  for (const [field, messages] of Object.entries(raw)) {
    const id = (Array.isArray(messages) ? messages : []).find(isErrorId);
    if (id !== undefined) {
      fieldErrors[field] = id;
    }
  }
  return { ok: false, fieldErrors };
}
