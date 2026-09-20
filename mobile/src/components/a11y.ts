// Shared accessibility contract for interactive primitives (AC-19, AC-20).
import type { AccessibilityRole } from "react-native";

/** Minimum touch target on both axes, in points (AC-20). */
export const MIN_HIT_SIZE = 44;

/**
 * Every interactive primitive extends this: the label is REQUIRED so a
 * control without a VoiceOver name is a compile error (AC-19).
 */
export interface AccessibleProps {
  accessibilityLabel: string;
  accessibilityHint?: string;
  testID?: string;
}

export type InteractiveRole = Extract<AccessibilityRole, "button" | "link" | "menuitem" | "tab">;
