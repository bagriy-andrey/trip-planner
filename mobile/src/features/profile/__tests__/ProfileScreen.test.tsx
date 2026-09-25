import { screen, userEvent, within } from "@testing-library/react-native";

import { EMPTY_PROFILE } from "@tripplanner/shared";
import type { Profile } from "@tripplanner/shared";

import { signOut } from "@/features/auth";
import { HistoryScreen } from "@/features/history";
import { TripsScreen } from "@/features/trips";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { getProfile } from "../api";
import { ProfileHeader } from "../components/ProfileHeader";
import { ProfileScreen } from "../ProfileScreen";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  navigate: jest.fn(),
  back: jest.fn(),
  dismissAll: jest.fn(),
};
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
// Only the public surface `ProfileScreen` uses; the real sign-out (and gating) is exercised in
// ProfileSignOut.test.tsx.
jest.mock("@/features/auth", () => ({ signOut: jest.fn() }));
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("../api", () => ({
  ...jest.requireActual("../api"),
  getProfile: jest.fn(),
  saveProfile: jest.fn(),
}));
const mockGetProfile = getProfile as jest.Mock;
const load = (over: Partial<Profile>) => mockGetProfile.mockResolvedValue({ ok: true, data: { ...EMPTY_PROFILE, ...over } });

const mockSignOut = jest.mocked(signOut);

const SESSION = { user: { email: "anna.kowalska@example.com", displayName: "Anna Kowalska" } };

beforeEach(() => {
  jest.clearAllMocks();
  mockSignOut.mockResolvedValue({ ok: true });
  load({});
});

const SOON_ROWS = ["row-notifications", "row-connected-accounts"];

describe("ProfileScreen (S6)", () => {
  it("renders the header, the theme row, two stub rows and sign-out", async () => {
    await renderWithProviders(<ProfileScreen />, { session: SESSION });
    expect(screen.getByRole("header", { name: "Profile" })).toBeOnTheScreen();
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Anna Kowalska");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("anna.kowalska@example.com");
    expect(screen.getByLabelText("Appearance")).toBeOnTheScreen();
    for (const id of SOON_ROWS) {
      expect(screen.getByTestId(id)).toBeOnTheScreen();
    }
    expect(screen.getByRole("button", { name: "Sign out" })).toBeOnTheScreen();
  });

  it("marks every stub row with 'soon' and announces it (Q7)", async () => {
    await renderWithProviders(<ProfileScreen />, { session: SESSION });
    for (const id of SOON_ROWS) {
      const row = screen.getByTestId(id);
      expect(within(row).getByText("soon")).toBeOnTheScreen();
      expect(row.props.accessibilityHint).toBe("Coming soon");
      expect(String(row.props.accessibilityLabel).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("soon")).toHaveLength(SOON_ROWS.length);
  });

  it("does not navigate anywhere when a stub row is pressed (Q7)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ProfileScreen />, { session: SESSION });
    for (const id of SOON_ROWS) {
      await user.press(screen.getByTestId(id));
    }
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it.each(["en", "ru"] as const)("has no language-selection row in %s (AC-40)", async (locale) => {
    await renderWithProviders(<ProfileScreen />, { locale, session: SESSION });
    expect(screen.queryByText(/language|язык/i)).not.toBeOnTheScreen();
    // The only selector is the theme one, with exactly its three options.
    expect(screen.getAllByLabelText(locale === "en" ? "Appearance" : "Тема оформления")).toHaveLength(1);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("localizes to Russian", async () => {
    await renderWithProviders(<ProfileScreen />, { locale: "ru", session: SESSION });
    expect(screen.getByRole("radio", { name: "Светлая" })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Тёмная" })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Системная" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Выйти" })).toBeOnTheScreen();
    expect(screen.getAllByText("скоро")).toHaveLength(SOON_ROWS.length);
  });

  it("wraps a very long name to at most two lines without throwing", async () => {
    await renderWithProviders(
      <ProfileHeader name="Alexandra-Catherine Konstantinopolitanskaya-Ivanovna" email="long@example.com" />,
    );
    expect(screen.getByTestId("profile-name").props.numberOfLines).toBe(2);
  });

  it("shows the name and email of the signed-in account (AC-25)", async () => {
    await renderWithProviders(<ProfileScreen />, {
      session: { user: { email: "lena.novak@example.org", displayName: "Lena Novak" } },
    });
    expect(screen.getByTestId("profile-name")).toHaveTextContent("Lena Novak");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("lena.novak@example.org");
    expect(within(screen.getByTestId("profile-screen")).getByText("L", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("shows the email's local part and a non-empty initial without a display name (AC-26)", async () => {
    await renderWithProviders(<ProfileScreen />, {
      session: { user: { email: "bruno.k@example.com", displayName: null } },
    });
    expect(screen.getByTestId("profile-name")).toHaveTextContent("bruno.k");
    expect(screen.getByTestId("profile-email")).toHaveTextContent("bruno.k@example.com");
    expect(within(screen.getByTestId("profile-screen")).getByText("B", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("treats a blank display name like a missing one (AC-26)", async () => {
    await renderWithProviders(<ProfileScreen />, {
      session: { user: { email: "carla@example.com", displayName: "   " } },
    });
    expect(screen.getByTestId("profile-name")).toHaveTextContent("carla");
  });

  it("shows the same initial on the profile, trips and history for one session (AC-27)", async () => {
    const session = { user: { email: "x@example.com", displayName: "  émile Zola" } };
    const initials: string[] = [];
    for (const [ui, avatarId] of [
      [<TripsScreen key="trips" />, "trips-avatar"],
      [<HistoryScreen key="history" />, "history-avatar"],
      [<ProfileScreen key="profile" />, "profile-screen"],
    ] as const) {
      const view = await renderWithProviders(ui, { session });
      const circle = within(screen.getByTestId(avatarId)).getByText(/^\p{L}$/u, { includeHiddenElements: true });
      initials.push(circle.props.children as string);
      view.unmount();
    }
    expect(initials).toEqual(["É", "É", "É"]);
  });

  it("calls signOut exactly once on 'Sign out' and does not navigate itself (AC-22)", async () => {
    const user = userEvent.setup();
    await renderWithProviders(<ProfileScreen />, { session: SESSION });
    await user.press(screen.getByRole("button", { name: "Sign out" }));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    // Gating moves the user to /onboarding (ProfileSignOut.test.tsx), not this screen.
    expect(mockRouter.dismissAll).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  it("has no delete-account row (decision C6)", async () => {
    await renderWithProviders(<ProfileScreen />, { session: SESSION });
    expect(screen.queryByText(/delete account|удалить аккаунт/i)).not.toBeOnTheScreen();
  });
});
