import { StyleSheet, View } from "react-native";
import { findPlaceById } from "@tripplanner/shared";
import type { RouteGap } from "@tripplanner/shared";

import { AppText, Icon } from "@/components";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
// `formatDuration`/`formatStopoverDays` are not re-exported by `lib/i18n`'s barrel (a step-4 gap
// found while building this component) — imported straight from their module, same file they live
// in already (`lib/i18n/format.ts`).
import { formatDuration, formatStopoverDays } from "@/lib/i18n/format";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

export interface GapRowProps {
  gap: RouteGap;
  locale: Locale;
  testID?: string;
}

/**
 * The pause between two chain segments (AC-65, design/screens/route.md "Цепочка"): an ordinary
 * layover (clock icon, `textSecondary`), a RISKY layover (same text plus a `warnBg`/`warnBorder`
 * chip carrying the WORD "рискованно"/"risky" — colour is never the only signal, AGENTS.md), or a
 * stopover (bed icon). `buildRoute` (`@tripplanner/shared`) has already decided the kind, duration
 * and day span; this only renders them (AC-62: no threshold or airport-code comparison here). A
 * stopover whose gap does not cross a calendar day boundary (AC-53: "11 h within the same day ->
 * hours") has no `days` from `buildRoute` — that edge case is rendered as duration + city rather
 * than invented as "0 days".
 */
export function GapRow({ gap, locale, testID }: GapRowProps) {
  const { t } = useTranslation("transport");
  const { tokens } = useTheme();
  const cityName = gap.cityId === undefined ? "" : (findPlaceById(gap.cityId)?.[locale] ?? gap.cityId);

  if (gap.kind === "stopover") {
    const text =
      gap.days === undefined
        ? `${formatDuration(locale, gap.durationMs)} · ${cityName}`
        : formatStopoverDays(locale, gap.days, cityName);
    return (
      <View accessible accessibilityLabel={text} testID={testID} style={styles.row}>
        <Icon name="bed" size="sm" color="textSecondary" />
        <AppText color="textSecondary">{text}</AppText>
      </View>
    );
  }

  const duration = formatDuration(locale, gap.durationMs);
  const layoverText = t("gap.layover", { duration });

  if (gap.risky) {
    const riskyWord = t("gap.risky");
    return (
      <View
        accessible
        accessibilityLabel={`${layoverText}, ${riskyWord}`}
        testID={testID}
        style={[styles.chip, { backgroundColor: tokens.warnBg, borderColor: tokens.warnBorder }]}
      >
        <Icon name="clock" size="sm" color="text" />
        <AppText>{layoverText}</AppText>
        <AppText color="textSecondary">{riskyWord}</AppText>
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={layoverText} testID={testID} style={styles.row}>
      <Icon name="clock" size="sm" color="textSecondary" />
      <AppText color="textSecondary">{layoverText}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: layout.minTouch,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: layout.dashBorderWidth,
  },
});
