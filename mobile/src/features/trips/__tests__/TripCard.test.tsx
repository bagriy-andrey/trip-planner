import { screen, userEvent } from "@testing-library/react-native";
import { coverIndexOf } from "@tripplanner/shared";
import { StyleSheet } from "react-native";

import { coverColors, darkTokens, lightTokens } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { TripCard } from "../components/TripCard";
import { desaturate } from "../components/TripCoverPlaceholder";
import { TripStatusPill } from "../components/TripStatusPill";
import { makeTrip } from "../hooks/__tests__/testKit";
import { toTripCardData } from "../types";
import type { TripCardData } from "../types";

const TODAY = "2026-09-21";
const CONTEXT = { today: TODAY, language: "en", upcomingId: null } as const;

const card: TripCardData = {
  id: "t1",
  placeName: "Lisbon",
  startDate: "2026-09-25",
  endDate: "2026-10-01",
  status: "planned",
  coverIndex: 2,
};

describe("toTripCardData", () => {
  it("maps every derived status, and the picked trip to 'upcoming'", () => {
    const planned = makeTrip({ id: "a", startDate: "2026-10-01", endDate: "2026-10-05" });
    const past = makeTrip({ id: "b", startDate: "2026-08-01", endDate: "2026-08-05" });
    const draft = makeTrip({ id: "c" });
    const archived = makeTrip({ id: "d", archivedAt: "2026-09-01T10:00:00.000Z", startDate: "2026-10-01", endDate: "2026-10-02" });
    expect(toTripCardData(planned, CONTEXT).status).toBe("planned");
    expect(toTripCardData(planned, { ...CONTEXT, upcomingId: "a" }).status).toBe("upcoming");
    expect(toTripCardData(past, CONTEXT).status).toBe("completed");
    expect(toTripCardData(draft, CONTEXT).status).toBe("draft");
    expect(toTripCardData(archived, { ...CONTEXT, upcomingId: "d" }).status).toBe("archived");
  });

  it("names the place in the UI language from the directory, or as stored (Q3)", () => {
    const place = { kind: "city", placeId: "city-lisbon", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: "LIS" } as const;
    const trip = makeTrip({ id: "x", destination: "Lisbon", place });
    expect(toTripCardData(trip, CONTEXT).placeName).toBe("Lisbon");
    expect(toTripCardData(trip, { ...CONTEXT, language: "ru" }).placeName).toBe("Лиссабон");
    expect(toTripCardData(makeTrip({ destination: "Somewhere" }), { ...CONTEXT, language: "ru" }).placeName).toBe(
      "Somewhere",
    );
  });

  it("derives the cover from the immutable id: renames and language changes keep it (AC-38)", () => {
    const trip = makeTrip({ id: "stable-id", destination: "Lisbon" });
    const before = toTripCardData(trip, CONTEXT).coverIndex;
    const edited = { ...trip, destination: "Porto", title: "Surf week", updatedAt: "2026-09-20T10:00:00.000Z" };
    expect(toTripCardData(edited, CONTEXT).coverIndex).toBe(before);
    expect(toTripCardData(edited, { ...CONTEXT, language: "ru" }).coverIndex).toBe(before);
    expect(before).toBe(coverIndexOf("stable-id", coverColors.length));
  });

  it("uses every colour of the palette across generated ids", () => {
    const used = new Set(
      Array.from({ length: 200 }, (_, index) => toTripCardData(makeTrip({ id: `id-${index}` }), CONTEXT).coverIndex),
    );
    expect(used.size).toBe(coverColors.length);
  });
});

describe("desaturate", () => {
  it("returns the colour at full saturation and grey at zero", () => {
    expect(desaturate("#33384F", 1)).toBe("rgb(51, 56, 79)");
    const grey = /rgb\((\d+), (\d+), (\d+)\)/.exec(desaturate("#8C4A34", 0));
    expect(grey?.[1]).toBe(grey?.[2]);
    expect(grey?.[2]).toBe(grey?.[3]);
  });

  it("leaves something that is not a hex colour alone", () => {
    expect(desaturate("rgba(0,0,0,0.5)", 0.5)).toBe("rgba(0,0,0,0.5)");
  });
});

describe("TripStatusPill", () => {
  it.each([
    ["upcoming", "2026-09-25", "in 4 days", "accent"],
    ["upcoming", "2026-09-21", "today", "accent"],
    ["planned", "2026-10-21", "in 30 days", "divider"],
    ["draft", null, "plan", "divider"],
    ["completed", "2026-08-01", "completed", "divider"],
    ["archived", "2026-11-01", "archived", "divider"],
  ] as const)("%s (start %s) reads '%s' on the %s background", async (status, startDate, label, background) => {
    await renderWithProviders(<TripStatusPill status={status} startDate={startDate} today={TODAY} testID="pill" />);
    expect(screen.getByText(label)).toBeOnTheScreen();
    expect(screen.getByTestId("pill")).toHaveStyle({ backgroundColor: darkTokens[background] });
  });

  it("draws the archived chip with textSecondary on divider in both themes (AC-37, AC-73)", async () => {
    await renderWithProviders(<TripStatusPill status="archived" startDate={null} today={TODAY} testID="pill" />, {
      themePreference: "light",
    });
    expect(screen.getByTestId("pill")).toHaveStyle({ backgroundColor: lightTokens.divider });
    expect(screen.getByText("archived")).toHaveStyle({ color: lightTokens.textSecondary });
  });

  it("reads 'archived' in Russian, different from 'completed'", async () => {
    await renderWithProviders(<TripStatusPill status="archived" startDate={null} today={TODAY} />, { locale: "ru" });
    expect(screen.getByText("архив")).toBeOnTheScreen();
    expect(screen.queryByText("завершено")).not.toBeOnTheScreen();
  });
});

describe("TripCard", () => {
  it("truncates a very long place name to one line without throwing", async () => {
    const long = { ...card, placeName: "Llanfairpwllgwyngyllgogerychwyrndrobwllllantysiliogogogoch and the surrounding Anglesey coast" };
    await renderWithProviders(<TripCard trip={long} locale="en" today={TODAY} onPress={jest.fn()} />);
    expect(screen.getByText(long.placeName).props.numberOfLines).toBe(1);
  });

  it("presses through to onPress", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await renderWithProviders(<TripCard trip={card} locale="en" today={TODAY} onPress={onPress} testID="c" />);
    await user.press(screen.getByTestId("c"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("paints the cover from coverColors[coverIndex] and un-muted unless asked", async () => {
    await renderWithProviders(<TripCard trip={card} locale="en" today={TODAY} onPress={jest.fn()} />);
    const backing = screen.getByTestId("trip-cover-backing");
    expect(StyleSheet.flatten(backing.props.style).backgroundColor).toBe(coverColors[2]);
  });
});
