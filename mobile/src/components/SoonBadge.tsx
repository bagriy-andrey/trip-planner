import type { StyleProp, ViewStyle } from "react-native";

import { useTranslation } from "@/lib/i18n";

import { Pill } from "./Pill";

/** The single "not built yet" marker for stubbed controls (Q7). Text is the shared `common:soon` key. */
export function SoonBadge({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useTranslation();
  return <Pill tone="muted" label={t("soon")} accessibilityLabel={t("a11y.soonHint")} style={style} />;
}
