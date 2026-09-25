import { StyleSheet } from "react-native";

import { AppText, GlassSurface } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { radius, spacing } from "@/lib/theme";

export function NotesCard({ notes }: { notes: string }) {
  const { t } = useTranslation("car");
  return (
    <GlassSurface style={styles.card}>
      <AppText variant="h2">{t("view.notes")}</AppText>
      <AppText testID="car-view-notes">{notes}</AppText>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.card, gap: spacing.sm },
});
