import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, GlassSurface, Screen, SecondaryButton } from "@/components";
import { signOut } from "@/features/auth";
import { useTranslation } from "@/lib/i18n";
import { displayNameOf, useSession } from "@/lib/session";
import { spacing } from "@/lib/theme";

import { ProfileHeader } from "./components/ProfileHeader";
import { SoonSettingRow } from "./components/SoonSettingRow";
import { ThemeSettingRow } from "./components/ThemeSettingRow";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

/**
 * S6 — profile tab. Name and email come from the session (AC-25). Theme is the only working
 * setting; the other rows are "soon" stubs with a marker and NO value (AC-65). There is deliberately no language row: the UI language
 * follows the device (AC-40).
 */
export function ProfileScreen() {
  const { t } = useTranslation("profile");
  const { user } = useSession();

  // No navigation here: signOut ends the session and the root layout's route gating moves the
  // user to /onboarding by itself, clearing the stack (AC-22).
  const onSignOut = () => {
    void signOut();
  };

  return (
    <Screen edges={TAB_EDGES} testID="profile-screen" contentStyle={styles.content}>
      <AppText variant="h1" accessibilityRole="header">
        {t("title")}
      </AppText>
      <ProfileHeader name={displayNameOf(user)} email={user?.email ?? ""} />
      <GlassSurface style={styles.group}>
        <ThemeSettingRow />
        <SoonSettingRow label={t("rows.notifications")} testID="row-notifications" />
        <SoonSettingRow label={t("rows.connectedAccounts")} testID="row-connected-accounts" />
        <SoonSettingRow label={t("rows.currency")} testID="row-currency" />
      </GlassSurface>
      <View style={styles.logout}>
        <SecondaryButton
          label={t("logout")}
          accessibilityLabel={t("logout")}
          onPress={onSignOut}
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
