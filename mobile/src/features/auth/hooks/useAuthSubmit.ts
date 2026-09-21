import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthFieldErrorId } from "@tripplanner/shared";

import { useTranslation } from "@/lib/i18n";

import type { AuthErrorKind } from "../api";

/**
 * Single-flight submit for the auth forms (SPEC-02 AC-14, AC-19).
 *
 * `run(task)` starts the task unless one is already in flight: a double or triple tap yields
 * exactly one call (the guard is a ref, so it holds even before React re-renders the disabled
 * button). It returns the task's result, or `undefined` when the tap was ignored. When the task
 * ends, the form is submittable again — the caller keeps the typed values on failure, so a retry
 * is one tap. `isSubmitting` drives the in-button spinner.
 */
export function useAuthSubmit() {
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async <T>(task: () => Promise<T>): Promise<T | undefined> => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setIsSubmitting(true);
    try {
      return await task();
    } finally {
      inFlight.current = false;
      if (mounted.current) setIsSubmitting(false);
    }
  }, []);

  return { isSubmitting, run };
}

/** Which of the two "too many requests" texts a screen wants (sign-in/up vs. the emailed code). */
export type RateLimitedText = "rateLimited" | "emailRateLimited";

/**
 * Localised texts for the closed sets the api and the shared schemas answer with. An id / kind
 * is looked up in OUR strings; server text never reaches the user (AC-37).
 */
export function useAuthMessages() {
  const { t } = useTranslation("auth");
  const { t: tCommon } = useTranslation("common");
  const backLabel = tCommon("actions.back");

  const fieldError = useCallback(
    (id: AuthFieldErrorId | undefined): string | undefined =>
      id === undefined ? undefined : t(`validation.${id}`),
    [t],
  );

  /** Errors that belong to no single field: shown as one line above the submit button (AC-36). */
  const formError = useCallback(
    (kind: AuthErrorKind, rateLimitedText: RateLimitedText = "rateLimited"): string => {
      switch (kind) {
        case "invalidCredentials":
          return t("errors.invalidCredentials");
        case "rateLimited":
          return t(`errors.${rateLimitedText}`);
        case "offline":
          return t("errors.offline");
        case "emailExists":
        case "weakPassword":
        case "otpInvalidOrExpired":
        case "samePassword":
        case "unknown":
          return t("errors.unknown");
      }
    },
    [t],
  );

  return { t, backLabel, fieldError, formError };
}
