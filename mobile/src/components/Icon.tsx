import Feather from "@expo/vector-icons/Feather";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { StyleProp, TextStyle } from "react-native";

import { iconSize, useTheme } from "@/lib/theme";

import type { AppTextColor } from "./AppText";
import { ICONS } from "./icons";
import type { IconName } from "./icons";

export type IconColor = AppTextColor | "tabInactive";

export interface IconProps {
  name: IconName;
  /** Token from `iconSize`; default `md`. */
  size?: keyof typeof iconSize;
  /** Token key, resolved against the active theme; default `text`. */
  color?: IconColor;
  style?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * Themed icon. Decorative on purpose: it is hidden from VoiceOver/TalkBack, and
 * the control that contains it carries the accessible name (AC-19).
 */
export function Icon({ name, size = "md", color = "text", style, testID }: IconProps) {
  const { tokens } = useTheme();
  const def = ICONS[name];
  const common = {
    size: iconSize[size],
    color: tokens[color],
    style,
    testID,
    // A glyph is not text: it must not grow with Dynamic Type and break its button.
    allowFontScaling: false,
    accessibilityElementsHidden: true,
    importantForAccessibility: "no-hide-descendants",
  } as const;
  return def.set === "feather" ? (
    <Feather name={def.glyph} {...common} />
  ) : (
    <Ionicons name={def.glyph} {...common} />
  );
}
