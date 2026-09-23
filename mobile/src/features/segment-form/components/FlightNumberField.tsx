import { useEffect } from "react";
import { AccessibilityInfo, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components";
import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

export type FlightNumberCarrierInfo =
  | { kind: "empty" }
  | { kind: "recognized"; name: string }
  | { kind: "unrecognized" };

export interface FlightNumberFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  carrier: FlightNumberCarrierInfo;
  /** "{{name}} — from the directory, offline" (already translated, `{{name}}` filled in). */
  recognizedText: (name: string) => string;
  /** "Airline not recognized" (already translated). */
  unrecognizedText: string;
  errorText?: string;
  testID?: string;
}

/**
 * The form's first field (design/screens/add-flight.md): a mono text input whose border turns
 * `accent` the moment the typed code resolves to a known carrier (AC-24), with a line underneath —
 * the recognized name ("… — offline") or a neutral "not recognized" line (AC-23). No network call:
 * recognition is a pure lookup (`parseFlightNumber`/`findAirline`, `@tripplanner/shared`) the
 * caller already ran.
 */
export function FlightNumberField({
  label,
  value,
  onChangeText,
  carrier,
  recognizedText,
  unrecognizedText,
  errorText,
  testID,
}: FlightNumberFieldProps) {
  const { tokens } = useTheme();
  const hasError = errorText !== undefined && errorText !== "";
  const recognized = carrier.kind === "recognized";

  useEffect(() => {
    if (errorText) AccessibilityInfo.announceForAccessibility(errorText);
  }, [errorText]);

  const borderColor = hasError ? tokens.danger : recognized ? tokens.accent : tokens.surfaceBorder;

  return (
    <View style={styles.wrapper}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="done"
        accessibilityLabel={hasError ? `${label}, ${errorText}` : label}
        testID={testID}
        style={[
          styles.input,
          typography.mono,
          { color: tokens.text, backgroundColor: tokens.surface, borderColor },
        ]}
      />
      {carrier.kind === "recognized" ? (
        <AppText variant="small" color="accent" testID={testID ? `${testID}-carrier` : undefined}>
          {recognizedText(carrier.name)}
        </AppText>
      ) : carrier.kind === "unrecognized" ? (
        <AppText variant="small" color="textSecondary" testID={testID ? `${testID}-carrier` : undefined}>
          {unrecognizedText}
        </AppText>
      ) : null}
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
  input: {
    minHeight: layout.minTouch,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
