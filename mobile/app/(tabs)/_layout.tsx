import { Tabs } from "expo-router";

import { Icon } from "@/components";
import type { IconName } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

// Every tab needs an explicit `tabBarIcon`, otherwise React Navigation draws its placeholder triangle.
const tabIcon =
  (name: IconName) =>
  ({ focused }: { focused: boolean }) => <Icon name={name} color={focused ? "accent" : "tabInactive"} />;

export default function TabsLayout() {
  const { t } = useTranslation("common");
  const { tokens } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.accent,
        tabBarInactiveTintColor: tokens.tabInactive,
        // No fixed width or height on labels: they must grow with Dynamic Type (AC-39).
        tabBarLabelStyle: { ...typography.micro, paddingVertical: spacing.sm },
        tabBarStyle: { backgroundColor: tokens.bg, borderTopColor: tokens.surfaceBorder },
      }}
    >
      <Tabs.Screen
        name="trips"
        options={{
          title: t("tabs.trips"),
          tabBarIcon: tabIcon("suitcase"),
          tabBarLabel: t("tabs.trips"),
          tabBarAccessibilityLabel: t("tabs.trips"),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t("tabs.history"),
          tabBarIcon: tabIcon("clock"),
          tabBarLabel: t("tabs.history"),
          tabBarAccessibilityLabel: t("tabs.history"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarIcon: tabIcon("user"),
          tabBarLabel: t("tabs.profile"),
          tabBarAccessibilityLabel: t("tabs.profile"),
        }}
      />
    </Tabs>
  );
}
