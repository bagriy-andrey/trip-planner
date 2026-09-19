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
