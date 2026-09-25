import { StyleSheet, View } from "react-native";
import type { PlaceLanguage } from "@tripplanner/shared";

import { GlassSurface } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import type { ProfileEditor } from "../hooks/useProfileEditor";
import { rowValueOf } from "../rowValues";
import { LanguageRow } from "./LanguageRow";
import { ProfileSaveError } from "./ProfileSaveError";
import { ProfileValueRow } from "./ProfileValueRow";
import { SoonSettingRow } from "./SoonSettingRow";

export interface SettingsCardProps {
  editor: ProfileEditor;
  lang: PlaceLanguage;
}

/** Notifications and connected accounts are "soon" stubs; the currency and language rows are real (AC-14). */
export function SettingsCard({ editor, lang }: SettingsCardProps) {
  const { t } = useTranslation("profile");
  const { display, loading, loadError } = editor;
  return (
    <View style={styles.root}>
      <GlassSurface style={styles.card}>
        <SoonSettingRow label={t("rows.notifications")} testID="row-notifications" />
        <SoonSettingRow label={t("rows.connectedAccounts")} testID="row-connected-accounts" />
        <ProfileValueRow
          label={t("rows.currency")}
          hint={t("hints.currency")}
          value={loading || loadError ? null : rowValueOf("homeCurrency", display, lang)}
          onPress={() => editor.open("homeCurrency")}
          testID="row-homeCurrency"
        />
        <LanguageRow />
      </GlassSurface>
      {editor.saveError?.card === "settings" ? <ProfileSaveError kind={editor.saveError.kind} testID="save-error-settings" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  card: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.xs },
});
