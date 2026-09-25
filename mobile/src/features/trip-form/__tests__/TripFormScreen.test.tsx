import { act, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";
import { AccessibilityInfo, Alert, StyleSheet } from "react-native";

import { darkTokens, family, layout } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { createTrip, getTrip, updateTrip } from "@/features/trips/api";
import { TripFormScreen } from "../TripFormScreen";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/trips/api", () => ({
  ...jest.requireActual("@/features/trips/api"),
  createTrip: jest.fn(),
  updateTrip: jest.fn(),
  getTrip: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

const createMock = createTrip as jest.Mock;
const updateMock = updateTrip as jest.Mock;
const getTripMock = getTrip as jest.Mock;

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    destination: "Porto",
    place: { kind: "custom" },
    title: null,
    startDate: null,
    endDate: null,
    archivedAt: null,
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

const LISBON: Partial<Trip> = {
  destination: "Lisbon",
  place: {
    kind: "city",
    placeId: "city-lisbon",
    countryCode: "PT",
    timeZone: "Europe/Lisbon",
    airportCode: "LIS",
  },
};

const SIGNED_IN = { session: { user: {} } } as const;

interface Harness {
  name: "create" | "edit";
  submitName: string;
  /** The api function the mode writes with. */
  write: jest.Mock;
  /** The trip form value the mode's api call received. */
  sentForm: () => unknown;
  render: (initialTrip?: Trip) => Promise<void>;
}

const CREATE: Harness = {
  name: "create",
  submitName: "Create trip",
  write: createMock,
  sentForm: () => createMock.mock.calls[0]?.[0],
  render: async () => {
    await renderWithProviders(<TripFormScreen mode="create" />, SIGNED_IN);
  },
};

const EDIT: Harness = {
  name: "edit",
  submitName: "Save",
  write: updateMock,
  sentForm: () => updateMock.mock.calls[0]?.[1],
  render: async (initialTrip = makeTrip()) => {
    getTripMock.mockResolvedValue({ ok: true, data: initialTrip });
    await renderWithProviders(<TripFormScreen mode="edit" tripId={initialTrip.id} />, SIGNED_IN);
    await screen.findByTestId("trip-form-destination");
  },
};

const HARNESSES: Harness[] = [CREATE, EDIT];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const destinationInput = () => screen.getByLabelText("Where to");
const submitButton = (name: string) => screen.getByRole("button", { name });

beforeEach(() => {
  jest.clearAllMocks();
  for (const mock of [createMock, updateMock, getTripMock]) mock.mockReset();
  createMock.mockResolvedValue({ ok: true, data: makeTrip({ id: "new-1" }) });
  updateMock.mockResolvedValue({ ok: true, data: makeTrip() });
});

describe.each(HARNESSES)("trip form — shared rules ($name mode, AC-49)", (harness) => {
  const type = async (text: string) => {
    await userEvent.clear(destinationInput());
    await userEvent.type(destinationInput(), text);
  };
  // An edited trip without dates opens with "No dates yet" set; reveal the pickers first.
  const showDates = async () => {
    const checkbox = screen.getByRole("checkbox", { name: "No dates yet" });
    if (checkbox.props.accessibilityState?.checked === true) await userEvent.press(checkbox);
  };

  const pickRange = async (start: string, end: string) => {
    await userEvent.press(screen.getByTestId("trip-form-dates-field"));
    await userEvent.press(screen.getByTestId(`trip-form-calendar-day-${start}`));
    await userEvent.press(screen.getByTestId(`trip-form-calendar-day-${end}`));
  };

  it("has the mode's title and button, Cancel and no Done (AC-33)", async () => {
    await harness.render();
    expect(screen.getByRole("header", { name: harness.name === "create" ? "New trip" : "Edit trip" })).toBeOnTheScreen();
    expect(submitButton(harness.submitName)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Done" })).not.toBeOnTheScreen();
  });

  it("Cancel closes without saving and without a dialog (AC-33)", async () => {
    const alert = jest.spyOn(Alert, "alert");
    await harness.render();
    await type("Rome");
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(harness.write).not.toHaveBeenCalled();
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it("draws the button inactive with divider background and tertiary text, no opacity (AC-29)", async () => {
    await harness.render();
    await type("   ");
    const button = submitButton(harness.submitName);
    expect(button).toBeDisabled();
    const style = StyleSheet.flatten(button.props.style);
    expect(style.backgroundColor).toBe(darkTokens.divider);
    expect(style.opacity).toBeUndefined();
    expect(StyleSheet.flatten(within(button).getByText(harness.submitName).props.style).color).toBe(
      darkTokens.textTertiary,
    );
    await userEvent.press(button);
    expect(harness.write).not.toHaveBeenCalled();
  });

  it("activates the button once a place is typed", async () => {
    await harness.render();
    await type("Rome");
    expect(submitButton(harness.submitName)).toBeEnabled();
  });

  it('typing "1" shows the nothing-found row and keeps the button active (AC-14)', async () => {
    await harness.render();
    await type("1");
    expect(screen.getByText("Nothing found — we'll keep it as typed, that works too")).toBeOnTheScreen();
    expect(screen.queryByTestId(/^place-suggestion-/)).not.toBeOnTheScreen();
    expect(submitButton(harness.submitName)).toBeEnabled();
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.write).toHaveBeenCalledTimes(1);
    expect(harness.sentForm()).toMatchObject({ destination: "1", place: { kind: "custom" } });
  });

  it("saves free text as a custom place with no directory fields and no invented title (AC-15, AC-31)", async () => {
    await harness.render();
    await type("  Some   place ");
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.sentForm()).toEqual({
      destination: "Some place",
      place: { kind: "custom" },
      title: null,
      startDate: null,
      endDate: null,
    });
  });

  it("picking a suggestion stores the directory fields (AC-15)", async () => {
    await harness.render();
    await type("Lis");
    await userEvent.press(screen.getByTestId("place-suggestion-city-lisbon"));
    expect(destinationInput().props.value).toBe("Lisbon");
    expect(screen.queryByTestId("trip-form-suggestions")).not.toBeOnTheScreen();
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.sentForm()).toMatchObject({
      destination: "Lisbon",
      place: {
        kind: "city",
        placeId: "city-lisbon",
        countryCode: "PT",
        timeZone: "Europe/Lisbon",
        airportCode: "LIS",
      },
    });
  });

  it("typing after a pick resets to custom and clears the accent border (AC-51)", async () => {
    await harness.render();
    await type("Lis");
    await userEvent.press(screen.getByTestId("place-suggestion-city-lisbon"));
    expect(StyleSheet.flatten(screen.getByTestId("trip-form-destination-frame").props.style).borderColor).toBe(
      darkTokens.accent,
    );
    await userEvent.type(destinationInput(), "x");
    expect(StyleSheet.flatten(screen.getByTestId("trip-form-destination-frame").props.style).borderColor).toBe(
      darkTokens.surfaceBorder,
    );
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.sentForm()).toMatchObject({ destination: "Lisbonx", place: { kind: "custom" } });
  });

  it("switching from a directory place to free text and back leaves no stale fields (AC-51)", async () => {
    await harness.render(makeTrip(LISBON));
    // The prefilled place is a directory pick; editing the text drops it...
    await userEvent.type(destinationInput(), "!");
    // ...and picking again writes the new place's fields, not the old ones.
    await type("Porto");
    await userEvent.press(screen.getByTestId("place-suggestion-city-porto"));
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.sentForm()).toMatchObject({
      destination: "Porto",
      place: { kind: "city", placeId: "city-porto", airportCode: "OPO" },
    });
  });

  it("keeps text that equals a directory entry as free text when no suggestion is tapped", async () => {
    await harness.render();
    await type("Lisbon");
    expect(screen.getByTestId("place-suggestion-city-lisbon")).toBeOnTheScreen();
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.sentForm()).toMatchObject({ destination: "Lisbon", place: { kind: "custom" } });
  });

  it("clears the field with the x button and keeps the button state in step", async () => {
    await harness.render();
    await type("Rome");
    await userEvent.press(screen.getByRole("button", { name: "Clear place" }));
    expect(destinationInput().props.value).toBe("");
    expect(screen.queryByRole("button", { name: "Clear place" })).not.toBeOnTheScreen();
    expect(submitButton(harness.submitName)).toBeDisabled();
  });

  it("hides the dates field with the checkbox and sends no dates (AC-21)", async () => {
    await harness.render();
    await type("Rome");
    await showDates();
    await pickRange("2026-09-21", "2026-09-25");
    await userEvent.press(screen.getByRole("checkbox", { name: "No dates yet" }));
    expect(screen.queryByTestId("trip-form-dates-field")).not.toBeOnTheScreen();
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.sentForm()).toMatchObject({ startDate: null, endDate: null });
  });

  it("sends both dates when both are chosen", async () => {
    await harness.render();
    await type("Rome");
    await showDates();
    await pickRange("2026-09-21", "2026-09-25");
    await userEvent.press(submitButton(harness.submitName));
    expect(harness.sentForm()).toMatchObject({ startDate: "2026-09-21", endDate: "2026-09-25" });
  });

  it("tapping only the first day sets nothing: no default date appears in the field", async () => {
    await harness.render();
    await type("Rome");
    await showDates();
    await userEvent.press(screen.getByTestId("trip-form-dates-field"));
    await userEvent.press(screen.getByTestId("trip-form-calendar-day-2026-09-21"));
    expect(screen.getByText("Choose dates")).toBeOnTheScreen();
  });

  it("a name longer than 80 characters is reported at the title field and nothing is sent (AC-26)", async () => {
    await harness.render();
    await type("Rome");
    await userEvent.type(screen.getByLabelText("Trip name"), "a".repeat(81));
    await userEvent.press(submitButton(harness.submitName));
    expect(screen.getByText("The name can't be longer than 80 characters")).toBeOnTheScreen();
    expect(harness.write).not.toHaveBeenCalled();
  });

  it("a double or triple tap sends exactly one request and blocks the button (AC-32)", async () => {
    const pending = deferred<unknown>();
    harness.write.mockReturnValue(pending.promise);
    await harness.render();
    await type("Rome");
    const button = submitButton(harness.submitName);
    await userEvent.press(button);
    await userEvent.press(button);
    await userEvent.press(button);
    expect(harness.write).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Saving the trip" })).toBeDisabled();
    expect(screen.getByTestId("trip-form-submit-spinner")).toBeOnTheScreen();
    await act(async () => {
      pending.resolve({ ok: true, data: makeTrip({ id: "new-1" }) });
    });
    await waitFor(() => expect(mockRouter.replace.mock.calls.length + mockRouter.back.mock.calls.length).toBe(1));
    expect(harness.write).toHaveBeenCalledTimes(1);
  });

  it.each(["offline", "timeout", "denied", "unknown"] as const)(
    "a %s failure shows a message in the sheet, keeps every value and retries with one tap (AC-57, AC-58)",
    async (kind) => {
      const alert = jest.spyOn(Alert, "alert");
      const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
      harness.write.mockResolvedValueOnce({ ok: false, kind });
      await harness.render();
      await type("Rome");
      await userEvent.type(screen.getByLabelText("Trip name"), "Summer");
      await showDates();
      await pickRange("2026-09-21", "2026-09-25");
      await userEvent.press(submitButton(harness.submitName));

      const messages = {
        offline: "No connection. Check your internet and try again",
        timeout: "The server is taking too long. Try again",
        denied: "You don't have access to this trip",
        unknown: "Something went wrong. Try again",
      };
      expect(within(screen.getByTestId("trip-form-error")).getByText(messages[kind])).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledWith(messages[kind]);
      expect(alert).not.toHaveBeenCalled();
      // Nothing closed, nothing lost.
      expect(mockRouter.replace).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
      expect(destinationInput().props.value).toBe("Rome");
      expect(screen.getByLabelText("Trip name").props.value).toBe("Summer");
      expect(screen.getByLabelText(/^Dates: /)).toBeOnTheScreen();
      expect(submitButton(harness.submitName)).toBeEnabled();

      // One tap retries.
      await userEvent.press(submitButton(harness.submitName));
      expect(harness.write).toHaveBeenCalledTimes(2);
      await waitFor(() => expect(screen.queryByTestId("trip-form-error")).not.toBeOnTheScreen());
      alert.mockRestore();
      announce.mockRestore();
    },
  );

  it("a rejected request of an unknown shape shows the generic message, never its text", async () => {
    harness.write.mockRejectedValueOnce(new Error("secret server text"));
    await harness.render();
    await type("Rome");
    await userEvent.press(submitButton(harness.submitName));
    expect(await screen.findByText("Something went wrong. Try again")).toBeOnTheScreen();
    expect(screen.queryByText(/secret server text/)).not.toBeOnTheScreen();
  });

  it("gives every interactive element a non-empty name, a role and a 44pt target (AC-70)", async () => {
    await harness.render();
    await type("Lis");
    await showDates();
    const controls = [
      screen.getByRole("button", { name: "Cancel" }),
      screen.getByRole("button", { name: /^Lisbon, city, City · Portugal$/ }),
      screen.getByRole("button", { name: "Clear place" }),
      screen.getByTestId("trip-form-dates-field"),
      screen.getByRole("checkbox", { name: "No dates yet" }),
      submitButton(harness.submitName),
    ];
    for (const control of controls) {
      const style = StyleSheet.flatten(
        typeof control.props.style === "function" ? control.props.style({ pressed: false }) : control.props.style,
      );
      expect(style.minHeight ?? style.height ?? 0).toBeGreaterThanOrEqual(layout.minTouch);
      expect(style.minWidth ?? style.width ?? 0).toBeGreaterThanOrEqual(layout.minTouch);
    }
  });
});

describe("create mode", () => {
  it("puts focus in the destination field on open (AC-28)", async () => {
    await CREATE.render();
    expect(destinationInput().props.autoFocus).toBe(true);
  });

  it("replaces the sheet with the details of the created trip, not push (AC-30)", async () => {
    await CREATE.render();
    await userEvent.type(destinationInput(), "Rome");
    await userEvent.press(submitButton("Create trip"));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledTimes(1));
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: "/trips/[tripId]",
      params: { tripId: "new-1" },
    });
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  it("starts empty with the button inactive and the dates field shown", async () => {
    await CREATE.render();
    expect(destinationInput().props.value).toBe("");
    expect(submitButton("Create trip")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Choose dates" })).toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "No dates yet" })).not.toBeChecked();
  });

  it("draws a suggestion row per the typography rules: name not mono, detail tertiary, airport code mono, cities only (AC-34)", async () => {
    await CREATE.render();
    await userEvent.type(destinationInput(), "Por");
    const city = "place-suggestion-city-porto";
    const country = "place-suggestion-country-pt";
    const nameStyle = (id: string) => StyleSheet.flatten(screen.getByTestId(`${id}-name`).props.style);
    const detailStyle = (id: string) => StyleSheet.flatten(screen.getByTestId(`${id}-detail`).props.style);

    expect(nameStyle(city).fontFamily).toBe(family.medium);
    expect(nameStyle(country).fontFamily).toBe(family.medium);
    expect(within(screen.getByTestId(city)).getByText("City · Portugal")).toBeOnTheScreen();
    expect(within(screen.getByTestId(country)).getByText("Country · Europe")).toBeOnTheScreen();
    expect(detailStyle(city).color).toBe(darkTokens.textTertiary);
    expect(detailStyle(country).color).toBe(darkTokens.textTertiary);
    expect(StyleSheet.flatten(screen.getByTestId(`${city}-code`).props.style).fontFamily).toBe(family.mono);
    expect(within(screen.getByTestId(city)).getByText("OPO")).toBeOnTheScreen();
    expect(screen.queryByTestId(`${country}-code`)).not.toBeOnTheScreen();
  });

  it("offers at most four suggestions", async () => {
    await CREATE.render();
    await userEvent.type(destinationInput(), "s");
    const rows = screen.getAllByRole("button", { name: /, (city|country), / });
    expect(rows).toHaveLength(4);
  });

  it("names the suggestion's country and region in the Russian locale", async () => {
    await renderWithProviders(<TripFormScreen mode="create" />, { ...SIGNED_IN, locale: "ru" });
    await userEvent.type(screen.getByTestId("trip-form-destination"), "Лис");
    expect(screen.getByTestId("place-suggestion-city-lisbon-name").props.children).toBe("Лиссабон");
    expect(screen.getByTestId("place-suggestion-city-lisbon-detail").props.children).toBe("Город · Португалия");
  });

  it("stores the name in the current language when a suggestion is picked in Russian", async () => {
    await renderWithProviders(<TripFormScreen mode="create" />, { ...SIGNED_IN, locale: "ru" });
    await userEvent.type(screen.getByTestId("trip-form-destination"), "Лис");
    await userEvent.press(screen.getByTestId("place-suggestion-city-lisbon"));
    expect(screen.getByTestId("trip-form-destination").props.value).toBe("Лиссабон");
    await userEvent.press(screen.getByTestId("trip-form-submit"));
    expect(createMock.mock.calls[0]?.[0]).toMatchObject({
      destination: "Лиссабон",
      place: { kind: "city", placeId: "city-lisbon" },
    });
  });
});

describe("edit mode", () => {
  const edit = EDIT;

  it("does not autofocus the field or open suggestions for the prefilled value", async () => {
    await edit.render(makeTrip({ destination: "Porto" }));
    expect(destinationInput().props.autoFocus).toBe(false);
    expect(screen.queryByTestId("trip-form-suggestions")).not.toBeOnTheScreen();
  });

  it("prefills a free-text place with dates", async () => {
    await edit.render(
      makeTrip({ destination: "Somewhere", title: "Trip", startDate: "2026-10-05", endDate: "2026-10-09" }),
    );
    expect(destinationInput().props.value).toBe("Somewhere");
    expect(screen.getByLabelText("Trip name").props.value).toBe("Trip");
    expect(screen.getByRole("checkbox", { name: "No dates yet" })).not.toBeChecked();
    expect(screen.getByLabelText(/^Dates: /)).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId("trip-form-destination-frame").props.style).borderColor).toBe(
      darkTokens.surfaceBorder,
    );
  });

  it("prefills a directory place without dates: accent border, checkbox set, pickers hidden", async () => {
    await edit.render(makeTrip(LISBON));
    expect(destinationInput().props.value).toBe("Lisbon");
    expect(StyleSheet.flatten(screen.getByTestId("trip-form-destination-frame").props.style).borderColor).toBe(
      darkTokens.accent,
    );
    expect(screen.getByRole("checkbox", { name: "No dates yet" })).toBeChecked();
    expect(screen.queryByTestId("trip-form-dates-field")).not.toBeOnTheScreen();
  });

  it("prefills a directory place with dates", async () => {
    await edit.render(makeTrip({ ...LISBON, startDate: "2026-10-05", endDate: "2026-10-09" }));
    expect(screen.getByRole("checkbox", { name: "No dates yet" })).not.toBeChecked();
    expect(screen.getByLabelText(/^Dates: /)).toBeOnTheScreen();
  });

  it("prefills a free-text place with the checkbox set", async () => {
    await edit.render(makeTrip({ destination: "Somewhere" }));
    expect(destinationInput().props.value).toBe("Somewhere");
    expect(screen.getByRole("checkbox", { name: "No dates yet" })).toBeChecked();
  });

  it("shows a directory place as the user saved it, not translated", async () => {
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip({ ...LISBON, destination: "Lisbon" }) });
    await renderWithProviders(<TripFormScreen mode="edit" tripId="trip-1" />, { ...SIGNED_IN, locale: "ru" });
    const input = await screen.findByTestId("trip-form-destination");
    expect(input.props.value).toBe("Lisbon");
  });

  it("treats a place id the directory does not know as free text", async () => {
    await edit.render(
      makeTrip({
        destination: "Old name",
        place: { kind: "city", placeId: "city-gone", countryCode: "PT", timeZone: "Europe/Lisbon", airportCode: null },
      }),
    );
    expect(StyleSheet.flatten(screen.getByTestId("trip-form-destination-frame").props.style).borderColor).toBe(
      darkTokens.surfaceBorder,
    );
    await userEvent.press(submitButton("Save"));
    expect(updateMock.mock.calls[0]?.[1]).toMatchObject({ destination: "Old name", place: { kind: "custom" } });
  });

  it("saves the changes for the trip's id and returns to the details (AC-50)", async () => {
    await edit.render(makeTrip({ id: "trip-7", destination: "Rome" }));
    await userEvent.type(destinationInput(), "!");
    await userEvent.press(submitButton("Save"));
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(updateMock.mock.calls[0]?.[0]).toBe("trip-7");
    expect(updateMock.mock.calls[0]?.[1]).toMatchObject({ destination: "Rome!" });
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("reports a stored end-before-start pair at the dates block and sends nothing (AC-18)", async () => {
    // Stored trips are valid; this pair only exists to prove edit uses the same schema.
    await edit.render(makeTrip({ startDate: "2026-10-10", endDate: "2026-10-05" }));
    await userEvent.press(submitButton("Save"));
    expect(screen.getByText("The end date is before the start date")).toBeOnTheScreen();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("reports a span over 365 days at the dates block and sends nothing (AC-19)", async () => {
    await edit.render(makeTrip({ startDate: "2026-01-01", endDate: "2027-06-01" }));
    await userEvent.press(submitButton("Save"));
    expect(screen.getByText("A trip can't be longer than 365 days")).toBeOnTheScreen();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("shows a loading state until the trip arrives, with Cancel available", async () => {
    const pending = deferred<unknown>();
    getTripMock.mockReturnValue(pending.promise);
    await renderWithProviders(<TripFormScreen mode="edit" tripId="trip-1" />, SIGNED_IN);
    expect(screen.getByTestId("trip-form-loading")).toBeOnTheScreen();
    expect(screen.queryByTestId("trip-form-submit")).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Cancel" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ ok: true, data: makeTrip() });
    });
    expect(await screen.findByTestId("trip-form-submit")).toBeOnTheScreen();
  });

  it("shows the not-found state with a way back when the trip is gone (AC-56)", async () => {
    getTripMock.mockResolvedValue({ ok: false, kind: "notFound" });
    await renderWithProviders(<TripFormScreen mode="edit" tripId="gone" />, SIGNED_IN);
    expect(await screen.findByText("Trip not found")).toBeOnTheScreen();
    expect(screen.queryByTestId("trip-form-submit")).not.toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Back to trips" }));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it("shows a load error with Retry that reloads the trip", async () => {
    getTripMock.mockResolvedValueOnce({ ok: false, kind: "offline" });
    getTripMock.mockResolvedValue({ ok: true, data: makeTrip() });
    await renderWithProviders(<TripFormScreen mode="edit" tripId="trip-1" />, SIGNED_IN);
    expect(await screen.findByTestId("trip-form-load-error")).toBeOnTheScreen();
    await userEvent.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("trip-form-submit")).toBeOnTheScreen();
  });
});
