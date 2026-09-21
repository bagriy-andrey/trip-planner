import { emailSchema, parseAuthForm, signUpSchema } from "@tripplanner/shared";
import type { AuthFieldErrorId } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { TextInput } from "react-native";

import { AppText, PressableRow, PrimaryButton, Screen, TextField } from "@/components";
import { spacing } from "@/lib/theme";

import { signUp } from "./api";
import type { AuthErrorKind } from "./api";
import { AuthFooterLink } from "./components/AuthFooterLink";
import { AuthFormError } from "./components/AuthFormError";
import { ConsentText } from "./components/ConsentText";
import { OrDivider } from "./components/OrDivider";
import { SocialAuthButtons } from "./components/SocialAuthButtons";
import { setSignInPrefill } from "./flowState";
import { useAuthMessages, useAuthSubmit } from "./hooks/useAuthSubmit";

type Field = "name" | "email" | "password";
type FieldErrors = Partial<Record<Field, AuthFieldErrorId>>;

/**
 * S3 — sign up (SPEC-02 AC-10…AC-14). The shared schema validates name, email and password
 * BEFORE any request (AC-12). Success opens `/trips` on the session the account came with
 * (email confirmation is off).
 */
export function SignUpScreen() {
  const { t, fieldError, formError } = useAuthMessages();
  const router = useRouter();
  const { isSubmitting, run } = useAuthSubmit();
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  // Answers from the server that belong to a field, kept apart from the schema's ids.
  const [emailTaken, setEmailTaken] = useState(false);
  const [weakPassword, setWeakPassword] = useState(false);
  const [failure, setFailure] = useState<AuthErrorKind | null>(null);

  const clearField = (field: Field) => {
    setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
    if (field === "email") setEmailTaken(false);
    if (field === "password") setWeakPassword(false);
  };

  const submit = async () => {
    setFailure(null);
    const parsed = parseAuthForm(signUpSchema, { name, email, password });
    if (!parsed.ok) {
      setFieldErrors({
        name: parsed.fieldErrors.name,
        email: parsed.fieldErrors.email,
        password: parsed.fieldErrors.password,
      });
      return;
    }
    setFieldErrors({});
    setEmailTaken(false);
    setWeakPassword(false);
    const result = await run(() => signUp(parsed.value));
    if (result === undefined) return;
    if (result.ok) {
      router.replace("/trips");
      return;
    }
    if (result.kind === "emailExists") setEmailTaken(true);
    else if (result.kind === "weakPassword") setWeakPassword(true);
    else setFailure(result.kind);
  };

  const goToSignIn = () => {
    // The typed email travels through the flow state, not a route param (AC-13, AC-39).
    const normalised = emailSchema.safeParse(email);
    if (normalised.success) setSignInPrefill(normalised.data);
    router.navigate("/sign-in");
  };

  const passwordError = weakPassword ? t("errors.weakPassword") : fieldError(fieldErrors.password);

  return (
    <Screen testID="sign-up-screen" contentStyle={styles.content}>
      <View style={styles.heading}>
        <AppText variant="authTitle" accessibilityRole="header">
          {t("signUp.title")}
        </AppText>
        <AppText color="textSecondary">{t("signUp.subtitle")}</AppText>
      </View>
      <SocialAuthButtons />
      <OrDivider />
      <View style={styles.fields}>
        <TextField
          variant="text"
          label={t("fields.name.label")}
          placeholder={t("fields.name.placeholder")}
          value={name}
          onChangeText={(text) => {
            setName(text);
            clearField("name");
          }}
          errorText={fieldError(fieldErrors.name)}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          testID="sign-up-name"
        />
        <View style={styles.emailBlock}>
          <TextField
            ref={emailRef}
            variant="email"
            label={t("fields.email.label")}
            placeholder={t("fields.email.placeholder")}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              clearField("email");
            }}
            errorText={emailTaken ? t("errors.emailExists") : fieldError(fieldErrors.email)}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="sign-up-email"
          />
          {emailTaken ? (
            <PressableRow
              accessibilityRole="link"
              accessibilityLabel={t("signUp.emailExistsAction")}
              onPress={goToSignIn}
              style={styles.existsAction}
              testID="sign-up-exists-signin"
            >
              <AppText color="accent" variant="button">
                {t("signUp.emailExistsAction")}
              </AppText>
            </PressableRow>
          ) : null}
        </View>
        <View style={styles.passwordBlock}>
          <TextField
            ref={passwordRef}
            variant="newPassword"
            label={t("fields.password.label")}
            placeholder={t("fields.password.placeholder")}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              clearField("password");
            }}
            errorText={passwordError}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            testID="sign-up-password"
          />
          {passwordError === undefined ? (
            <AppText variant="small" color="textSecondary">
              {t("fields.password.hint")}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.submitBlock}>
        <AuthFormError message={failure === null ? undefined : formError(failure)} testID="sign-up-error" />
        <PrimaryButton
          label={t("signUp.submit")}
          accessibilityLabel={t("signUp.submit")}
          onPress={() => void submit()}
          loading={isSubmitting}
          testID="sign-up-submit"
        />
      </View>
      <ConsentText
        onTermsPress={() => router.push("/legal/terms")}
        onPrivacyPress={() => router.push("/legal/privacy")}
      />
      <AuthFooterLink
        prompt={t("signUp.hasAccountPrompt")}
        linkLabel={t("signUp.signInLink")}
        onPress={() => router.navigate("/sign-in")}
        testID="sign-up-signin"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  heading: { gap: spacing.sm },
  fields: { gap: spacing.md },
  emailBlock: { gap: spacing.xs },
  passwordBlock: { gap: spacing.xs },
  existsAction: { alignSelf: "flex-start" },
  submitBlock: { gap: spacing.md },
});
