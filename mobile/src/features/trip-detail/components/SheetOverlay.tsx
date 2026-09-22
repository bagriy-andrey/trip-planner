import { Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface SheetOverlayProps {
  /** Spoken name of the dimmed backdrop, which closes the sheet (a tap outside). */
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
  testID?: string;
}

/**
 * A bottom sheet drawn over the screen — deliberately NOT a native `Modal` and not a system
 * alert: it is a plain view, so pushing the edit route right after closing it cannot collide with
 * a native dismissal still in flight, and it renders the same on both platforms. The backdrop
 * (`scrim`) dims the screen and closes the sheet on tap.
 */
export function SheetOverlay({ closeLabel, onClose, children, testID }: SheetOverlayProps) {
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
          {
            backgroundColor: tokens.bg,
            borderColor: tokens.surfaceBorder,
            paddingBottom: insets.bottom + spacing.lg,
          },
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
