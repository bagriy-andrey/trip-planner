import AsyncStorage from "@react-native-async-storage/async-storage";
import { screen, userEvent, waitFor } from "@testing-library/react-native";

import { i18n, LANGUAGE_STORAGE_KEY } from "@/lib/i18n";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { LanguageRow } from "../components/LanguageRow";

async function renderRow() {
  await renderWithProviders(<LanguageRow />);
  // Start from an empty store: assertions see only what the user's tap writes.
  await AsyncStorage.clear();
}

afterEach(async () => {
  // The provider drives the shared app instance: put it back for the next test.
  await i18n.changeLanguage("en");
  await AsyncStorage.clear();
});

describe("LanguageRow", () => {
  it("shows 'System' by default and offers the four options without a 'Not specified' row", async () => {
    const user = userEvent.setup();
    await renderRow();
    expect(screen.getByRole("button", { name: "Language, System" })).toBeOnTheScreen();

    await user.press(screen.getByTestId("row-language"));
    expect(screen.getAllByRole("header", { name: "Language" }).length).toBeGreaterThan(0);
    for (const key of ["system", "en", "ru", "uk"]) {
      expect(screen.getByTestId(`language-picker-item-${key}`)).toBeOnTheScreen();
    }
    expect(screen.getByRole("button", { name: "Українська" })).toBeOnTheScreen();
    expect(screen.queryByTestId("language-picker-none")).toBeNull();
  });

  it("applies Ukrainian at once and stores exactly the language key", async () => {
    const user = userEvent.setup();
    await renderRow();
    await user.press(screen.getByTestId("row-language"));
    await user.press(screen.getByTestId("language-picker-item-uk"));

    await waitFor(() => expect(i18n.language).toBe("uk"));
    await waitFor(async () => expect(await AsyncStorage.getAllKeys()).toEqual([LANGUAGE_STORAGE_KEY]));
    await expect(AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).resolves.toBe("uk");
    expect(screen.getByTestId("row-language")).toHaveTextContent(/Українська/);
  });

  it("re-selecting 'System' goes back to the device language", async () => {
    const user = userEvent.setup();
    await renderRow();
    await user.press(screen.getByTestId("row-language"));
    await user.press(screen.getByTestId("language-picker-item-ru"));
    await waitFor(() => expect(i18n.language).toBe("ru"));

    await user.press(screen.getByTestId("row-language"));
    await user.press(screen.getByTestId("language-picker-item-system"));
    // The jest device locale is English (see jest.setup.ts).
    await waitFor(() => expect(i18n.language).toBe("en"));
    await expect(AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).resolves.toBe("system");
  });

  it("restores a stored choice on start", async () => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, "ru");
    await renderWithProviders(<LanguageRow />);
    await waitFor(() => expect(i18n.language).toBe("ru"));
    expect(screen.getByTestId("row-language")).toHaveTextContent(/Русский/);
  });
});
