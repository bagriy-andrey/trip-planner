import { parseAuthForm, passwordResetRequestSchema } from "@tripplanner/shared";
import type { AuthFieldErrorId } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet } from "react-native";

import { AppText, PressableRow, PrimaryButton, Screen, TextField } from "@/components";
import { spacing } from "@/lib/theme";

import { requestPasswordReset } from "./api";
import type { AuthErrorKind } from "./api";
import { AuthFormError } from "./components/AuthFormError";
import { startResetFlow } from "./flowState";
import { useAuthMessages, useAuthSubmit } from "./hooks/useAuthSubmit";

/**
 * S10 — password recovery, step 1 (SPEC-02 AC-28, AC-34). A success moves to S10b with the same
 * neutral text whether or not the address is registered; the email travels via the flow state,
 * never a route param (AC-39).
 */
export function ForgotPasswordScreen() {
  const { t, backLabel, fieldError, formError } = useAuthMessages();
  const router = useRouter();
  const { isSubmitting, run } = useAuthSubmit();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<AuthFieldErrorId | undefined>(undefined);
  const [failure, setFailure] = useState<AuthErrorKind | null>(null);

  // S10 is normally pushed from S2, so `back()` lands on it. A cold deep link has
  // no history: fall back to S2 explicitly instead of doing nothing.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/sign-in");
  };

  const submit = async () => {
    setFailure(null);
    const parsed = parseAuthForm(passwordResetRequestSchema, { email });
    if (!parsed.ok) {
      setEmailError(parsed.fieldErrors.email);
      return;
    }
    setEmailError(undefined);
    const result = await run(() => requestPasswordReset(parsed.value));
    if (result === undefined) return;
    if (!result.ok) {
      // Rate limit is not a mistake in what was typed (AC-34): a form line, not a field error.
      setFailure(result.kind);
      return;
    }
    startResetFlow(parsed.value.email);
    router.push("/reset-password");
  };

  return (
    <Screen testID="forgot-password-screen" contentStyle={styles.content}>
      <PressableRow
        accessibilityLabel={backLabel}
        onPress={goBack}
        style={styles.back}
        testID="forgot-password-back"
      >
        <AppText color="accent">{backLabel}</AppText>
      </PressableRow>
      <AppText variant="authTitle" accessibilityRole="header">
        {t("forgotPassword.title")}
      </AppText>
      <AppText color="textSecondary">{t("forgotPassword.description")}</AppText>
      <TextField
        variant="email"
        label={t("fields.email.label")}
        placeholder={t("fields.email.placeholder")}
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setEmailError(undefined);
        }}
        errorText={fieldError(emailError)}
        returnKeyType="go"
        onSubmitEditing={() => void submit()}
        testID="forgot-password-email"
      />
      <AuthFormError
        message={failure === null ? undefined : formError(failure, "emailRateLimited")}
        testID="forgot-password-error"
      />
      <PrimaryButton
        label={t("forgotPassword.submit")}
        accessibilityLabel={t("forgotPassword.submit")}
        onPress={() => void submit()}
        loading={isSubmitting}
        testID="forgot-password-submit"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  back: { alignSelf: "flex-start" },
});
