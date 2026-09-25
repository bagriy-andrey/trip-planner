import { StyleSheet, View } from "react-native";
import type { Edge } from "react-native-safe-area-context";

import { AppText, Screen, SecondaryButton } from "@/components";
import { signOut } from "@/features/auth";
import { resolveLocale, useTranslation } from "@/lib/i18n";
import { displayNameOf, useSession } from "@/lib/session";
import { spacing } from "@/lib/theme";

import { AboutMeCard } from "./components/AboutMeCard";
import { ProfileFieldPicker } from "./components/ProfileFieldPicker";
import { ProfileHeader } from "./components/ProfileHeader";
import { SettingsCard } from "./components/SettingsCard";
import { ThemeSettingRow } from "./components/ThemeSettingRow";
import { useProfileEditor } from "./hooks/useProfileEditor";

// The tab bar owns the bottom inset.
const TAB_EDGES: readonly Edge[] = ["top", "left", "right"];

/**
 * S6 — profile tab. Name and email come from the session. "About me" and the currency row are
 * edited through one picker sheet; theme sits outside the cards. There is no language row: the UI
 * language follows the device.
 */
export function ProfileScreen() {
  const { t, i18n } = useTranslation("profile");
  const { user } = useSession();
  const editor = useProfileEditor();
  const lang = resolveLocale([i18n.language]);
  const sheetOpen = editor.activeField !== null;

  // No navigation here: signOut ends the session and the root layout's route gating moves the
  // user to /onboarding by itself.
  const onSignOut = () => {
    void signOut();
  };

  return (
    <Screen edges={TAB_EDGES} testID="profile-screen" contentStyle={styles.content}>
      <View
        style={styles.content}
        accessibilityElementsHidden={sheetOpen}
        importantForAccessibility={sheetOpen ? "no-hide-descendants" : "auto"}
      >
        <AppText variant="h1" accessibilityRole="header">
          {t("title")}
        </AppText>
        <ProfileHeader name={displayNameOf(user)} email={user?.email ?? ""} />
        <AboutMeCard editor={editor} lang={lang} />
        <SettingsCard editor={editor} lang={lang} />
        <ThemeSettingRow />
        <SecondaryButton
          label={t("logout")}
          accessibilityLabel={t("logout")}
          onPress={onSignOut}
          testID="profile-logout"
        />
      </View>
      <ProfileFieldPicker editor={editor} lang={lang} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingTop: spacing.sm, paddingBottom: spacing.xl },
});
