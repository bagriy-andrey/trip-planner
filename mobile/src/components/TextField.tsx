import { useEffect, useState } from "react";
import type { Ref } from "react";
import { AccessibilityInfo, StyleSheet, TextInput, View } from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";

import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

import { AppText } from "./AppText";
import { MIN_HIT_SIZE } from "./a11y";

/** Content presets: keyboard, autofill hint, capitalisation and masking for the field's purpose. */
export type TextFieldVariant = "text" | "email" | "password" | "newPassword" | "code";

type InputTraits = Pick<
  TextInputProps,
  | "keyboardType"
  | "textContentType"
  | "autoComplete"
  | "autoCapitalize"
  | "autoCorrect"
  | "secureTextEntry"
>;

const PRESETS: Record<TextFieldVariant, InputTraits> = {
  text: {},
  email: {
    keyboardType: "email-address",
    textContentType: "emailAddress",
    autoComplete: "email",
    autoCapitalize: "none",
    autoCorrect: false,
  },
  password: {
    secureTextEntry: true,
    textContentType: "password",
    autoComplete: "current-password",
    autoCapitalize: "none",
    autoCorrect: false,
  },
  newPassword: {
    secureTextEntry: true,
    textContentType: "newPassword",
    autoComplete: "new-password",
    autoCapitalize: "none",
    autoCorrect: false,
  },
  // A one-time code is NOT ticket data: it stays in the body face, never mono.
  code: {
    keyboardType: "number-pad",
    textContentType: "oneTimeCode",
    autoComplete: "one-time-code",
    autoCapitalize: "none",
    autoCorrect: false,
  },
};

export interface TextFieldProps
  extends InputTraits,
    Pick<
      TextInputProps,
      | "returnKeyType"
      | "onSubmitEditing"
      | "onFocus"
      | "onBlur"
      | "maxLength"
      | "placeholder"
      | "editable"
    > {
  /** Caption above the field; also the spoken name (already translated by the caller). */
  label: string;
  value: string;
  /** Manual typing and autofill (Keychain, SMS code) both arrive here. */
  onChangeText: (text: string) => void;
  /** Field-level error (already translated). Shown under the field in `danger` and spoken with it. */
  errorText?: string;
  /** Preset for keyboard/autofill/masking; explicit props override it. */
  variant?: TextFieldVariant;
  /** Forwarded to the underlying input, e.g. to move focus to the next field. */
  ref?: Ref<TextInput>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Real text input: caption, focus (`accent`) and error (`danger`) borders, and an error that is
 * part of the field's accessible name and is announced when it appears (AC-36, AC-38, AC-40).
 * Holds no UI strings: every text arrives through props.
 */
export function TextField({
  label,
  value,
  onChangeText,
  errorText,
  variant = "text",
  ref,
  style,
  testID,
  editable = true,
  onFocus,
  onBlur,
  keyboardType,
  textContentType,
  autoComplete,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  returnKeyType,
  onSubmitEditing,
  maxLength,
  placeholder,
}: TextFieldProps) {
  const { tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const hasError = errorText !== undefined && errorText !== "";
  const preset = PRESETS[variant];

  // A validation error should be heard the moment it appears, not only when the user swipes
  // back to the field. Fires when the message appears or changes, never on a plain re-render.
  useEffect(() => {
    if (errorText) AccessibilityInfo.announceForAccessibility(errorText);
  }, [errorText]);

  const borderColor = hasError ? tokens.danger : focused ? tokens.accent : tokens.surfaceBorder;

  return (
    <View style={[styles.wrapper, style]}>
      <AppText variant="small" color="textSecondary">
        {label}
      </AppText>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType ?? preset.keyboardType}
        textContentType={textContentType ?? preset.textContentType}
        autoComplete={autoComplete ?? preset.autoComplete}
        autoCapitalize={autoCapitalize ?? preset.autoCapitalize}
        autoCorrect={autoCorrect ?? preset.autoCorrect}
        secureTextEntry={secureTextEntry ?? preset.secureTextEntry}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        maxLength={maxLength}
        placeholder={placeholder}
        placeholderTextColor={tokens.textSecondary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        accessibilityLabel={hasError ? `${label}, ${errorText}` : label}
        accessibilityState={{ disabled: !editable }}
        testID={testID}
        style={[
          styles.input,
          typography.body,
          { color: tokens.text, backgroundColor: tokens.surface, borderColor },
        ]}
      />
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
    minHeight: MIN_HIT_SIZE,
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
});
