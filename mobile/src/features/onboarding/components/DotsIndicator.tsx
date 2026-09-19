import { StyleSheet, View } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { radii, spacing, useTheme } from "@/lib/theme";

export interface DotsIndicatorProps {
  total: number;
  /** 1-based index of the highlighted dot. Static in the skeleton. */
  current: number;
}

/** Static page dots; exposed to VoiceOver as one element ("Page 1 of 3"). */
export function DotsIndicator({ total, current }: DotsIndicatorProps) {
  const { t } = useTranslation("onboarding");
  const { tokens } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={t("pageIndicator", { current, total })}
      style={styles.row}
      testID="onboarding-dots"
    >
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            { backgroundColor: index + 1 === current ? tokens.accent : tokens.glassBorder },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: radii.pill },
});
