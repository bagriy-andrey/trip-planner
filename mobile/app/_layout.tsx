import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAppFonts } from "@/lib/fonts";
import { i18n, useDeviceLocaleSync } from "@/lib/i18n";
import { QueryCacheGuard, QueryProvider } from "@/lib/query";
import { SessionProvider, useSession } from "@/lib/session";
import { ThemeProvider, useTheme } from "@/lib/theme";

// Keep the native splash up until fonts, the stored theme and the stored session are ready
// (SPEC-01 AC-18/AC-32, SPEC-02 AC-2).
// The promise rejects if the splash is already gone (e.g. fast refresh); nothing to do then.
SplashScreen.preventAutoHideAsync().catch(() => undefined);

function AppShell() {
  const [fontsLoaded, fontsError] = useAppFonts();
  const { tokens, scheme, isReady: themeReady } = useTheme();
  const { status, isRoutedAsSignedIn } = useSession();
  useDeviceLocaleSync();

  // Root view colour follows the theme so overscroll / transitions never flash the other one.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(tokens.bg);
  }, [tokens.bg]);

  // A font error still releases the splash: system fonts beat a stuck launch screen.
  const ready = (fontsLoaded || fontsError !== null) && themeReady && status !== "restoring";
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
        {/* Route gating lives here, not in screens (SPEC-02 AC-20, AC-21). URLs and files are
            unchanged: `Stack.Protected` only decides which of these screens exist for the
            current session. A guarded URL opened without access (link, back gesture, sign-out)
            falls back to the first screen of the allowed group: /trips when signed in,
            /onboarding when not. Every guarded route MUST be declared here — an undeclared
            route is appended unguarded (navigation.test.tsx catches it). `legal/*`, `index` and
            `+not-found` are deliberately NOT declared, so they stay reachable in both states. */}
        <Stack.Protected guard={isRoutedAsSignedIn}>
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="trips/[tripId]/index" />
          <Stack.Screen name="trips/[tripId]/route" />
          <Stack.Screen name="trips/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="trips/[tripId]/edit" options={{ presentation: "modal" }} />
          <Stack.Screen name="trips/[tripId]/flights/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="trips/[tripId]/flights/[flightId]" options={{ presentation: "modal" }} />
          <Stack.Screen name="trips/[tripId]/hotels/new" options={{ presentation: "modal" }} />
          <Stack.Screen name="trips/[tripId]/cars/new" options={{ presentation: "modal" }} />
        </Stack.Protected>
        <Stack.Protected guard={!isRoutedAsSignedIn}>
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nextProvider i18n={i18n}>
          <SessionProvider>
            <QueryProvider>
              {/* Drops the cached server data when the account ends or changes (["trips"] has no user id). */}
              <QueryCacheGuard />
              <AppShell />
            </QueryProvider>
          </SessionProvider>
        </I18nextProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
