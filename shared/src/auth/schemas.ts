import { z } from "zod";
import { AUTH_FIELD_ERROR } from "./errorCodes";

/** Minimum password length (spec: no composition requirements). */
export const PASSWORD_MIN_LENGTH = 8;
/** Maximum display name length, counted in Unicode code points (an emoji counts as one). */
export const DISPLAY_NAME_MAX_LENGTH = 64;
/** One-time code length (digits). */
export const OTP_CODE_LENGTH = 6;

/**
 * Email: normalised (trim + lower case) BEFORE it is validated (pipe), so `" Anna@Example.COM "`
 * is a valid `anna@example.com`. Output is the normalised address.
 */
export const emailSchema = z
  .string({ error: AUTH_FIELD_ERROR.emailInvalid })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: AUTH_FIELD_ERROR.emailInvalid }));

/**
 * Password: deliberately NOT trimmed — leading/trailing spaces are significant characters.
 * Length is counted in UTF-16 code units, matching what the backend receives.
 */
export const passwordSchema = z
  .string({ error: AUTH_FIELD_ERROR.passwordTooShort })
  .min(PASSWORD_MIN_LENGTH, { error: AUTH_FIELD_ERROR.passwordTooShort });

/** Display name: trimmed, non-empty, at most 64 code points. */
export const displayNameSchema = z
  .string({ error: AUTH_FIELD_ERROR.nameEmpty })
  .trim()
  .pipe(
    z
      .string()
      .min(1, { error: AUTH_FIELD_ERROR.nameEmpty })
      .refine((value) => Array.from(value).length <= DISPLAY_NAME_MAX_LENGTH, {
        error: AUTH_FIELD_ERROR.nameTooLong,
      }),
  );

/** One-time code: exactly 6 ASCII digits. Wrong length is reported before wrong characters. */
export const otpCodeSchema = z
  .string({ error: AUTH_FIELD_ERROR.codeLength })
  .length(OTP_CODE_LENGTH, { error: AUTH_FIELD_ERROR.codeLength })
  .regex(/^[0-9]+$/, { error: AUTH_FIELD_ERROR.codeDigits });

/** Sign in (S2). */
export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

/** Sign up (S3). */
export const signUpSchema = z.object({
  name: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
});

/** Request a password reset code (S10). */
export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

/** Confirm reset (S10b): the emailed code plus the new password (email comes from flow state). */
export const newPasswordSchema = z.object({
  code: otpCodeSchema,
  password: passwordSchema,
});

export type Email = z.infer<typeof emailSchema>;
export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type PasswordResetRequestInput = z.input<typeof passwordResetRequestSchema>;
export type PasswordResetRequestValues = z.infer<typeof passwordResetRequestSchema>;
export type NewPasswordInput = z.input<typeof newPasswordSchema>;
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;
