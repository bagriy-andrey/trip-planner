import { describe, expect, it } from "vitest";
import {
  deriveTripStatus,
  isCalendarDate,
  pickUpcomingTripId,
  selectActiveTrips,
  selectHistoryTrips,
  type CalendarDate,
  type TripLifecycle,
} from "../../index";

const d = (value: string): CalendarDate => {
  if (!isCalendarDate(value)) throw new Error(`fixture is not a calendar date: ${value}`);
  return value;
};

const TODAY = d("2026-09-21");

function lifecycle(start: string | null, end: string | null, archivedAt: string | null = null): TripLifecycle {
  return { startDate: start === null ? null : d(start), endDate: end === null ? null : d(end), archivedAt };
}

describe("deriveTripStatus (AC-22)", () => {
  it.each<[string, TripLifecycle, string]>([
    ["no dates -> draft", lifecycle(null, null), "draft"],
    ["future dates -> planned", lifecycle("2026-10-01", "2026-10-08"), "planned"],
    ["start today, end later -> planned", lifecycle("2026-09-21", "2026-09-25"), "planned"],
    ["under way (start past, end future) -> planned", lifecycle("2026-09-18", "2026-09-25"), "planned"],
    ["END = TODAY -> NOT completed (still active)", lifecycle("2026-09-15", "2026-09-21"), "planned"],
    ["one-day trip today -> planned", lifecycle("2026-09-21", "2026-09-21"), "planned"],
    ["end = YESTERDAY -> completed", lifecycle("2026-09-15", "2026-09-20"), "completed"],
    ["long past -> completed", lifecycle("2019-05-01", "2019-05-09"), "completed"],
    ["archived over future dates -> archived", lifecycle("2026-10-01", "2026-10-08", "2026-09-01T10:00:00+00:00"), "archived"],
    ["archived over past dates -> archived", lifecycle("2019-05-01", "2019-05-09", "2026-09-01T10:00:00+00:00"), "archived"],
    ["archived over ongoing dates -> archived", lifecycle("2026-09-18", "2026-09-25", "2026-09-19T10:00:00+00:00"), "archived"],
    ["archived without dates -> archived (not draft)", lifecycle(null, null, "2026-09-01T10:00:00+00:00"), "archived"],
  ])("%s", (_label, trip, expected) => {
    expect(deriveTripStatus(trip, TODAY)).toBe(expected);
  });

  it("an empty archivedAt string is not an archive mark", () => {
    expect(deriveTripStatus(lifecycle("2026-10-01", "2026-10-08", ""), TODAY)).toBe("planned");
  });

  it("is a pure function of its arguments: the same trip flips only when `today` moves", () => {
    const trip = lifecycle("2026-09-15", "2026-09-21");
    expect(deriveTripStatus(trip, d("2026-09-21"))).toBe("planned");
    expect(deriveTripStatus(trip, d("2026-09-22"))).toBe("completed");
    expect(deriveTripStatus(trip, d("2026-09-20"))).toBe("planned");
  });

  it("never yields `upcoming` (that is a property of the list)", () => {
    const statuses = new Set([
      deriveTripStatus(lifecycle("2026-10-01", "2026-10-08"), TODAY),
      deriveTripStatus(lifecycle(null, null), TODAY),
      deriveTripStatus(lifecycle("2019-01-01", "2019-01-02"), TODAY),
    ]);
    expect(statuses).toEqual(new Set(["planned", "draft", "completed"]));
  });
});

interface Fixture extends TripLifecycle {
  id: string;
  createdAt: string;
}

function trip(id: string, start: string | null, end: string | null, extra: Partial<Fixture> = {}): Fixture {
  return { id, createdAt: `2026-09-0${(id.charCodeAt(0) % 9) + 1}T10:00:00+00:00`, ...lifecycle(start, end), ...extra };
}

describe("pickUpcomingTripId (AC-23)", () => {
  it("picks exactly one trip out of several future ones: the earliest start", () => {
    const list = [
      trip("c", "2026-12-01", "2026-12-05"),
      trip("a", "2026-10-03", "2026-10-09"),
      trip("b", "2026-11-01", "2026-11-05"),
    ];
    expect(pickUpcomingTripId(list)).toBe("a");
  });

  it("returns null for an empty list and for a list where nobody has dates", () => {
    expect(pickUpcomingTripId([])).toBeNull();
    expect(pickUpcomingTripId([trip("a", null, null), trip("b", null, null)])).toBeNull();
  });

  it("skips trips without dates when others have them", () => {
    expect(pickUpcomingTripId([trip("draft", null, null), trip("dated", "2026-11-01", "2026-11-05")])).toBe("dated");
  });

  it("is deterministic at equal start dates: earliest created, then smallest id", () => {
    const a = trip("a", "2026-10-03", "2026-10-09", { createdAt: "2026-09-10T10:00:00+00:00" });
    const b = trip("b", "2026-10-03", "2026-10-09", { createdAt: "2026-09-05T10:00:00+00:00" });
    expect(pickUpcomingTripId([a, b])).toBe("b");
    expect(pickUpcomingTripId([b, a])).toBe("b");
    const sameMoment = "2026-09-05T10:00:00+00:00";
    const x = trip("x", "2026-10-03", "2026-10-09", { createdAt: sameMoment });
    const y = trip("y", "2026-10-03", "2026-10-09", { createdAt: sameMoment });
    expect(pickUpcomingTripId([y, x])).toBe("x");
    expect(pickUpcomingTripId([x, y])).toBe("x");
  });

  it("does not depend on the input order", () => {
    const list = [trip("a", "2026-10-03", "2026-10-09"), trip("b", "2026-11-01", "2026-11-05"), trip("c", "2027-01-01", "2027-01-05")];
    const reversed = [...list].reverse();
    expect(pickUpcomingTripId(reversed)).toBe(pickUpcomingTripId(list));
  });

  it("never picks an archived trip", () => {
    const list = [trip("gone", "2026-09-25", "2026-09-30", { archivedAt: "2026-09-01T10:00:00+00:00" }), trip("kept", "2026-10-25", "2026-10-30")];
    expect(pickUpcomingTripId(list)).toBe("kept");
  });

  it("marks exactly one trip of an active list", () => {
    const all = [
      trip("a", "2026-10-03", "2026-10-09"),
      trip("b", "2026-11-01", "2026-11-05"),
      trip("c", null, null),
      trip("old", "2026-01-01", "2026-01-05"),
    ];
    const active = selectActiveTrips(all, TODAY);
    const upcoming = pickUpcomingTripId(active);
    expect(active.filter((t) => t.id === upcoming)).toHaveLength(1);
    expect(upcoming).toBe("a");
  });
});

describe("selectActiveTrips (AC-35)", () => {
  const all = [
    trip("far", "2027-03-01", "2027-03-05"),
    trip("draft", null, null),
    trip("near", "2026-10-03", "2026-10-09"),
    trip("today-end", "2026-09-15", "2026-09-21"),
    trip("done", "2026-09-01", "2026-09-05"),
    trip("archived", "2026-10-20", "2026-10-25", { archivedAt: "2026-09-10T10:00:00+00:00" }),
    trip("archived-draft", null, null, { archivedAt: "2026-09-10T10:00:00+00:00" }),
  ];

  it("keeps planned and draft trips only, dropping completed and archived ones", () => {
    expect(selectActiveTrips(all, TODAY).map((t) => t.id)).toEqual(["today-end", "near", "far", "draft"]);
  });

  it("orders by start ascending with trips WITHOUT dates last", () => {
    const ids = selectActiveTrips(all, TODAY).map((t) => t.id);
    expect(ids.at(-1)).toBe("draft");
    expect(ids.indexOf("near")).toBeLessThan(ids.indexOf("far"));
  });

  it("orders ties by creation time then id, so the list does not shiver", () => {
    const list = [
      trip("b", "2026-10-03", "2026-10-09", { createdAt: "2026-09-02T10:00:00+00:00" }),
      trip("a", "2026-10-03", "2026-10-09", { createdAt: "2026-09-03T10:00:00+00:00" }),
      trip("c", "2026-10-03", "2026-10-09", { createdAt: "2026-09-02T10:00:00+00:00" }),
      trip("d2", null, null, { createdAt: "2026-09-04T10:00:00+00:00" }),
      trip("d1", null, null, { createdAt: "2026-09-01T10:00:00+00:00" }),
    ];
    expect(selectActiveTrips(list, TODAY).map((t) => t.id)).toEqual(["b", "c", "a", "d1", "d2"]);
    expect(selectActiveTrips([...list].reverse(), TODAY).map((t) => t.id)).toEqual(["b", "c", "a", "d1", "d2"]);
  });

  it("does not mutate its input", () => {
    const input = [...all];
    selectActiveTrips(input, TODAY);
    expect(input).toEqual(all);
  });

  it("moves a trip out when `today` passes its end date", () => {
    expect(selectActiveTrips(all, d("2026-09-22")).map((t) => t.id)).not.toContain("today-end");
  });

  it("returns an empty list for no trips", () => {
    expect(selectActiveTrips([], TODAY)).toEqual([]);
  });
});

describe("selectHistoryTrips (AC-36, Q11)", () => {
  it("keeps completed and archived trips only", () => {
    const all = [
      trip("active", "2026-10-03", "2026-10-09"),
      trip("draft", null, null),
      trip("done", "2026-09-01", "2026-09-05"),
      trip("arch", "2026-10-20", "2026-10-25", { archivedAt: "2026-09-10T10:00:00+00:00" }),
    ];
    expect(new Set(selectHistoryTrips(all, TODAY).map((t) => t.id))).toEqual(new Set(["done", "arch"]));
  });

  it("puts the most recently ended trip first", () => {
    const all = [
      trip("2019", "2019-05-01", "2019-05-09"),
      trip("aug", "2026-08-01", "2026-08-09"),
      trip("2024", "2024-05-01", "2024-05-09"),
    ];
    expect(selectHistoryTrips(all, TODAY).map((t) => t.id)).toEqual(["aug", "2024", "2019"]);
  });

  it("sorts an archived trip WITHOUT dates by the moment it was archived, not to the bottom (Q11)", () => {
    const all = [
      trip("aug", "2026-08-01", "2026-08-09"),
      trip("2024", "2024-05-01", "2024-05-09"),
      trip("arch-draft", null, null, { archivedAt: "2026-09-10T08:00:00+00:00" }),
      trip("old-arch-draft", null, null, { archivedAt: "2023-01-10T08:00:00+00:00" }),
    ];
    expect(selectHistoryTrips(all, TODAY).map((t) => t.id)).toEqual(["arch-draft", "aug", "2024", "old-arch-draft"]);
  });

  it("sorts an archived trip WITH dates by its end date", () => {
    const all = [
      trip("aug", "2026-08-01", "2026-08-09"),
      trip("arch", "2026-07-01", "2026-07-09", { archivedAt: "2026-09-10T08:00:00+00:00" }),
    ];
    expect(selectHistoryTrips(all, TODAY).map((t) => t.id)).toEqual(["aug", "arch"]);
  });

  it("brings a restored trip back by its DATES, not by where it lay before (AC-53)", () => {
    const future = trip("future", "2026-10-20", "2026-10-25", { archivedAt: "2026-09-10T08:00:00+00:00" });
    const past = trip("past", "2026-05-01", "2026-05-09", { archivedAt: "2026-09-10T08:00:00+00:00" });
    const restored = [future, past].map((t) => ({ ...t, archivedAt: null }));
    expect(selectActiveTrips(restored, TODAY).map((t) => t.id)).toEqual(["future"]);
    expect(selectHistoryTrips(restored, TODAY).map((t) => t.id)).toEqual(["past"]);
    // while archived, both are in history
    expect(selectHistoryTrips([future, past], TODAY)).toHaveLength(2);
    expect(selectActiveTrips([future, past], TODAY)).toEqual([]);
  });

  it("is stable on ties: newer creation first, then id; does not mutate its input", () => {
    const list = [
      trip("a", "2026-08-01", "2026-08-09", { createdAt: "2026-09-02T10:00:00+00:00" }),
      trip("b", "2026-08-01", "2026-08-09", { createdAt: "2026-09-03T10:00:00+00:00" }),
      trip("c", "2026-08-01", "2026-08-09", { createdAt: "2026-09-03T10:00:00+00:00" }),
    ];
    const copy = [...list];
    expect(selectHistoryTrips(list, TODAY).map((t) => t.id)).toEqual(["b", "c", "a"]);
    expect(list).toEqual(copy);
    expect(selectHistoryTrips([...list].reverse(), TODAY).map((t) => t.id)).toEqual(["b", "c", "a"]);
  });

  it("copes with an unparseable archive timestamp (sorts last) without throwing", () => {
    const list = [trip("ok", "2026-08-01", "2026-08-09"), trip("bad", null, null, { archivedAt: "not a time" })];
    expect(selectHistoryTrips(list, TODAY).map((t) => t.id)).toEqual(["ok", "bad"]);
  });

  it("returns an empty list for no trips", () => {
    expect(selectHistoryTrips([], TODAY)).toEqual([]);
  });
});
