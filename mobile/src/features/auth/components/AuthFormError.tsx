import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

import { AppText } from "@/components";

export interface AuthFormErrorProps {
  /** Already translated; nothing (no space either) is rendered when empty. */
  message?: string;
  testID?: string;
}

/**
 * The one line above the submit button for errors that belong to no single field — connection,
 * rate limit, wrong credentials, unknown (SPEC-02 AC-36). It is an alert and is announced the
 * moment it appears, like a field error (AC-40). Never a system alert or a modal.
 */
export function AuthFormError({ message, testID }: AuthFormErrorProps) {
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  if (!message) return null;
  return (
    <AppText color="danger" variant="small" accessibilityRole="alert" testID={testID}>
      {message}
    </AppText>
  );
}
