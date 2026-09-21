import { parseAuthForm, signInSchema } from "@tripplanner/shared";
import type { AuthFieldErrorId } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import type { TextInput } from "react-native";

import { AppText, PressableRow, PrimaryButton, Screen, TextField } from "@/components";
import { spacing } from "@/lib/theme";

import { signIn } from "./api";
import type { AuthErrorKind } from "./api";
import { AuthFooterLink } from "./components/AuthFooterLink";
import { AuthFormError } from "./components/AuthFormError";
import { OrDivider } from "./components/OrDivider";
import { SocialAuthButtons } from "./components/SocialAuthButtons";
import { clearSignInPrefill, getSignInPrefill, subscribeSignInPrefill } from "./flowState";
import { useAuthMessages, useAuthSubmit } from "./hooks/useAuthSubmit";

type FieldErrors = Partial<Record<"email" | "password", AuthFieldErrorId>>;

/**
 * S2 — sign in (SPEC-02 AC-14…AC-19). Validates with the shared schema BEFORE any request;
 * wrong credentials never say whether the account exists (AC-16); everything typed survives an
 * error so a retry is one tap (AC-19).
 */
export function SignInScreen() {
  const { t, fieldError, formError } = useAuthMessages();
  const router = useRouter();
  const { isSubmitting, run } = useAuthSubmit();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<AuthErrorKind | null>(null);

  // S3 sends the already-registered address here (AC-13). Navigating back may reuse an S2 that is
  // already mounted OR stack a fresh one, so this listens to changes AND applies on mount; the
  // value is not consumed on read (a second instance must still see it) but dropped when this
  // screen goes away.
  const prefill = useSyncExternalStore(subscribeSignInPrefill, getSignInPrefill);
  useEffect(() => {
    if (prefill === null) return;
    setEmail(prefill);
    setFieldErrors({});
    setFailure(null);
  }, [prefill]);
  useEffect(() => clearSignInPrefill, []);

  const submit = async () => {
    setFailure(null);
    const parsed = parseAuthForm(signInSchema, { email, password });
    if (!parsed.ok) {
      setFieldErrors({
        email: parsed.fieldErrors.email,
        password: parsed.fieldErrors.password,
      });
      return;
    }
    setFieldErrors({});
    const result = await run(() => signIn(parsed.value));
    if (result === undefined) return;
    if (result.ok) {
      clearSignInPrefill();
      router.replace("/trips");
      return;
    }
    setFailure(result.kind);
  };

  return (
    <Screen testID="sign-in-screen" contentStyle={styles.content}>
      <View style={styles.heading}>
        <AppText variant="authTitle" accessibilityRole="header">
          {t("signIn.title")}
        </AppText>
        <AppText color="textSecondary">{t("signIn.subtitle")}</AppText>
      </View>
      <SocialAuthButtons />
      <OrDivider />
      <View style={styles.fields}>
        <TextField
          variant="email"
          label={t("fields.email.label")}
          placeholder={t("fields.email.placeholder")}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setFieldErrors((errors) => ({ ...errors, email: undefined }));
          }}
          errorText={fieldError(fieldErrors.email)}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          testID="sign-in-email"
        />
        <TextField
          ref={passwordRef}
          variant="password"
          label={t("fields.password.label")}
          placeholder={t("fields.password.placeholder")}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setFieldErrors((errors) => ({ ...errors, password: undefined }));
          }}
          errorText={fieldError(fieldErrors.password)}
          returnKeyType="go"
          onSubmitEditing={() => void submit()}
          testID="sign-in-password"
        />
        <PressableRow
          accessibilityRole="link"
          accessibilityLabel={t("signIn.forgotPassword")}
          onPress={() => router.push("/forgot-password")}
          style={styles.forgot}
          testID="sign-in-forgot"
        >
          <AppText color="textSecondary">{t("signIn.forgotPassword")}</AppText>
        </PressableRow>
      </View>
      <View style={styles.submitBlock}>
        <AuthFormError message={failure === null ? undefined : formError(failure)} testID="sign-in-error" />
        <PrimaryButton
          label={t("signIn.submit")}
          accessibilityLabel={t("signIn.submit")}
          onPress={() => void submit()}
          loading={isSubmitting}
          testID="sign-in-submit"
        />
      </View>
      <AuthFooterLink
        prompt={t("signIn.noAccountPrompt")}
        linkLabel={t("signIn.createLink")}
        onPress={() => router.navigate("/sign-up")}
        testID="sign-in-create"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  heading: { gap: spacing.sm },
  fields: { gap: spacing.md },
  forgot: { alignSelf: "flex-end" },
  submitBlock: { gap: spacing.md },
});
