import { StyleSheet, TextInput, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

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
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View style={[styles.field, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}>
        <TextInput
          accessibilityLabel={label}
          editable={false}
          secureTextEntry={secure}
          autoCorrect={false}
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          placeholderTextColor={tokens.textSecondary}
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
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  input: { paddingVertical: spacing.md },
});
