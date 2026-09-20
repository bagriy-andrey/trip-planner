import {
  formatDateRange,
  formatNights,
  formatRelativeDays,
  formatShortDate,
  formatTime,
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
