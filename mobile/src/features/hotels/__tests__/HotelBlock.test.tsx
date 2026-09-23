import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { makeHotel } from "../hooks/__tests__/testKit";
import { HotelBlock } from "../components/HotelBlock";
import { toHotelCardData } from "../types";

describe("toHotelCardData", () => {
  it("formats times in the hotel's zone, not the device's", () => {
    // 14:00Z is 07:00 in Los Angeles, 23:00 in Tokyo: the text must follow hotel.timeZone.
    const tokyo = toHotelCardData(makeHotel({ timeZone: "Asia/Tokyo" }), "en");
    const la = toHotelCardData(makeHotel({ timeZone: "America/Los_Angeles" }), "en");
    expect(tokyo.checkInText).toContain("11:00");
    expect(la.checkInText).toContain("7:00");
    expect(tokyo.checkInText).not.toBe(la.checkInText);
  });

  it("breakfast chip: all, partial with days, none is null", () => {
    expect(toHotelCardData(makeHotel({ breakfast: "all" }), "en").breakfastChip).toEqual({ kind: "all" });
    expect(
      toHotelCardData(makeHotel({ breakfast: "partial", breakfastDays: 2 }), "en").breakfastChip,
    ).toEqual({ kind: "partial", days: 2 });
    expect(toHotelCardData(makeHotel({ breakfast: "none" }), "en").breakfastChip).toBeNull();
  });

  it("a11y label carries name and both times", () => {
    const data = toHotelCardData(makeHotel(), "en");
    expect(data.a11yLabel).toContain("Casa Alfama");
    expect(data.a11yLabel).toContain(data.checkInText);
    expect(data.a11yLabel).toContain(data.checkOutText);
  });
});

describe("HotelBlock", () => {
  it("renders cards by check-in ascending and reports the id on tap", async () => {
    const late = makeHotel({ id: "late", name: "Late", checkInAt: new Date("2026-07-01T14:00:00Z") });
    const early = makeHotel({ id: "early", name: "Early", checkInAt: new Date("2026-06-01T14:00:00Z") });
    const onHotelPress = jest.fn();
    await renderWithProviders(
      <HotelBlock hotels={[late, early]} locale="en" onHotelPress={onHotelPress} testID="hb" />,
    );
    const names = screen.getAllByText(/^(Early|Late)$/).map((node) => node.props.children);
    expect(names).toEqual(["Early", "Late"]);
    fireEvent.press(screen.getByTestId("hb-hotel-late"));
    expect(onHotelPress).toHaveBeenCalledWith("late");
  });

  it("equal check-ins are ordered by id", async () => {
    const a = makeHotel({ id: "a", name: "A-hotel" });
    const b = makeHotel({ id: "b", name: "B-hotel" });
    await renderWithProviders(<HotelBlock hotels={[b, a]} locale="en" onHotelPress={jest.fn()} />);
    const names = screen.getAllByText(/-hotel$/).map((node) => node.props.children);
    expect(names).toEqual(["A-hotel", "B-hotel"]);
  });

  it("card: breakfast chip for all / partial, none for 'none'; no address, notes, ref or cost", async () => {
    const hotels = [
      makeHotel({ id: "h1", name: "All", breakfast: "all" }),
      makeHotel({ id: "h2", name: "Part", breakfast: "partial", breakfastDays: 2 }),
      makeHotel({
        id: "h3",
        name: "None",
        breakfast: "none",
        address: "Secret Street 1",
        notes: "secret note",
        bookingRef: "REF123",
        cost: { amount: "99.00", currency: "EUR" },
      }),
    ];
    await renderWithProviders(<HotelBlock hotels={hotels} locale="en" onHotelPress={jest.fn()} />);
    expect(screen.getByText("Breakfast: every day")).toBeTruthy();
    expect(screen.getByText("Breakfast: some days, 2 days")).toBeTruthy();
    expect(screen.getAllByText(/^Breakfast/)).toHaveLength(2);
    expect(screen.queryByText(/Secret Street|secret note|REF123|99/)).toBeNull();
  });
});
