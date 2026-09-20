import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Appearance, Text } from "react-native";

import { THEME_STORAGE_KEY } from "../preference";
import type { ThemePreference } from "../preference";
import { ThemeProvider } from "../ThemeProvider";
import { darkTokens, lightTokens } from "../tokens";
import { useTheme } from "../useTheme";
import type { ThemeContextValue } from "../ThemeProvider";

let latest: ThemeContextValue | null = null;

function Probe() {
  const theme = useTheme();
  latest = theme;
  return <Text testID="scheme">{theme.scheme}</Text>;
}

function current(): ThemeContextValue {
  if (latest === null) throw new Error("Probe not rendered");
  return latest;
}

async function renderReady() {
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  );
  await waitFor(() => expect(current().isReady).toBe(true));
}

beforeEach(async () => {
  jest.restoreAllMocks();
  latest = null;
  await AsyncStorage.clear();
  jest.spyOn(Appearance, "getColorScheme").mockReturnValue("light");
});

describe("ThemeProvider", () => {
  it("starts dark with nothing stored, even when the system is light (AC-14)", async () => {
    await renderReady();
    expect(current().scheme).toBe("dark");
    expect(current().preference).toBe("dark");
    expect(current().tokens).toBe(darkTokens);
  });

  it("writes nothing before an explicit choice (AC-33)", async () => {
    await renderReady();
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([]);
  });

  it("applies a valid stored choice (AC-32)", async () => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, "light");
    await renderReady();
    expect(current().scheme).toBe("light");
    expect(current().tokens).toBe(lightTokens);
  });

  it.each(["Светлая", '{"a":1}', ""])("falls back to dark for garbage %p (AC-31)", async (raw) => {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, raw);
    await renderReady();
    expect(current().scheme).toBe("dark");
  });

  it("starts dark without throwing when storage is broken (AC-31)", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("storage down"));
    await renderReady();
    expect(current().scheme).toBe("dark");
  });

  it("swaps tokens immediately when the preference changes (AC-15)", async () => {
    await renderReady();
    await act(async () => {
      await current().setPreference("light");
    });
    expect(current().tokens).toBe(lightTokens);
    expect(screen.getByTestId("scheme").props.children).toBe("light");

    await act(async () => {
      await current().setPreference("dark");
    });
    expect(current().tokens).toBe(darkTokens);
  });

  it("'system' follows the device scheme", async () => {
    await renderReady();
    await act(async () => {
      await current().setPreference("system");
    });
    expect(current().preference).toBe("system");
    expect(current().scheme).toBe("light");
  });

  it("persists exactly one key after setPreference (AC-33)", async () => {
    await renderReady();
    let result: { ok: boolean } | undefined;
    await act(async () => {
      result = await current().setPreference("system" satisfies ThemePreference);
    });
    expect(result).toEqual({ ok: true });
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([THEME_STORAGE_KEY]);
    await expect(AsyncStorage.getItem(THEME_STORAGE_KEY)).resolves.toBe("system");
  });

  it("still applies the theme for the session when the write fails", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
    await renderReady();
    let result: { ok: boolean } | undefined;
    await act(async () => {
      result = await current().setPreference("light");
    });
    expect(result).toEqual({ ok: false });
    expect(current().scheme).toBe("light");
  });

  it("useTheme throws outside a provider", () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow("ThemeProvider");
  });
});
