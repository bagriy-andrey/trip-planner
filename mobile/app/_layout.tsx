import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAppFonts } from "@/lib/fonts";
import { i18n, useDeviceLocaleSync } from "@/lib/i18n";
import { ThemeProvider, useTheme } from "@/lib/theme";

// Keep the native splash up until fonts and the stored theme are ready (AC-18, AC-32).
// The promise rejects if the splash is already gone (e.g. fast refresh); nothing to do then.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppShell() {
  const [fontsLoaded, fontsError] = useAppFonts();
  const { tokens, scheme, isReady: themeReady } = useTheme();
  useDeviceLocaleSync();

  // Root view colour follows the theme so overscroll / transitions never flash the other one.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(tokens.bg);
  }, [tokens.bg]);

  // A font error still releases the splash: system fonts beat a stuck launch screen.
  const ready = (fontsLoaded || fontsError !== null) && themeReady;
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={scheme === "light" ? "dark" : "light"} />
      <Stack
        screenOptions={{
          // Every screen draws its own back / cancel controls (S7 hero, S10-S12 back button, S8/S9 ModalHeader).
          headerShown: false,
          contentStyle: { backgroundColor: tokens.bg },
        }}
      >
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="trips/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="trips/[tripId]/flights/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="trips/[tripId]/flights/[flightId]" options={{ presentation: "modal" }} />
        <Stack.Screen name="trips/[tripId]/hotels/new" options={{ presentation: "modal" }} />
        <Stack.Screen name="trips/[tripId]/cars/new" options={{ presentation: "modal" }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <AppShell />
        </I18nextProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
