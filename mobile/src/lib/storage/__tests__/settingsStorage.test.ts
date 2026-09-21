import AsyncStorage from "@react-native-async-storage/async-storage";

import { THEME_STORAGE_KEY } from "@/lib/theme/preference";

import { STORAGE_KEYS } from "../keys";
import { ALLOWED_SETTING_KEYS, readSetting, writeSetting } from "../settingsStorage";
import type { SettingKey } from "../settingsStorage";

beforeEach(async () => {
  jest.restoreAllMocks();
  await AsyncStorage.clear();
});

describe("settingsStorage (AC-33)", () => {
  it("allows exactly one key: the theme key", () => {
    expect([...ALLOWED_SETTING_KEYS]).toEqual([THEME_STORAGE_KEY]);
  });

  it("takes its keys from the registry and never lists a secret one", () => {
    const registered = Object.values(STORAGE_KEYS).map((entry) => entry.key);
    const secret = Object.values(STORAGE_KEYS)
      .filter((entry) => entry.secret)
      .map((entry) => entry.key);
    for (const key of ALLOWED_SETTING_KEYS) {
      expect(registered).toContain(key);
      expect(secret).not.toContain(key);
    }
  });

  it("refuses the encrypted-session and launch-flag keys (they have their own writers)", async () => {
    for (const entry of [STORAGE_KEYS.session, STORAGE_KEYS.firstLaunch]) {
      await expect(writeSetting(entry.key as SettingKey, "x")).resolves.toEqual({ ok: false });
      await expect(readSetting(entry.key as SettingKey)).resolves.toBeNull();
    }
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([]);
  });

  it("round-trips the theme key", async () => {
    await expect(writeSetting(THEME_STORAGE_KEY, "light")).resolves.toEqual({ ok: true });
    await expect(readSetting(THEME_STORAGE_KEY)).resolves.toBe("light");
  });

  it("returns null for a missing value", async () => {
    await expect(readSetting(THEME_STORAGE_KEY)).resolves.toBeNull();
  });

  it("refuses to write any other key and leaves storage untouched", async () => {
    // Simulates a caller bypassing the type system.
    const rogue = "tripplanner.settings.other" as SettingKey;
    await expect(writeSetting(rogue, "x")).resolves.toEqual({ ok: false });
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([]);
  });

  it("refuses to read any other key", async () => {
    await AsyncStorage.setItem("tripplanner.settings.other", "x");
    const rogue = "tripplanner.settings.other" as SettingKey;
    await expect(readSetting(rogue)).resolves.toBeNull();
  });

  it("never throws when reading fails", async () => {
    jest.spyOn(AsyncStorage, "getItem").mockRejectedValueOnce(new Error("boom"));
    await expect(readSetting(THEME_STORAGE_KEY)).resolves.toBeNull();
  });

  it("reports ok:false instead of throwing when writing fails", async () => {
    jest.spyOn(AsyncStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));
    await expect(writeSetting(THEME_STORAGE_KEY, "dark")).resolves.toEqual({ ok: false });
  });
});
