// Classifies whatever the backend (or the network) returned into a FIXED set of kinds. Only the
// code / status / error class is read — the server's message text is never returned, shown or
// logged (AC-60): a kind is the contract with the localized strings.
//
// Deliberately duck-typed: this file does not import `@supabase/supabase-js` (AC-8). It copes with
// anything that can come back — a PostgREST error object, `TypeError: Network request failed`,
// the abort raised by the 15 s request timeout (postgrest-js turns it into an object whose
// `message` starts with `AbortError:` and reports `status: 0` next to it), plain values.

export const TRIP_ERROR_KINDS = ["notFound", "offline", "timeout", "denied", "unknown"] as const;

export type TripErrorKind = (typeof TRIP_ERROR_KINDS)[number];

const DENIED_CODES: ReadonlySet<string> = new Set([
  "42501", // insufficient_privilege (RLS `with check` violation)
  "PGRST301", // JWT expired / invalid
  "PGRST302", // anonymous access is disabled
  "PGRST303", // JWT claims invalid
]);

const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  "PGRST116", // "no rows" for a request that expected exactly one
  "22P02", // invalid_text_representation: an id that is not a uuid can match nothing
]);

const TIMEOUT_NAMES: ReadonlySet<string> = new Set(["AbortError", "TimeoutError"]);
const TIMEOUT_STATUSES: ReadonlySet<number> = new Set([408, 504]);
const OFFLINE_STATUSES: ReadonlySet<number> = new Set([502, 503]);

const ABORT_MESSAGE = /^(abort|timeout)error\b|\baborted\b|timed? ?out/i;
const NETWORK_MESSAGE = /network request failed|failed to fetch|network error|fetcherror|load failed/i;

function field(error: object, name: string): unknown {
  return (error as Record<string, unknown>)[name];
}

/** A kind from an HTTP status alone; `0` means no response arrived at all. */
function kindOfStatus(status: number): TripErrorKind {
  if (status === 0) return "offline";
  if (status === 401 || status === 403) return "denied";
  if (TIMEOUT_STATUSES.has(status)) return "timeout";
  if (OFFLINE_STATUSES.has(status)) return "offline";
  return "unknown";
}

/**
 * `status` is the HTTP status the response carried (postgrest-js reports it next to, not inside,
 * the error object); `0` means no response arrived at all.
 */
export function mapTripError(error: unknown, status?: number): TripErrorKind {
  if (typeof error !== "object" || error === null) {
    return status === undefined ? "unknown" : kindOfStatus(status);
  }

  const code = field(error, "code");
  if (typeof code === "string") {
    if (DENIED_CODES.has(code)) return "denied";
    if (NOT_FOUND_CODES.has(code)) return "notFound";
  }

  const name = field(error, "name");
  const message = field(error, "message");
  if (typeof name === "string" && TIMEOUT_NAMES.has(name)) return "timeout";
  if (typeof message === "string" && ABORT_MESSAGE.test(message)) return "timeout";

  const own = field(error, "status");
  const httpStatus = status ?? (typeof own === "number" ? own : undefined);
  if (httpStatus !== undefined) {
    const byStatus = kindOfStatus(httpStatus);
    if (byStatus !== "unknown") return byStatus;
  }

  // A bare fetch rejection (RN: `TypeError: Network request failed`) that nothing wrapped.
  if (typeof message === "string" && NETWORK_MESSAGE.test(message)) return "offline";

  return "unknown";
}

/**
 * The error code, when (and only when) it looks like a database / PostgREST identifier such as
 * `42501` or `PGRST116`. Safe to log: nothing else from the error object is ever exposed.
 */
export function safeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = field(error, "code");
  return typeof code === "string" && /^[A-Za-z0-9_]{1,32}$/.test(code) ? code : undefined;
}

/**
 * What the query hooks throw when an api call answers `{ ok: false }`. It carries ONLY the kind:
 * the query client's retry rule reads `error.kind` (transient kinds get one more attempt), and the
 * message is the fixed kind name, never server text.
 */
export class TripApiError extends Error {
  readonly kind: TripErrorKind;

  constructor(kind: TripErrorKind) {
    super(kind);
    this.name = "TripApiError";
    this.kind = kind;
  }
}
