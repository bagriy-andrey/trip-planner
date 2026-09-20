import { StyleSheet, View } from "react-native";

import { AppText } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

/** "— or with email —" separator between social buttons and the email form. */
export function OrDivider() {
  const { t } = useTranslation("auth");
  const { tokens } = useTheme();
  const line = [styles.line, { backgroundColor: tokens.surfaceBorder }];
  return (
    <View style={styles.row} accessible accessibilityLabel={t("social.divider")}>
      <View style={line} />
      <AppText variant="small" color="textSecondary">
        {t("social.divider")}
      </AppText>
      <View style={line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  line: { flex: 1, height: layout.borderWidth },
});
