import {
  formatCalendarDate,
  formatCalendarRange,
  formatDateRange,
  formatDuration,
  formatNights,
  formatRelativeDays,
  formatSegmentDateTime,
  formatShortDate,
  formatStopoverDays,
  formatTime,
  formatTripDateLine,
} from "../format";

const utc = (iso: string) => new Date(iso);
const NOW = utc("2026-09-07T10:00:00Z");

describe("formatDateRange", () => {
  const start = utc("2026-09-12T00:00:00Z");
  const end = utc("2026-09-18T00:00:00Z");

  it("formats a same-month range in Russian", () => {
    expect(formatDateRange("ru", start, end)).toMatch(/^12\s?[–-]\s?18 сент\.? 2026/);
  });

  it("formats a same-month range in English", () => {
    expect(formatDateRange("en", start, end)).toMatch(/^Sep 12\s?[–-]\s?18, 2026$/);
  });

  it("keeps both months when the range crosses a month boundary", () => {
    expect(formatDateRange("ru", utc("2026-09-28T00:00:00Z"), utc("2026-10-03T00:00:00Z"))).toMatch(
      /28 сент\.?\s?[–-]\s?3 окт\.? 2026/,
    );
    expect(formatDateRange("en", utc("2026-09-28T00:00:00Z"), utc("2026-10-03T00:00:00Z"))).toMatch(
      /Sep 28\s?[–-]\s?Oct 3, 2026/,
    );
  });

  it("renders in the requested time zone, defaulting to UTC", () => {
    const lateUtc = utc("2026-09-12T23:30:00Z");
    expect(formatShortDate("en", lateUtc)).toBe("Sep 12");
    expect(formatShortDate("en", lateUtc, "Asia/Tokyo")).toBe("Sep 13");
  });
});

describe("formatShortDate / formatTime", () => {
  const date = utc("2026-09-12T07:40:00Z");

  it("is locale-specific, with no cross-locale format leakage", () => {
    expect(formatShortDate("ru", date)).toMatch(/^12 сент/);
    expect(formatShortDate("en", date)).toBe("Sep 12");
  });

  it("uses the locale's hour cycle", () => {
    expect(formatTime("ru", date)).toBe("7:40");
    expect(formatTime("en", date)).toMatch(/^7:40\sAM$/);
  });
});

describe("formatNights", () => {
  it.each([
    [1, "1 ночь"],
    [2, "2 ночи"],
    [4, "4 ночи"],
    [5, "5 ночей"],
    [6, "6 ночей"],
    [11, "11 ночей"],
    [21, "21 ночь"],
    [22, "22 ночи"],
  ])("ru %i -> %s", (nights, expected) => {
    expect(formatNights("ru", nights)).toBe(expected);
  });

  it.each([
    [1, "1 night"],
    [2, "2 nights"],
    [6, "6 nights"],
  ])("en %i -> %s", (nights, expected) => {
    expect(formatNights("en", nights)).toBe(expected);
  });
});

describe("formatRelativeDays", () => {
  const inDays = (days: number) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

  it.each([
    [1, "через 1 день"],
    [2, "через 2 дня"],
    [4, "через 4 дня"],
    [5, "через 5 дней"],
    [11, "через 11 дней"],
    [12, "через 12 дней"],
    [21, "через 21 день"],
    [22, "через 22 дня"],
    [25, "через 25 дней"],
  ])("ru +%i days -> %s", (days, expected) => {
    expect(formatRelativeDays("ru", inDays(days), NOW)).toBe(expected);
  });

  it.each([
    [1, "in 1 day"],
    [2, "in 2 days"],
    [5, "in 5 days"],
    [21, "in 21 days"],
  ])("en +%i days -> %s", (days, expected) => {
    expect(formatRelativeDays("en", inDays(days), NOW)).toBe(expected);
  });

  it("counts calendar days, so crossing midnight moves the label", () => {
    const lateEvening = utc("2026-09-07T23:59:00Z");
    expect(formatRelativeDays("en", utc("2026-09-08T00:01:00Z"), lateEvening)).toBe("in 1 day");
    expect(formatRelativeDays("en", utc("2026-09-07T23:59:30Z"), utc("2026-09-07T00:00:00Z"))).toBe("today");
  });

  it("labels today and past trips without a count", () => {
    expect(formatRelativeDays("ru", NOW, NOW)).toBe("сегодня");
    expect(formatRelativeDays("en", NOW, NOW)).toBe("today");
    expect(formatRelativeDays("ru", inDays(-1), NOW)).toBe("завершено");
    expect(formatRelativeDays("en", inDays(-30), NOW)).toBe("completed");
  });
});

// Spaces inside Intl output are thin/no-break: normalise before comparing (mobile/insights.md).
const plain = (value: string) => value.replace(/\s/g, " ");

describe("calendar dates", () => {
  it("formats one date per locale, year included", () => {
    expect(plain(formatCalendarDate("en", "2026-09-12"))).toBe("Sep 12, 2026");
    expect(plain(formatCalendarDate("ru", "2026-09-12"))).toMatch(/^12 сент\.? 2026/);
  });

  it("formats a same-month range", () => {
    expect(plain(formatCalendarRange("en", "2026-09-12", "2026-09-18"))).toMatch(/^Sep 12 [–-] 18, 2026$/);
    expect(plain(formatCalendarRange("ru", "2026-09-12", "2026-09-18"))).toMatch(/^12 ?[–-] ?18 сент\.? 2026/);
  });

  it("keeps both months across a month rollover", () => {
    expect(plain(formatCalendarRange("en", "2026-09-28", "2026-10-03"))).toMatch(/^Sep 28 [–-] Oct 3, 2026$/);
    expect(plain(formatCalendarRange("ru", "2026-09-28", "2026-10-03"))).toMatch(
      /^28 сент\.? ?[–-] ?3 окт\.? 2026/,
    );
  });

  it("renders February 29 of a leap year and rejects it in a common year", () => {
    expect(plain(formatCalendarDate("en", "2028-02-29"))).toBe("Feb 29, 2028");
    expect(() => formatCalendarDate("en", "2027-02-29")).toThrow(RangeError);
  });

  it.each(["2026-9-12", "2026-09-12T00:00:00Z", "12.09.2026", "", "2026-13-01", "2026-04-31"])(
    "rejects the malformed value %j",
    (value) => {
      expect(() => formatCalendarDate("en", value)).toThrow(RangeError);
    },
  );

  describe("formatTripDateLine", () => {
    it.each([
      ["en", "2026-09-12", "2026-09-18", /^Sep 12 [–-] 18, 2026 · 6 nights$/],
      ["ru", "2026-09-12", "2026-09-18", /^12 ?[–-] ?18 сент\.? 2026.* · 6 ночей$/],
      // Month rollover.
      ["en", "2026-09-28", "2026-10-03", /^Sep 28 [–-] Oct 3, 2026 · 5 nights$/],
      ["ru", "2026-09-28", "2026-10-03", /· 5 ночей$/],
      // Across February 29 of a leap year: 28 Feb -> 2 Mar is 3 nights.
      ["en", "2028-02-28", "2028-03-02", /^Feb 28 [–-] Mar 2, 2028 · 3 nights$/],
      ["ru", "2028-02-28", "2028-03-02", /· 3 ночи$/],
      // Same day: zero nights, a single date.
      ["en", "2026-09-12", "2026-09-12", /^Sep 12, 2026 · 0 nights$/],
      ["ru", "2026-09-12", "2026-09-12", /^12 сент\.? 2026.* · 0 ночей$/],
      ["en", "2026-09-12", "2026-09-13", /· 1 night$/],
      ["ru", "2026-09-12", "2026-09-13", /· 1 ночь$/],
      // Year rollover.
      ["en", "2026-12-30", "2027-01-02", /· 3 nights$/],
    ] as const)("%s %s -> %s", (locale, start, end, expected) => {
      expect(plain(formatTripDateLine(locale, start, end))).toMatch(expected);
    });
  });

  // AC-72/AC-74: a calendar date must not move a day, whatever the device zone.
  describe("does not shift the day in a negative-offset time zone", () => {
    // `process.env.TZ` set inside a jest worker does not reach the real process, so the device
    // zone is simulated where it matters: an `Intl.DateTimeFormat` built without an explicit
    // `timeZone` falls back to Los Angeles instead of the machine's zone. An implementation that
    // forgot `timeZone: "UTC"` would then render the previous day.
    const RealDateTimeFormat = Intl.DateTimeFormat;
    beforeAll(() => {
      jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
        (locales?: ConstructorParameters<typeof Intl.DateTimeFormat>[0], options?: Intl.DateTimeFormatOptions) =>
          new RealDateTimeFormat(locales, { timeZone: "America/Los_Angeles", ...options }),
      );
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });

    it("really simulates a zone behind UTC (precondition)", () => {
      const utcMidnight = new Date(Date.UTC(2026, 8, 12));
      // The naive rendering of a UTC-midnight date is exactly what would go wrong here.
      expect(new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(utcMidnight)).toBe("Sep 11");
    });

    it("keeps the typed day", () => {
      expect(plain(formatCalendarDate("en", "2026-09-12"))).toBe("Sep 12, 2026");
      expect(plain(formatCalendarRange("en", "2026-09-12", "2026-09-18"))).toMatch(/^Sep 12 [–-] 18, 2026$/);
      expect(plain(formatTripDateLine("en", "2026-03-08", "2026-03-09"))).toMatch(/^Mar 8 [–-] 9, 2026 · 1 night$/);
    });

    it("counts nights over a DST change without an off-by-one", () => {
      // US DST began 2026-03-08 (a 23-hour local day): still exactly 2 nights.
      expect(formatTripDateLine("en", "2026-03-07", "2026-03-09")).toMatch(/· 2 nights$/);
    });
  });
});

describe("formatDuration", () => {
  it("formats an hour-and-minutes layover in both locales", () => {
    expect(formatDuration("ru", 65 * 60 * 1000)).toBe("1 ч 05 мин");
    expect(formatDuration("en", 65 * 60 * 1000)).toBe("1 h 05 min");
  });

  it("pads single-digit minutes when combined with hours", () => {
    expect(formatDuration("ru", 60 * 60 * 1000 + 5 * 60 * 1000)).toBe("1 ч 05 мин");
    expect(formatDuration("en", 2 * 60 * 60 * 1000 + 9 * 60 * 1000)).toBe("2 h 09 min");
  });

  it("omits the hours part under one hour", () => {
    expect(formatDuration("ru", 45 * 60 * 1000)).toBe("45 мин");
    expect(formatDuration("en", 45 * 60 * 1000)).toBe("45 min");
  });

  it("rounds to the nearest whole minute", () => {
    expect(formatDuration("en", 65 * 60 * 1000 + 40 * 1000)).toBe("1 h 06 min");
  });
});

describe("formatStopoverDays", () => {
  it.each([
    [1, "1 день в Порту"],
    [2, "2 дня в Порту"],
    [4, "4 дня в Порту"],
    [5, "5 дней в Порту"],
    [11, "11 дней в Порту"],
    [21, "21 день в Порту"],
  ])("ru %i -> %s", (days, expected) => {
    expect(formatStopoverDays("ru", days, "Порту")).toBe(expected);
  });

  it.each([
    [1, "1 day in Porto"],
    [2, "2 days in Porto"],
    [5, "5 days in Porto"],
  ])("en %i -> %s", (days, expected) => {
    expect(formatStopoverDays("en", days, "Porto")).toBe(expected);
  });
});

describe("formatSegmentDateTime", () => {
  const instant = utc("2026-09-12T23:30:00Z");

  it("requires an explicit time zone (no UTC default) and renders that zone's local time", () => {
    expect(plain(formatSegmentDateTime("en", instant, "Asia/Tokyo"))).toBe("Sep 13, 8:30 AM");
    expect(plain(formatSegmentDateTime("en", instant, "UTC"))).toBe("Sep 12, 11:30 PM");
  });

  // Device time zone override: prove a segment keeps its OWN airport's local time
  // even when the device (an unspecified `Intl.DateTimeFormat` zone) is a THIRD zone.
  describe("stays anchored to the segment's own zone under a different device zone", () => {
    const RealDateTimeFormat = Intl.DateTimeFormat;
    beforeAll(() => {
      jest.spyOn(Intl, "DateTimeFormat").mockImplementation(
        (locales?: ConstructorParameters<typeof Intl.DateTimeFormat>[0], options?: Intl.DateTimeFormatOptions) =>
          new RealDateTimeFormat(locales, { timeZone: "America/Los_Angeles", ...options }),
      );
    });
    afterAll(() => {
      jest.restoreAllMocks();
    });

    it("really simulates a third device zone (precondition)", () => {
      expect(new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(instant)).toMatch(
        /4:30\sPM/,
      );
    });

    it("still shows the Tokyo airport's own local time, not the device's", () => {
      expect(plain(formatSegmentDateTime("en", instant, "Asia/Tokyo"))).toBe("Sep 13, 8:30 AM");
    });
  });
});
