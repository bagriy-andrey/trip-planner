import { StyleSheet, View } from "react-native";
import type { ProfileField } from "@tripplanner/shared";

import { AppText, GlassSurface } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import { ProfileLoadError } from "./ProfileLoadError";
import { ProfileSaveError } from "./ProfileSaveError";
import { ProfileValueRow } from "./ProfileValueRow";
import type { ProfileEditor } from "../hooks/useProfileEditor";
import { rowValueOf } from "../rowValues";
import type { PlaceLanguage } from "@tripplanner/shared";

const ABOUT_ME_FIELDS: readonly Exclude<ProfileField, "homeCurrency">[] = ["citizenship", "residence", "homeCity", "homeAirport"];

export interface AboutMeCardProps {
  editor: ProfileEditor;
  lang: PlaceLanguage;
}

/** "About me": four optional rows, or the load error in their place (AC-28). */
export function AboutMeCard({ editor, lang }: AboutMeCardProps) {
  const { t } = useTranslation("profile");
  const { display, loading, loadError } = editor;
  return (
    <View style={styles.root}>
      <AppText variant="h2" accessibilityRole="header">
        {t("aboutMe.title")}
      </AppText>
      <GlassSurface style={styles.card}>
        {loadError ? (
          <ProfileLoadError onRetry={editor.retry} />
        ) : (
          ABOUT_ME_FIELDS.map((field) => (
            <ProfileValueRow
              key={field}
              label={t(`fields.${field}`)}
              hint={field === "homeAirport" ? t("hints.homeAirport") : undefined}
              value={loading ? null : rowValueOf(field, display, lang)}
              onPress={() => editor.open(field)}
              testID={`row-${field}`}
            />
          ))
        )}
      </GlassSurface>
      <AppText variant="small" color="textSecondary">
        {t("aboutMe.footnote")}
      </AppText>
      {editor.saveError?.card === "aboutMe" ? <ProfileSaveError kind={editor.saveError.kind} testID="save-error-aboutMe" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  card: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
});
