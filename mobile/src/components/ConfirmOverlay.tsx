import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface ConfirmOverlayProps {
  /** Spoken name of the scrim (tapping it dismisses). */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * The SheetOverlay pattern (private to trip-detail, so re-implemented): an absolute view with a
 * `scrim` backdrop and a bottom panel — deliberately not a native `Modal` and never a system
 * `Alert`. `accessibilityViewIsModal` hides what is behind it from VoiceOver.
 */
export function ConfirmOverlay({ closeLabel, onClose, children, testID }: ConfirmOverlayProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View testID={testID} accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.root]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        onPress={onClose}
        testID={testID === undefined ? undefined : `${testID}-backdrop`}
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.scrim }]}
      />
      <View
        style={[
          styles.panel,
          { backgroundColor: tokens.bg, borderColor: tokens.surfaceBorder, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: "flex-end" },
  panel: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: layout.borderWidth,
  },
});
