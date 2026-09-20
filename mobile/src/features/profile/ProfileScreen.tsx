import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, GlassSurface, Screen, SecondaryButton } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";
import { MOCK_USER } from "@/mocks";

import { ProfileHeader } from "./components/ProfileHeader";
import { SoonSettingRow } from "./components/SoonSettingRow";
import { ThemeSettingRow } from "./components/ThemeSettingRow";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

/**
 * S6 — profile tab. Theme is the only working setting; the other rows are
 * "soon" stubs. There is deliberately no language row: the UI language
 * follows the device (AC-40).
 */
export function ProfileScreen() {
  const { t } = useTranslation("profile");
  const router = useRouter();

  const signOut = () => {
    // Drop anything stacked above the tabs, then reset to onboarding so the
    // back gesture cannot return to the tabs (AC-13).
    router.dismissAll();
    router.replace("/onboarding");
  };

  return (
    <Screen edges={TAB_EDGES} testID="profile-screen" contentStyle={styles.content}>
      <AppText variant="h1" accessibilityRole="header">
        {t("title")}
      </AppText>
      <ProfileHeader name={MOCK_USER.name} email={MOCK_USER.email} />
      <GlassSurface style={styles.group}>
        <ThemeSettingRow />
        <SoonSettingRow label={t("rows.notifications")} testID="row-notifications" />
        <SoonSettingRow
          label={t("rows.connectedAccounts")}
          value={MOCK_USER.connectedAccount}
          testID="row-connected-accounts"
        />
        <SoonSettingRow
          label={t("rows.currency")}
          value={MOCK_USER.currency}
          testID="row-currency"
        />
      </GlassSurface>
      <View style={styles.logout}>
        <SecondaryButton
          label={t("logout")}
          accessibilityLabel={t("logout")}
          onPress={signOut}
          testID="profile-logout"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
  group: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.xs },
  logout: { alignItems: "stretch" },
});
