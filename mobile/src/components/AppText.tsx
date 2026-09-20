import { Text } from "react-native";
import type { TextProps } from "react-native";

import { typography, useTheme } from "@/lib/theme";
import type { TypographyRole } from "@/lib/theme";

export type AppTextColor =
  | "text"
  | "textSecondary"
  | "textTertiary"
  | "accent"
  | "onAccent"
  | "danger"
  | "invertedPillText";

// `allowFontScaling` is omitted from the props on purpose: text always follows
// Dynamic Type (AC-21). Layout must adapt, the text must not opt out.
export interface AppTextProps extends Omit<TextProps, "allowFontScaling"> {
  /** Typography role; `mono*` roles are for ticket data only (AC-17). */
  variant?: TypographyRole;
  /** Token key, resolved against the active theme. */
  color?: AppTextColor;
}

export function AppText({ variant = "body", color = "text", style, ...rest }: AppTextProps) {
  const { tokens } = useTheme();
  return <Text {...rest} style={[typography[variant], { color: tokens[color] }, style]} />;
}
