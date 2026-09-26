import { act, screen, userEvent, waitFor, within } from "@testing-library/react-native";
import type { Trip } from "@tripplanner/shared";
import { AccessibilityInfo, StyleSheet } from "react-native";

import { TripsScreen } from "@/features/trips";
import { listTrips } from "@/features/trips/api";
import { makeTrip } from "@/features/trips/hooks/__tests__/testKit";
import { coverColors, coverMuteSaturation, darkTokens, layout } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";
import type { RenderWithProvidersOptions } from "@/test-utils/renderWithProviders";

import { HistoryScreen } from "../HistoryScreen";

jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/features/trips/api", () => ({
  ...jest.requireActual("@/features/trips/api"),
  listTrips: jest.fn(),
}));

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));

const listTripsMock = listTrips as jest.Mock;

// Today is 2026-09-21 (the render helper's default).
const rome = makeTrip({ id: "rome", destination: "Rome", startDate: "2026-08-01", endDate: "2026-08-05" });
const prague = makeTrip({ id: "prague", destination: "Prague", startDate: "2026-09-01", endDate: "2026-09-04" });
const cancelled = makeTrip({
  id: "cancelled",
  destination: "Vienna",
  startDate: "2026-11-05",
  endDate: "2026-11-08",
  archivedAt: "2026-09-10T10:00:00.000Z",
});
const soon = makeTrip({ id: "soon", destination: "Lisbon", startDate: "2026-09-25", endDate: "2026-10-01" });
const undated = makeTrip({ id: "undated", destination: "Tokyo" });
const MIXED = [rome, soon, cancelled, undated, prague];

const SIGNED_IN: RenderWithProvidersOptions = { session: { user: {} } };
// See TripsScreen.test: let the list's own batching timer run inside `act`.
const LIST_BATCH_MS = 60;

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, LIST_BATCH_MS));
  });
}

async function renderHistory(data: readonly Trip[], options: RenderWithProvidersOptions = SIGNED_IN) {
  listTripsMock.mockResolvedValue({ ok: true, data });
  const result = await renderWithProviders(<HistoryScreen />, options);
  await waitFor(() => expect(result.queryClient.isFetching()).toBe(0));
  await settle();
  return result;
}

const cardIds = () => screen.getAllByTestId(/^trip-card-[^-]+$/).map((node) => node.props.testID as string);

beforeEach(() => {
  jest.clearAllMocks();
  listTripsMock.mockReset();
});

describe("HistoryScreen (S5) — list", () => {
  it("shows completed AND archived trips, freshest first, and nothing active (AC-36)", async () => {
    await renderHistory(MIXED);
    await screen.findByTestId("trip-card-rome");
    // The archived trip ended latest (Nov 8), then Prague (Sep 4), then Rome (Aug 5).
    expect(cardIds()).toEqual(["trip-card-cancelled", "trip-card-prague", "trip-card-rome"]);
    expect(screen.queryByTestId("trip-card-soon")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("trip-card-undated")).not.toBeOnTheScreen();
    expect(listTripsMock).toHaveBeenCalledTimes(1);
  });

  it("has no floating create button (AC-36)", async () => {
    await renderHistory(MIXED);
    await screen.findByTestId("trip-card-rome");
    expect(screen.queryByTestId("trips-add")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "New trip" })).not.toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "History" })).toBeOnTheScreen();
  });

  it("marks an archived trip 'archived' — not 'completed' — on a divider chip with secondary text (AC-37)", async () => {
    await renderHistory(MIXED);
    await screen.findByTestId("trip-card-rome");
    const archivedCard = screen.getByTestId("trip-card-cancelled");
    expect(within(archivedCard).getByText("archived")).toBeOnTheScreen();
    expect(within(archivedCard).queryByText("completed")).not.toBeOnTheScreen();
    expect(screen.getByTestId("trip-card-cancelled-status")).toHaveStyle({ backgroundColor: darkTokens.divider });
    expect(within(archivedCard).getByText("archived")).toHaveStyle({ color: darkTokens.textSecondary });

    const doneCard = screen.getByTestId("trip-card-rome");
    expect(within(doneCard).getByText("completed")).toBeOnTheScreen();
    expect(screen.getByTestId("trip-card-rome-status")).toHaveStyle({ backgroundColor: darkTokens.divider });
  });

  it("localizes the chips to Russian", async () => {
    await renderHistory(MIXED, { ...SIGNED_IN, locale: "ru" });
    await screen.findByTestId("trip-card-rome");
    expect(screen.getByRole("header", { name: "История" })).toBeOnTheScreen();
    expect(screen.getByText("архив")).toBeOnTheScreen();
    expect(screen.getAllByText("завершено")).toHaveLength(2);
  });

  it("mutes only the cover backing, never the card, the panel or the chip (N-2, Q-D)", async () => {
    await renderHistory([rome]);
    const card = await screen.findByTestId("trip-card-rome");
    // No opacity anywhere on the path: the card is drawn at full strength.
    expect(StyleSheet.flatten(card.props.style).opacity).toBe(1);
    const backing = within(card).getByTestId("trip-cover-backing");
    const style = StyleSheet.flatten(backing.props.style);
    expect(style.opacity).toBeUndefined();
    // Desaturated: a different colour than the palette entry, and less saturated.
    expect(coverColors).not.toContain(style.backgroundColor);
    const spreadOf = (hex: string) => {
      const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
      return Math.max(...channels) - Math.min(...channels);
    };
    // Same hue, less chroma: the muted backing is closer to grey than the palette entry it came from.
    expect(style.backgroundColor).toMatch(/^#[0-9a-f]{6}$/);
    const lessChroma = coverColors.filter((hex) => spreadOf(String(style.backgroundColor)) < spreadOf(hex));
    expect(lessChroma.length).toBeGreaterThan(0);
    expect(coverMuteSaturation).toBeLessThan(1);
    // The date text keeps its own colour token — nothing dims it.
    expect(within(card).getByText(/^Aug 1/)).toHaveStyle({ color: darkTokens.textSecondary });
  });

  it("the same trip on S4 keeps the palette colour, un-muted", async () => {
    listTripsMock.mockResolvedValue({ ok: true, data: [soon] });
    await renderWithProviders(<TripsScreen />, SIGNED_IN);
    const card = await screen.findByTestId("trip-card-soon");
    const color = StyleSheet.flatten(within(card).getByTestId("trip-cover-backing").props.style).backgroundColor;
    expect(coverColors).toContain(color);
    await settle();
  });
});

describe("HistoryScreen (S5) — states", () => {
  it("shows skeletons while loading and no spinner-only screen (AC-39)", async () => {
    listTripsMock.mockReturnValue(new Promise(() => undefined));
    await renderWithProviders(<HistoryScreen />, SIGNED_IN);
    await settle();
    const skeletons = await screen.findAllByTestId("history-skeleton", { includeHiddenElements: true });
    expect(skeletons.length).toBeGreaterThan(0);
    for (const skeleton of skeletons) {
      expect(StyleSheet.flatten(skeleton.props.style).minHeight).toBe(layout.coverHeight);
    }
    expect(screen.getByLabelText("Loading history")).toBeOnTheScreen();
  });

  it("the empty history is ONE short line and no create button (AC-40)", async () => {
    await renderHistory([soon, undated]);
    const empty = await screen.findByTestId("history-empty");
    expect(within(empty).getByText("No past trips yet")).toBeOnTheScreen();
    expect(within(empty).queryByRole("button")).not.toBeOnTheScreen();
    // No buttons at all: no avatar, no create.
    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
    expect(screen.queryByTestId("trips-empty")).not.toBeOnTheScreen();
  });

  it("the two empty states are independent: S4 empty with a full history, and the reverse (AC-40)", async () => {
    await renderHistory([rome]);
    await screen.findByTestId("trip-card-rome");
    expect(screen.queryByTestId("history-empty")).not.toBeOnTheScreen();
    screen.unmount();

    listTripsMock.mockResolvedValue({ ok: true, data: [rome] });
    await renderWithProviders(<TripsScreen />, SIGNED_IN);
    expect(await screen.findByTestId("trips-empty")).toBeOnTheScreen();
    expect(screen.queryByTestId("history-empty")).not.toBeOnTheScreen();
  });

  it("a failed load shows the message and 'Retry', never the empty line; Retry calls the api again (AC-41)", async () => {
    const user = userEvent.setup();
    listTripsMock.mockResolvedValueOnce({ ok: false, kind: "unknown" });
    await renderWithProviders(<HistoryScreen />, SIGNED_IN);
    await settle();
    const error = await screen.findByTestId("history-error");
    expect(within(error).getByText("Could not load your history")).toBeOnTheScreen();
    expect(within(error).getByText("Something went wrong. Try again")).toBeOnTheScreen();
    expect(screen.queryByTestId("history-empty")).not.toBeOnTheScreen();
    expect(screen.queryByText("No past trips yet")).not.toBeOnTheScreen();

    listTripsMock.mockResolvedValueOnce({ ok: true, data: [rome] });
    await user.press(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByTestId("trip-card-rome")).toBeOnTheScreen();
    expect(listTripsMock).toHaveBeenCalledTimes(2);
    await settle();
  });
});

describe("HistoryScreen (S5) — announcements (AC-71)", () => {
  let announce: jest.SpyInstance;
  beforeEach(() => {
    announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => undefined);
  });
  afterEach(() => announce.mockRestore());

  it("announces the loaded history with its count", async () => {
    await renderHistory(MIXED);
    await screen.findByTestId("trip-card-rome");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("History loaded: 3 trips");
  });

  it("announces the empty history", async () => {
    await renderHistory([]);
    await screen.findByTestId("history-empty");
    expect(announce).toHaveBeenCalledWith("Your history is empty");
  });

  it("announces a failed load", async () => {
    listTripsMock.mockResolvedValue({ ok: false, kind: "offline" });
    await renderWithProviders(<HistoryScreen />, SIGNED_IN);
    await settle();
    await screen.findByTestId("history-error");
    await waitFor(() => expect(announce).toHaveBeenCalledWith("Could not load your history"));
  });
});

describe("HistoryScreen (S5) — interaction", () => {
  it("opens the trip details with an OBJECT href, the id as a raw param (N-3, AC-76)", async () => {
    const user = userEvent.setup();
    const hostile = makeTrip({ id: "../../etc", destination: "Evil", startDate: "2026-08-01", endDate: "2026-08-02" });
    await renderHistory([rome, hostile]);
    await user.press(await screen.findByTestId("trip-card-rome"));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: "/trips/[tripId]", params: { tripId: "rome" } });
    await user.press(screen.getByTestId("trip-card-../../etc"));
    expect(mockRouter.push).toHaveBeenLastCalledWith({
      pathname: "/trips/[tripId]",
      params: { tripId: "../../etc" },
    });
  });

  it("gives every card a non-empty accessibility label (AC-19, AC-70)", async () => {
    await renderHistory(MIXED);
    await screen.findByTestId("trip-card-rome");
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(String(button.props.accessibilityLabel ?? "").length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("button", { name: /^Rome, completed, /u })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: /^Vienna, archived, /u })).toBeOnTheScreen();
  });

  it("has no profile avatar", async () => {
    await renderHistory([rome]);
    await screen.findByTestId("trip-card-rome");
    expect(screen.queryByTestId("history-avatar")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Open profile" })).not.toBeOnTheScreen();
  });
});
