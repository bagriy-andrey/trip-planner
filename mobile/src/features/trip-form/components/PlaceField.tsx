import { useEffect, useRef } from "react";
import { AccessibilityInfo, StyleSheet, TextInput, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

export interface PlaceFieldProps {
  /** Caption above the field; also its spoken name (already translated). */
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  /** Spoken name of the clear button (already translated). */
  clearLabel: string;
  /** A directory place is picked: accent border. */
  selected: boolean;
  /** Field-level error (already translated). */
  errorText?: string;
  /** Focus on mount, keyboard open (AC-28). */
  autoFocus?: boolean;
  testID?: string;
}

/** Height of the clear button's visible circle; the touch target stays `layout.minTouch`. */
const CLEAR_VISIBLE = layout.iconTile;

/**
 * The "where to" field: pin icon, text input and a clear button once something is typed. The
 * border is `accent` only while a directory place is picked (AC-51), `danger` on error.
 * Deliberately not `TextField`: that primitive has neither the leading icon nor `autoFocus`.
 */
export function PlaceField({
  label,
  placeholder,
  value,
  onChangeText,
  onClear,
  clearLabel,
  selected,
  errorText,
  autoFocus = false,
  testID,
}: PlaceFieldProps) {
  const { tokens } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const hasError = errorText !== undefined && errorText !== "";

  useEffect(() => {
    if (errorText) AccessibilityInfo.announceForAccessibility(errorText);
  }, [errorText]);

  const borderColor = hasError
    ? tokens.danger
    : selected
      ? tokens.accent
      : tokens.surfaceBorder;

  return (
    <View style={styles.wrapper}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View
        testID={testID ? `${testID}-frame` : undefined}
        style={[styles.frame, { backgroundColor: tokens.surface, borderColor }]}
      >
        <Icon name="pin" color={selected ? "accent" : "textSecondary"} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.textSecondary}
          autoFocus={autoFocus}
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel={hasError ? `${label}, ${errorText}` : label}
          testID={testID}
          style={[styles.input, typography.body, { color: tokens.text }]}
        />
        {value !== "" ? (
          <IconButton
            filled={false}
            size={CLEAR_VISIBLE}
            accessibilityLabel={clearLabel}
            testID={testID ? `${testID}-clear` : undefined}
            onPress={() => {
              onClear();
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" color="textSecondary" />
          </IconButton>
        ) : null}
      </View>
      {hasError ? (
        <AppText variant="small" color="danger" accessibilityRole="alert">
          {errorText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  frame: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    paddingLeft: spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: layout.minTouch,
    paddingVertical: spacing.md,
  },
});
