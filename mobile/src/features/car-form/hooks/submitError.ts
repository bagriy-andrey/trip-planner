import { TripApiError } from "@/features/trips";

/** Which `trips:errors.*` message a failed request shows; `notFound` has no message of its own. */
export type SubmitErrorKind = "offline" | "timeout" | "denied" | "unknown";

export function submitErrorKind(error: unknown): SubmitErrorKind {
  if (!(error instanceof TripApiError)) return "unknown";
  return error.kind === "notFound" ? "unknown" : error.kind;
}

/** The rental is gone (deleted elsewhere): a state of its own, not an error message. */
export function isNotFound(error: unknown): boolean {
  return error instanceof TripApiError && error.kind === "notFound";
}
