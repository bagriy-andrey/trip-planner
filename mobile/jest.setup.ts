// Native-module mocks shared by every test. Keep them minimal and deterministic.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-localization", () => {
  const getLocales = jest.fn(() => [
    {
      languageTag: "en-US",
      languageCode: "en",
      regionCode: "US",
      textDirection: "ltr",
    },
  ]);
  return { __esModule: true, getLocales, useLocales: jest.fn(() => getLocales()) };
});

jest.mock("expo-blur", () => {
  const { View } = require("react-native");
  return { __esModule: true, BlurView: View };
});

jest.mock("expo-font", () => ({
  __esModule: true,
  useFonts: jest.fn(() => [true, null]),
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-splash-screen", () => ({
  __esModule: true,
  preventAutoHideAsync: jest.fn(() => Promise.resolve(true)),
  hideAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-system-ui", () => ({
  __esModule: true,
  setBackgroundColorAsync: jest.fn(() => Promise.resolve()),
  getBackgroundColorAsync: jest.fn(() => Promise.resolve(null)),
}));

// In-memory expo-secure-store. Cleared before every test so a stored AES key
// never leaks between tests. Tests may seed/inspect it via the mock's helpers.
jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
    AFTER_FIRST_UNLOCK: 0,
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
    WHEN_UNLOCKED: 5,
    isAvailableAsync: jest.fn(() => Promise.resolve(true)),
    getItemAsync: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    setItemAsync: jest.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    __clearSecureStore: () => store.clear(),
  };
});

// Native date picker (SPEC-03 AC-77): the real component needs the native module. The mock is a
// pressable that reports its own `value` through `onChange` as a "set" event, so a form test can
// drive it with `fireEvent.press(getByTestId(...))` (or `userEvent.press`) without a native
// module. Tests that need a specific date pass it as the `value` prop. The imperative Android
// API (`DateTimePickerAndroid`) is mocked the same way: `open` immediately "sets" its `value`.
jest.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Pressable } = require("react-native");

  const setEvent = (value: Date) => ({
    type: "set",
    nativeEvent: { timestamp: value.getTime(), utcOffset: 0 },
  });

  const DateTimePicker = ({
    value,
    onChange,
    testID = "datetimepicker",
    accessibilityLabel,
  }: {
    value: Date;
    onChange?: (event: ReturnType<typeof setEvent>, date?: Date) => void;
    testID?: string;
    accessibilityLabel?: string;
  }) =>
    React.createElement(Pressable, {
      testID,
      accessibilityLabel,
      onPress: () => onChange?.(setEvent(value), value),
    });

  const DateTimePickerAndroid = {
    open: jest.fn(
      ({
        value,
        onChange,
      }: {
        value: Date;
        onChange?: (event: ReturnType<typeof setEvent>, date?: Date) => void;
      }) => onChange?.(setEvent(value), value),
    ),
    dismiss: jest.fn(() => Promise.resolve(true)),
  };

  return { __esModule: true, default: DateTimePicker, DateTimePickerAndroid };
});

// Deterministic "random" bytes: tests must not depend on randomness.
jest.mock("expo-crypto", () => {
  const getRandomBytes = (byteCount: number) =>
    Uint8Array.from({ length: byteCount }, (_, i) => (i * 7 + 1) % 256);
  return {
    __esModule: true,
    getRandomBytes: jest.fn(getRandomBytes),
    getRandomBytesAsync: jest.fn((byteCount: number) =>
      Promise.resolve(getRandomBytes(byteCount)),
    ),
  };
});

// `@/lib/supabase` throws a ConfigError at import when the two public settings are unset
// (AC-47), and anything that renders the root layout imports it. Obviously fake, non-secret
// defaults keep those suites loadable without a `.env`; a value already set (CI, a developer's
// shell) wins, and tests that need the "unset" behaviour clear the variables themselves.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key-not-a-secret";

beforeEach(() => {
  (
    jest.requireMock("expo-secure-store") as { __clearSecureStore: () => void }
  ).__clearSecureStore();
});
