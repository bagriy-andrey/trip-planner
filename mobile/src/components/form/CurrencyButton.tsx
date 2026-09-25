import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { AppText } from "../AppText";
import { Icon } from "../Icon";

export interface CurrencyButtonProps {
  /** Chosen ISO code, or "" while none is chosen (never defaulted). */
  currency: string;
  /** Hint while nothing is chosen (home currency or an example). Never a value. */
  placeholder: string;
  /** Caption above the button (already translated; the "required" variant is the caller's choice). */
  caption: string;
  accessibilityLabel: string;
  onPress: () => void;
  errorText?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Currency dropdown button: mono code, placeholder hint, danger border on error. */
export function CurrencyButton({
  currency,
  placeholder,
  caption,
  accessibilityLabel,
  onPress,
  errorText,
  style,
  testID,
}: CurrencyButtonProps) {
  const { tokens } = useTheme();
  const chosen = currency !== "";
  return (
    <View style={[styles.root, style]}>
      <AppText variant="small" color="textSecondary">
        {caption}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        testID={testID}
        style={[
          styles.button,
          { backgroundColor: tokens.surface, borderColor: errorText === undefined ? tokens.surfaceBorder : tokens.danger },
        ]}
      >
        <AppText variant="mono" color={chosen ? "text" : "textSecondary"} style={styles.buttonText}>
          {chosen ? currency : placeholder}
        </AppText>
        <Icon name="chevron" color="textSecondary" />
      </Pressable>
      {errorText === undefined ? null : (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  button: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
  },
  buttonText: { flexShrink: 1 },
});
