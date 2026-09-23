import { useEffect, useRef } from "react";
import { AccessibilityInfo, StyleSheet, TextInput, View } from "react-native";

import { AppText, Icon, IconButton } from "@/components";
import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

export interface AirportFieldProps {
  label: string;
  placeholder: string;
  /** What the input shows: a directory pick's display text, or whatever the user is typing. */
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  clearLabel: string;
  /** A directory record is picked (accent border); typing anything clears this (AC-33). */
  selected: boolean;
  /** "Choose an airport from the list; you can search by code" — shown for non-empty free text
   * that isn't a directory pick (AC-34), e.g. "Козятин"/"Kozyatin". */
  notInDirectoryText: string;
  /** Field-level error from the schema (already translated); takes priority when present. */
  errorText?: string;
  testID?: string;
}

/**
 * "Откуда"/"Куда": a searchable text field whose only valid VALUE is a selected `AirportRecord`
 * (AC-33) — free text is never treated as filled, whatever it says. Mirrors `trip-form`'s
 * `PlaceField` (same accent-on-pick / clear-button shape), generalized to airports.
 */
export function AirportField({
  label,
  placeholder,
  value,
  onChangeText,
  onClear,
  clearLabel,
  selected,
  notInDirectoryText,
  errorText,
  testID,
}: AirportFieldProps) {
  const { tokens } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const hasError = errorText !== undefined && errorText !== "";
  const showNotInDirectory = !hasError && !selected && value.trim() !== "";
  const hintText = hasError ? errorText : showNotInDirectory ? notInDirectoryText : undefined;

  useEffect(() => {
    if (hintText) AccessibilityInfo.announceForAccessibility(hintText);
  }, [hintText]);

  const borderColor = hasError ? tokens.danger : selected ? tokens.accent : tokens.surfaceBorder;

  return (
    <View style={styles.wrapper}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <View
        testID={testID ? `${testID}-frame` : undefined}
        style={[styles.frame, { backgroundColor: tokens.surface, borderColor }]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={tokens.textSecondary}
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel={hintText === undefined ? label : `${label}, ${hintText}`}
          testID={testID}
          style={[styles.input, typography.body, { color: tokens.text }]}
        />
        {value !== "" ? (
          <IconButton
            filled={false}
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
      {hintText === undefined ? null : (
        <AppText
          variant="small"
          color="danger"
          accessibilityRole={hasError ? "alert" : undefined}
        >
          {hintText}
        </AppText>
      )}
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
