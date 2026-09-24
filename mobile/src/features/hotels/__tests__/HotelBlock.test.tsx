import { fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { makeHotel } from "../hooks/__tests__/testKit";
import { HotelBlock } from "../components/HotelBlock";
import { toHotelCardData } from "../types";

describe("toHotelCardData", () => {
  it("shows the calendar day and the wall-clock time as stored, whatever the hotel's zone", () => {
    const tokyo = toHotelCardData(makeHotel({ timeZone: "Asia/Tokyo" }), "en");
    const la = toHotelCardData(makeHotel({ timeZone: "America/Los_Angeles" }), "en");
    expect(tokyo.checkInText).toBe("Jun 15, 3:00 PM");
    expect(tokyo.checkOutText).toBe("Jun 18, 11:00 AM");
    expect(la.checkInText).toBe(tokyo.checkInText);
  });

  it("shows the time only when it is set, in the locale's format", () => {
    const noTimes = makeHotel({ checkInTime: null, checkOutTime: "10:30" });
    expect(toHotelCardData(noTimes, "en")).toMatchObject({ checkInText: "Jun 15", checkOutText: "Jun 18, 10:30 AM" });
    const ru = toHotelCardData(makeHotel({ checkInTime: null, checkOutTime: null }), "ru");
    expect(ru.checkInText).toBe("15 июн.");
    expect(ru.checkOutText).toBe("18 июн.");
    expect(toHotelCardData(makeHotel({ checkInTime: "15:00" }), "ru").checkInText).toBe("15 июн., 15:00");
  });

  it("breakfast chip: all, partial with days, none is null", () => {
    expect(toHotelCardData(makeHotel({ breakfast: "all" }), "en").breakfastChip).toEqual({ kind: "all" });
    expect(
      toHotelCardData(makeHotel({ breakfast: "partial", breakfastDays: 2 }), "en").breakfastChip,
    ).toEqual({ kind: "partial", days: 2 });
    expect(toHotelCardData(makeHotel({ breakfast: "none" }), "en").breakfastChip).toBeNull();
  });

  it("a11y label carries name and both dates (times when set)", () => {
    const data = toHotelCardData(makeHotel(), "en");
    expect(data.a11yLabel).toContain("Casa Alfama");
    expect(data.a11yLabel).toContain(data.checkInText);
    expect(data.a11yLabel).toContain(data.checkOutText);
  });
});

describe("HotelBlock", () => {
  it("renders cards by check-in ascending and reports the id on tap", async () => {
    const late = makeHotel({ id: "late", name: "Late", checkInDate: "2026-07-01" });
    const early = makeHotel({ id: "early", name: "Early", checkInDate: "2026-06-01" });
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
