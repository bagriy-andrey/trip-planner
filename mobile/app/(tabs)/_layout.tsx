import { Tabs } from "expo-router";

import { useTranslation } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

// The skeleton ships no icon set, so tabs are label-only; without an explicit
// `tabBarIcon` React Navigation would draw its placeholder triangle.
const NO_ICON = () => null;

export default function TabsLayout() {
  const { t } = useTranslation("common");
  const { tokens } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarIcon: NO_ICON,
        tabBarIconStyle: { display: "none" },
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.textSecondary,
        // No fixed width or height on labels: they must grow with Dynamic Type (AC-39).
        tabBarLabelStyle: { ...typography.micro, paddingVertical: spacing.sm },
        tabBarStyle: { backgroundColor: tokens.bg, borderTopColor: tokens.surfaceBorder },
      }}
    >
      <Tabs.Screen
        name="trips"
        options={{
          title: t("tabs.trips"),
          tabBarLabel: t("tabs.trips"),
          tabBarAccessibilityLabel: t("tabs.trips"),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarLabel: t("tabs.history"),
          tabBarAccessibilityLabel: t("tabs.history"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarLabel: t("tabs.profile"),
          tabBarAccessibilityLabel: t("tabs.profile"),
        }}
      />
    </Tabs>
  );
}
