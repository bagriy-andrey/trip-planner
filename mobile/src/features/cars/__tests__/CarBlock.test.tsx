import { fireEvent, screen } from "@testing-library/react-native";

import { i18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { CarBlock } from "../components/CarBlock";
import { formatMoneyAmount, formatRentalRange, formatViewMoment } from "../format";
import { makeCar } from "../hooks/__tests__/testKit";
import { toCarCardData } from "../types";

const tOf = (locale: Locale) => i18n.getFixedT(locale, "car");

describe("formatRentalRange (AC-15)", () => {
  it.each([
    ["ru", "19 – 27 авг 2026", "30 авг – 2 сент 2026", "30 дек 2026 – 3 янв 2027"],
    ["en", "Aug 19 – 27, 2026", "Aug 30 – Sep 2, 2026", "Dec 30, 2026 – Jan 3, 2027"],
  ] as const)("%s: same month, same year, cross year", (locale, same, cross, year) => {
    const t = tOf(locale);
    expect(formatRentalRange(t, "2026-08-19", "2026-08-27")).toBe(same);
    expect(formatRentalRange(t, "2026-08-30", "2026-09-02")).toBe(cross);
    expect(formatRentalRange(t, "2026-12-30", "2027-01-03")).toBe(year);
  });

  it("uk has all three formats", () => {
    const t = tOf("uk");
    for (const [a, b] of [
      ["2026-08-19", "2026-08-27"],
      ["2026-08-30", "2026-09-02"],
      ["2026-12-30", "2027-01-03"],
    ] as const) {
      expect(formatRentalRange(t, a, b)).toMatch(/\d/);
      expect(formatRentalRange(t, a, b)).not.toContain("{{");
    }
  });
});

describe("moments and money", () => {
  it("view moment carries the weekday of the calendar date", () => {
    expect(formatViewMoment(tOf("ru"), "ru", "2026-08-19", "11:00")).toBe("Ср, 19 авг · 11:00");
    expect(formatViewMoment(tOf("en"), "en", "2026-08-19", "11:00")).toContain("Wed, Aug 19");
  });

  it("money always has two fraction digits", () => {
    expect(formatMoneyAmount("en", "120.5")).toBe("120.50");
  });
});

describe("toCarCardData", () => {
  it("ru card moments and same-place text", () => {
    const data = toCarCardData(makeCar(), tOf("ru"), "ru");
    expect(data.title).toBe("Hertz");
    expect(data.pickupText).toBe("19 авг, 11:00");
    expect(data.returnPlaceText).toBe("Там же");
    expect(data.bookingRef).toBe("RES-12345");
  });

  it("no company falls back to the generic title; other return place is shown", () => {
    const data = toCarCardData(
      makeCar({ company: null, returnSamePlace: false, returnPlace: "Porto" }),
      tOf("ru"),
      "ru",
    );
    expect(data.title).toBe("Аренда авто");
    expect(data.returnPlaceText).toBe("Porto");
  });

  it("never carries address, phone, insurance, payment or notes (AC-42)", () => {
    const json = JSON.stringify(toCarCardData(makeCar(), tOf("en"), "en"));
    expect(json).not.toContain("Secret Street");
    expect(json).not.toContain("+351");
    expect(json).not.toContain("secret note");
  });
});

describe("CarBlock", () => {
  it("renders cards in the given order, reports the id, hides private data", async () => {
    const a = makeCar({ id: "a", company: "Alpha" });
    const b = makeCar({ id: "b", company: "Beta" });
    const onCarPress = jest.fn();
    await renderWithProviders(<CarBlock cars={[b, a]} locale="en" onCarPress={onCarPress} testID="cb" />);
    const names = screen.getAllByText(/^(Alpha|Beta)$/).map((node) => node.props.children);
    expect(names).toEqual(["Beta", "Alpha"]);
    expect(screen.queryByText(/Secret Street/)).toBeNull();
    fireEvent.press(screen.getByTestId("cb-car-a"));
    expect(onCarPress).toHaveBeenCalledWith("a");
  });
});
