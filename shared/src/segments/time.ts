/**
 * Local wall-clock time (calendar date + "HH:MM" + IANA zone) <-> UTC instant, WITHOUT a timezone
 * library (R-1 / AC-29, AC-30): the offset of a zone at a given instant is read from
 * `Intl.DateTimeFormat(..., { timeZone, hourCycle: "h23" }).formatToParts`, never from a table this
 * module would have to keep in sync with the IANA database itself.
 *
 * `Intl` is ECMAScript (present in Hermes, browsers, Deno and Node) — used here ONLY to resolve an
 * offset, never to format a string for display (that stays a `mobile/` concern).
 */
import { isCalendarDate, type CalendarDate } from "../trips/calendarDate";

/** "HH:MM", 24-hour, zero-padded (what the time picker emits). */
export type ClockTime = `${number}:${number}`;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** True for a well-formed 24-hour "HH:MM" (00:00..23:59). */
export function isClockTime(value: unknown): value is ClockTime {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

function parseTime(value: string): { hour: number; minute: number } {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new RangeError(`Not a clock time (HH:MM): "${value}"`);
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

type ZonedFields = {
  year: number;
  month: number; // 1..12
  day: number;
  hour: number; // 0..23
  minute: number;
  second: number;
};

const FIELD_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

function fieldFormatter(zone: string): Intl.DateTimeFormat {
  let formatter = FIELD_FORMATTER_CACHE.get(zone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    FIELD_FORMATTER_CACHE.set(zone, formatter);
  }
  return formatter;
}

/** The wall-clock fields `zone` shows at the instant `instantMs` (epoch ms). */
function zonedFields(zone: string, instantMs: number): ZonedFields {
  const parts = fieldFormatter(zone).formatToParts(new Date(instantMs));
  const map: Partial<Record<string, string>> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/**
 * `zone`'s offset from UTC at `instantMs`, in milliseconds (positive east of UTC, e.g. `+2h` for
 * `Europe/Warsaw` in summer). Computed as "the wall-clock time `zone` shows, read as if it were UTC"
 * minus the real instant — no offset table, no parsing of `+HH:MM` strings.
 */
function offsetAt(zone: string, instantMs: number): number {
  const f = zonedFields(zone, instantMs);
  const asUtc = Date.UTC(f.year, f.month - 1, f.day, f.hour, f.minute, f.second);
  return asUtc - instantMs;
}

/**
 * Comfortably wider than any IANA UTC offset (max magnitude 14h) plus any single DST shift: a
 * window of `now ± MARGIN` around the naive local-as-UTC guess is guaranteed to both contain the
 * real target instant AND bracket the one DST transition (if any) that could affect it. IANA zones
 * never carry two transitions this close together.
 */
const TRANSITION_SEARCH_MARGIN_MS = 24 * 60 * 60 * 1000;

/**
 * The first instant at or after `lo` where `zone`'s offset differs from `offsetAtLo` (binary
 * search). Precondition: `offsetAt(zone, lo) === offsetAtLo` and `offsetAt(zone, hi) !== offsetAtLo`
 * — i.e. exactly one transition lies in `(lo, hi]`.
 */
function findTransitionInstant(zone: string, lo: number, hi: number, offsetAtLo: number): number {
  let low = lo;
  let high = hi;
  while (high - low > 1) {
    const mid = low + Math.floor((high - low) / 2);
    if (offsetAt(zone, mid) === offsetAtLo) {
      low = mid;
    } else {
      high = mid;
    }
  }
  return high;
}

/**
 * Local wall-clock time (`date` + `time`) in `zone` -> the UTC instant it names, without a timezone
 * library (AC-29). The local fields are first read as if they were UTC (`localAsUtc`); the offsets
 * `TRANSITION_SEARCH_MARGIN_MS` before and after that guess bracket any DST transition relevant to
 * it:
 *  - no transition in the window: the ordinary case, one offset, one instant.
 *  - a transition IS in the window: binary search finds its exact instant, then each of the two
 *    candidate instants (built from the pre- and the post-transition offset) is checked against it —
 *    a candidate is only valid if it actually falls in the time range its own offset governs:
 *    - both valid (fall-back, the local time is shown twice): the FIRST (earlier) occurrence is
 *      returned — always the one built from the PRE-transition offset (fall-back strictly decreases
 *      the offset, so pre > post, so `local - offsetPre < local - offsetPost`) (AC-30, Q-E default).
 *    - neither valid (spring-forward, the local time never exists): resolved to the offset BEFORE
 *      the transition, so the instant lands past the gap (e.g. 2:30 in a "2:00 -> 3:00" gap
 *      resolves to what the post-transition clock reads as 3:30) (AC-30).
 *    - exactly one valid: the unambiguous case (still possible even with a transition in the window,
 *      when `date`/`time` isn't actually on the transition's day).
 *
 * Throws `RangeError` on a malformed `date`/`time` (callers pass already-validated values).
 */
export function zonedDateTimeToInstant(date: CalendarDate, time: string, zone: string): Date {
  if (!isCalendarDate(date)) throw new RangeError(`Not a calendar date (YYYY-MM-DD): "${date}"`);
  const { hour, minute } = parseTime(time);
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const localAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  const offsetBefore = offsetAt(zone, localAsUtc - TRANSITION_SEARCH_MARGIN_MS);
  const offsetAfter = offsetAt(zone, localAsUtc + TRANSITION_SEARCH_MARGIN_MS);
  if (offsetBefore === offsetAfter) {
    return new Date(localAsUtc - offsetBefore);
  }

  const transition = findTransitionInstant(
    zone,
    localAsUtc - TRANSITION_SEARCH_MARGIN_MS,
    localAsUtc + TRANSITION_SEARCH_MARGIN_MS,
    offsetBefore,
  );
  const candidateEarlier = localAsUtc - offsetBefore;
  const candidateLater = localAsUtc - offsetAfter;
  const validEarlier = candidateEarlier < transition;
  const validLater = candidateLater >= transition;

  if (validEarlier && validLater) return new Date(Math.min(candidateEarlier, candidateLater));
  if (validEarlier) return new Date(candidateEarlier);
  if (validLater) return new Date(candidateLater);
  return new Date(candidateEarlier);
}

/** The calendar date + "HH:MM" `zone` shows at instant `instant` (prefill, display, day math). */
export function instantToZonedParts(instant: Date, zone: string): { date: CalendarDate; time: ClockTime } {
  if (Number.isNaN(instant.getTime())) throw new RangeError("Invalid Date");
  const f = zonedFields(zone, instant.getTime());
  const pad = (value: number, width: number): string => String(value).padStart(width, "0");
  const date = `${pad(f.year, 4)}-${pad(f.month, 2)}-${pad(f.day, 2)}`;
  const time = `${pad(f.hour, 2)}:${pad(f.minute, 2)}`;
  if (!isCalendarDate(date)) throw new RangeError(`Not a calendar date: ${date}`);
  if (!isClockTime(time)) throw new RangeError(`Not a clock time: ${time}`);
  return { date, time };
}
