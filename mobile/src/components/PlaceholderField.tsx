import { StyleSheet, TextInput, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { radii, spacing, typography, useTheme } from "@/lib/theme";

import { AppText } from "./AppText";
import { MIN_HIT_SIZE } from "./a11y";

export interface PlaceholderFieldProps {
  /** Caption above the field; also the spoken name. */
  label: string;
  /** Static text shown in the field (the skeleton has no editing). */
  value?: string;
  placeholder?: string;
  /** Password-style field: masks the value (`secureTextEntry`). Never logged. */
  secure?: boolean;
  /** Ticket data (codes, dates, numbers) is set in the mono face (AC-17). */
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Non-interactive stand-in for a form input: looks like a field, cannot be edited. */
export function PlaceholderField({
  label,
  value,
  placeholder,
  secure = false,
  mono = false,
  style,
  testID,
}: PlaceholderFieldProps) {
  const { tokens } = useTheme();
  const face = mono ? typography.mono : typography.body;
  return (
    <View style={[styles.wrapper, style]}>
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
      <View style={[styles.field, { backgroundColor: tokens.glass, borderColor: tokens.glassBorder }]}>
        <TextInput
          accessibilityLabel={label}
          editable={false}
          secureTextEntry={secure}
          autoCorrect={false}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          placeholderTextColor={tokens.textMuted}
          testID={testID}
          style={[styles.input, face, { color: tokens.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  field: {
    minHeight: MIN_HIT_SIZE,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  input: { paddingVertical: spacing.md },
});
