import { newPasswordSchema, OTP_CODE_LENGTH, parseAuthForm } from "@tripplanner/shared";
import type { AuthFieldErrorId } from "@tripplanner/shared";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { TextInput } from "react-native";

import { AppText, PressableRow, PrimaryButton, Screen, TextField } from "@/components";
import { useSession } from "@/lib/session";
import { spacing } from "@/lib/theme";

import {
  requestPasswordReset,
  signOut,
  updatePassword,
  verifyRecoveryCodeAndSetPassword,
} from "./api";
import type { AuthErrorKind } from "./api";
import { AuthFormError } from "./components/AuthFormError";
import { clearResetFlow, getResetFlow } from "./flowState";
import { useAuthMessages, useAuthSubmit } from "./hooks/useAuthSubmit";
import { useResendCountdown } from "./hooks/useResendCountdown";

type Attempt = { ok: true } | { ok: false; kind: AuthErrorKind; codeAccepted: boolean };
type Failure = { kind: AuthErrorKind; source: "submit" | "resend" };

/** Pasted codes often carry spaces ("123 456"); the schema does not trim, so the screen does. */
function stripCode(raw: string): string {
  return raw.replace(/\s+/g, "");
}

/**
 * S10b — password recovery, step 2 (SPEC-02 AC-29…AC-35, AC-37, AC-39): the emailed code plus the
 * new password.
 *
 * The code and the new password live ONLY in this component's state: they are not route params,
 * not stored, not logged, and vanish when the screen unmounts. The address comes from the flow
 * state (S10) and is shown read-only.
 *
 * Gating hold (see `SessionContextValue.holdGating`): verifying the code opens a real session
 * before the password is set. The hold keeps the route guard from bouncing this screen to /trips
 * meanwhile, so a `samePassword` answer can still be shown here. It is released once the password
 * is set (gating then sends the user to /trips, AC-30), and when the screen goes away. If the code
 * was accepted but the password was never set and the user leaves, the half-open recovery session
 * is signed out: nobody is left signed in without having chosen a password.
 */
export function ResetPasswordScreen() {
  const { t, backLabel, fieldError, formError } = useAuthMessages();
  const router = useRouter();
  const { holdGating } = useSession();
  const submitting = useAuthSubmit();
  const resending = useAuthSubmit();
  const passwordRef = useRef<TextInput>(null);

  const [flow] = useState(getResetFlow);
  const countdown = useResendCountdown(flow?.requestedAt ?? null);

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<"code" | "password", AuthFieldErrorId>>
  >({});
  const [codeRejected, setCodeRejected] = useState(false);
  const [passwordRejection, setPasswordRejection] = useState<"samePassword" | "weakPassword" | null>(
    null,
  );
  const [failure, setFailure] = useState<Failure | null>(null);
  // The code was consumed but the password is not set yet: retries go through `updatePassword`.
  const [codeAccepted, setCodeAccepted] = useState(false);

  const releaseRef = useRef<(() => void) | null>(null);
  const acceptedRef = useRef(false);
  const aliveRef = useRef(true);

  const acquireHold = () => {
    releaseRef.current ??= holdGating();
  };
  const releaseHold = () => {
    const release = releaseRef.current;
    releaseRef.current = null;
    release?.();
  };
  /** Leaving the flow: never leave a code-accepted, password-less session open. */
  const abandon = () => {
    const release = releaseRef.current;
    releaseRef.current = null;
    if (acceptedRef.current) {
      acceptedRef.current = false;
      // Keep the hold until the recovery session is really gone, or gating would flash /trips.
      void signOut().then(() => release?.());
    } else {
      release?.();
    }
  };

  const abandonRef = useRef(abandon);
  abandonRef.current = abandon;
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      clearResetFlow();
      abandonRef.current();
    };
  }, []);

  // A cold link to /reset-password has no address (it is never in the URL, AC-39): back to step 1.
  useEffect(() => {
    if (flow === null) router.replace("/forgot-password");
  }, [flow, router]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/forgot-password");
  };

  const strippedCode = stripCode(code);
  const canSubmit = strippedCode.length >= OTP_CODE_LENGTH;

  const submit = async () => {
    if (flow === null || !canSubmit) return;
    setFailure(null);
    const parsed = parseAuthForm(newPasswordSchema, { code: strippedCode, password });
    if (!parsed.ok) {
      setFieldErrors({ code: parsed.fieldErrors.code, password: parsed.fieldErrors.password });
      return;
    }
    setFieldErrors({});
    setCodeRejected(false);
    setPasswordRejection(null);

    const { code: validCode, password: validPassword } = parsed.value;
    const attempt = await submitting.run(async (): Promise<Attempt> => {
      acquireHold();
      if (acceptedRef.current) {
        // The code is single-use and already spent: only the password step is repeated.
        const updated = await updatePassword(validPassword);
        return updated.ok ? updated : { ...updated, codeAccepted: true };
      }
      const verified = await verifyRecoveryCodeAndSetPassword({
        email: flow.email,
        code: validCode,
        password: validPassword,
      });
      return verified.ok ? { ok: true } : verified;
    });
    if (attempt === undefined) return;

    if (attempt.ok) {
      acceptedRef.current = false;
      // Gating re-evaluates on release: with the session in place it opens /trips (AC-30).
      releaseHold();
      return;
    }
    if (attempt.codeAccepted) {
      acceptedRef.current = true;
      if (aliveRef.current) setCodeAccepted(true);
    } else {
      releaseHold();
    }
    if (!aliveRef.current) {
      abandon();
      return;
    }

    switch (attempt.kind) {
      case "otpInvalidOrExpired":
        // A wrong and an expired code look the same to the server (AC-31); so do they to the user.
        if (attempt.codeAccepted) setFailure({ kind: "unknown", source: "submit" });
        else setCodeRejected(true);
        return;
      case "samePassword":
      case "weakPassword":
        setPasswordRejection(attempt.kind);
        return;
      default:
        setFailure({ kind: attempt.kind, source: "submit" });
    }
  };

  const resend = async () => {
    if (flow === null || countdown.isLocked || codeAccepted) return;
    setFailure(null);
    const result = await resending.run(() => requestPasswordReset({ email: flow.email }));
    if (result === undefined) return;
    if (!result.ok) {
      setFailure({ kind: result.kind, source: "resend" });
      return;
    }
    countdown.start();
    setCode("");
    setCodeRejected(false);
    setFieldErrors((errors) => ({ ...errors, code: undefined }));
  };

  if (flow === null) return null;

  const codeError = codeRejected ? t("errors.otpInvalidOrExpired") : fieldError(fieldErrors.code);
  const passwordError =
    passwordRejection !== null ? t(`errors.${passwordRejection}`) : fieldError(fieldErrors.password);
  const failureText =
    failure === null
      ? undefined
      : formError(failure.kind, failure.source === "resend" ? "emailRateLimited" : "rateLimited");

  return (
    <Screen testID="reset-password-screen" contentStyle={styles.content}>
      <PressableRow
        accessibilityLabel={backLabel}
        onPress={goBack}
        style={styles.back}
        testID="reset-password-back"
      >
        <AppText color="accent">{backLabel}</AppText>
      </PressableRow>
      <View style={styles.heading}>
        <AppText variant="authTitle" accessibilityRole="header">
          {t("resetPassword.title")}
        </AppText>
        <AppText color="textSecondary" testID="reset-password-notice">
          {t("resetPassword.notice")}
        </AppText>
      </View>
      <View style={styles.fields}>
        <TextField
          variant="email"
          label={t("fields.email.label")}
          value={flow.email}
          onChangeText={() => undefined}
          editable={false}
          testID="reset-password-email"
        />
        <View style={styles.codeBlock}>
          <TextField
            variant="code"
            label={t("fields.code.label")}
            placeholder={t("fields.code.placeholder")}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setCodeRejected(false);
              setFieldErrors((errors) => ({ ...errors, code: undefined }));
            }}
            errorText={codeError}
            editable={!codeAccepted}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="reset-password-code"
          />
          <PressableRow
            accessibilityRole="button"
            accessibilityLabel={
              countdown.isLocked
                ? t("resetPassword.resendIn", { seconds: countdown.remaining })
                : t("resetPassword.resend")
            }
            onPress={() => void resend()}
            disabled={countdown.isLocked || codeAccepted}
            style={styles.resend}
            testID="reset-password-resend"
          >
            <AppText color={countdown.isLocked || codeAccepted ? "textTertiary" : "accent"} variant="button">
              {countdown.isLocked
                ? t("resetPassword.resendIn", { seconds: countdown.remaining })
                : t("resetPassword.resend")}
            </AppText>
          </PressableRow>
        </View>
        <View style={styles.passwordBlock}>
          <TextField
            ref={passwordRef}
            variant="newPassword"
            label={t("fields.newPassword.label")}
            placeholder={t("fields.newPassword.placeholder")}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setPasswordRejection(null);
              setFieldErrors((errors) => ({ ...errors, password: undefined }));
            }}
            errorText={passwordError}
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            testID="reset-password-password"
          />
          {passwordError === undefined ? (
            <AppText variant="small" color="textSecondary">
              {t("fields.password.hint")}
            </AppText>
          ) : null}
        </View>
      </View>
      <View style={styles.submitBlock}>
        <AuthFormError message={failureText} testID="reset-password-error" />
        <PrimaryButton
          label={t("resetPassword.submit")}
          accessibilityLabel={t("resetPassword.submit")}
          onPress={() => void submit()}
          disabled={!canSubmit}
          loading={submitting.isSubmitting}
          testID="reset-password-submit"
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingVertical: spacing.xl },
  back: { alignSelf: "flex-start" },
  heading: { gap: spacing.sm },
  fields: { gap: spacing.md },
  codeBlock: { gap: spacing.xs },
  passwordBlock: { gap: spacing.xs },
  resend: { alignSelf: "flex-start" },
  submitBlock: { gap: spacing.md },
});
