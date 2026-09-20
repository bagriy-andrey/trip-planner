/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // jest-expo recipe, extended with `.pnpm` so packages inside pnpm's nested
  // node_modules layout are still transpiled.
  transformIgnorePatterns: [
    "/node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|react-native-svg))",
  ],
};
