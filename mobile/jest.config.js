/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    // Workspace package exporting TS source; jest does not transpile the pnpm
    // symlink target under node_modules, so map it to the real file.
    "^@tripplanner/shared$": "<rootDir>/../shared/src/index.ts",
  },
  // jest-expo recipe, extended with `.pnpm` so packages inside pnpm's nested
  // node_modules layout are still transpiled.
  transformIgnorePatterns: [
    "/node_modules/(?!(\\.pnpm|(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|react-native-svg))",
  ],
};
