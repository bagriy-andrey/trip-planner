import AsyncStorage from "@react-native-async-storage/async-storage";
import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import { THEME_STORAGE_KEY, useTheme } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ThemeSettingRow } from "../components/ThemeSettingRow";

function SchemeProbe() {
  const { scheme, preference } = useTheme();
  return <Text testID="probe">{`${scheme}:${preference}`}</Text>;
}

async function renderRow() {
  await renderWithProviders(
    <>
      <ThemeSettingRow />
      <SchemeProbe />
    </>,
  );
  // The harness applies its own preference on mount; start from an empty store
  // so the assertions below see only what the user's tap writes.
  await AsyncStorage.clear();
}

describe("ThemeSettingRow", () => {
  it("offers Light, Dark and System, with the current one checked", async () => {
    await renderRow();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Dark", checked: true })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "Light", checked: false })).toBeOnTheScreen();
    expect(screen.getByRole("radio", { name: "System", checked: false })).toBeOnTheScreen();
  });

  it("applies 'Light' to the tree immediately and stores exactly one key (AC-15, AC-33)", async () => {
    const user = userEvent.setup();
    await renderRow();
    expect(screen.getByTestId("probe")).toHaveTextContent("dark:dark");

    await user.press(screen.getByRole("radio", { name: "Light" }));

    expect(screen.getByTestId("probe")).toHaveTextContent("light:light");
    expect(screen.getByRole("radio", { name: "Light", checked: true })).toBeOnTheScreen();
    await waitFor(async () => {
      expect(await AsyncStorage.getAllKeys()).toEqual([THEME_STORAGE_KEY]);
    });
    await expect(AsyncStorage.getItem(THEME_STORAGE_KEY)).resolves.toBe("light");
  });

  it("stores nothing until the user picks a value", async () => {
    await renderRow();
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([]);
  });

  it("supports 'System' as a selectable value", async () => {
    const user = userEvent.setup();
    await renderRow();
    await user.press(screen.getByRole("radio", { name: "System" }));
    expect(screen.getByRole("radio", { name: "System", checked: true })).toBeOnTheScreen();
    await waitFor(async () => {
      expect(await AsyncStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    });
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([THEME_STORAGE_KEY]);
  });
});
