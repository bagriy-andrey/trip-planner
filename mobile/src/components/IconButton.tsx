import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { radii, useTheme } from "@/lib/theme";

import { MIN_HIT_SIZE } from "./a11y";
import type { AccessibleProps } from "./a11y";

export interface IconButtonProps extends AccessibleProps {
  /** The glyph/icon node. */
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Visible circle diameter; the touch target stays at least 44x44 (AC-20). */
  size?: number;
  /** Filled glass circle behind the glyph (default) or bare glyph. */
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  children,
  onPress,
  disabled = false,
  size = 36,
  filled = true,
  style,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: IconButtonProps) {
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.hitArea,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <View
        style={[
          styles.visual,
          { width: size, height: size, borderRadius: radii.pill },
          filled && { backgroundColor: tokens.glass, borderColor: tokens.glassBorder, borderWidth: StyleSheet.hairlineWidth },
        ]}
      >
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    minWidth: MIN_HIT_SIZE,
    minHeight: MIN_HIT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  visual: { alignItems: "center", justifyContent: "center" },
});
