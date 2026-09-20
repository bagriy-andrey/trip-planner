import { Pressable, StyleSheet, View } from "react-native";

import { AppText, MIN_HIT_SIZE } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { radius, spacing, THEME_PREFERENCES, useTheme } from "@/lib/theme";
import type { ThemePreference } from "@/lib/theme";

/**
 * The only working control of the skeleton (AC-15, AC-30): a segmented choice
 * Light / Dark / System. Picking a segment applies the theme at once and
 * persists it through the theme provider (the single storage writer, AC-33).
 */
export function ThemeSettingRow() {
  const { t } = useTranslation("profile");
  const { tokens, preference, setPreference } = useTheme();

  const select = (next: ThemePreference) => {
    // setPreference never rejects: a failed write only means "not persisted".
    void setPreference(next);
  };

  return (
    <View style={styles.root}>
      <AppText accessibilityRole="header">{t("rows.theme")}</AppText>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t("rows.theme")}
        style={[styles.group, { backgroundColor: tokens.divider }]}
      >
        {THEME_PREFERENCES.map((option) => {
          const selected = option === preference;
          const label = t(`themeOptions.${option}`);
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: selected }}
              onPress={() => select(option)}
              testID={`theme-option-${option}`}
              style={[styles.segment, selected && { backgroundColor: tokens.accent }]}
            >
              <AppText
                variant="small"
                color={selected ? "onAccent" : "text"}
                style={styles.segmentLabel}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm, paddingVertical: spacing.sm },
  group: {
    flexDirection: "row",
    padding: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    minHeight: MIN_HIT_SIZE,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: { textAlign: "center" },
});
