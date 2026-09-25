import { StyleSheet, View } from "react-native";
import { findPlaceById } from "@tripplanner/shared";
import type { RouteView, Segment } from "@tripplanner/shared";

import { AppText, GlassSurface, Icon, Pill, PressableRow } from "@/components";
import { placeLanguageOf, useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
// `formatSegmentDateTime` is not re-exported by `lib/i18n`'s barrel (a step-4 gap found while
// building this component) — imported straight from its module.
import { formatSegmentDateTime } from "@/lib/i18n/format";
import { radius, spacing, useTheme } from "@/lib/theme";

export interface TransportBlockProps {
  route: RouteView;
  locale: Locale;
  /** A segment card was tapped; reports its id (opens the edit form). */
  onSegmentPress: (segmentId: string) => void;
  /** The summary row or the "not closed" banner was tapped; both lead to the route screen (S13). */
  onOpenRoute: () => void;
  testID?: string;
}

/**
 * S7's "Транспорт" block CONTENT (AC-71..73, design/screens/trip-detail.md "Блок «Транспорт»"):
 * one full card per segment in departure order (codes, both times, baggage/passenger chips), a
 * one-line route summary, and the "route not closed" banner when it applies. The layovers and
 * gaps between cards live only on the route screen (`RouteChain`). Deliberately does NOT render the "Транспорт" title / "+" header: that's the
 * generic booking-section chrome Step 10 already owns in `features/trip-detail`. Returns `null`
 * when there is nothing to show (no segments) — the caller falls back to the empty block, like
 * every other S7 section.
 */
export function TransportBlock({ route, locale, onSegmentPress, onOpenRoute, testID }: TransportBlockProps) {
  if (route.chain.length === 0) return null;

  return (
    <View testID={testID} style={styles.root}>
      {route.chain.map((node) => (
        <SegmentCard
          key={node.segment.id}
          segment={node.segment}
          locale={locale}
          onPress={onSegmentPress}
          testID={testID === undefined ? undefined : `${testID}-segment-${node.segment.id}`}
        />
      ))}
      <RouteSummaryRow
        route={route}
        onPress={onOpenRoute}
        testID={testID === undefined ? undefined : `${testID}-summary`}
      />
      {route.closed || route.openAt === undefined ? null : (
        <NotClosedBanner
          cityId={route.openAt.cityId}
          locale={locale}
          onPress={onOpenRoute}
          testID={testID === undefined ? undefined : `${testID}-not-closed`}
        />
      )}
    </View>
  );
}

interface SegmentCardProps {
  segment: Segment;
  locale: Locale;
  onPress: (segmentId: string) => void;
  testID?: string;
}

/** design/screens/trip-detail.md "Карточка записи" (Рейс variant): codes, both times, two chips. */
function SegmentCard({ segment, locale, onPress, testID }: SegmentCardProps) {
  const { t } = useTranslation("tripDetail");
  const route = t("flight.route", { from: segment.from.iata, to: segment.to.iata });
  const departure = formatSegmentDateTime(locale, segment.departureAt, segment.from.timeZone);
  const arrival =
    segment.arrivalAt === null ? null : formatSegmentDateTime(locale, segment.arrivalAt, segment.to.timeZone);
  const baggage = t(segment.baggageIncluded ? "flight.baggageIncluded" : "flight.noBaggage");
  const passengers = t("flight.passengers", { count: segment.passengers });
  const times = arrival === null ? departure : `${departure} — ${arrival}`;
  const label = `${route}, ${times}, ${baggage}, ${passengers}`;

  return (
    <PressableRow
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onPress(segment.id)}
      testID={testID}
      style={styles.pressable}
    >
      <GlassSurface style={styles.card}>
        <View style={styles.row}>
          <View style={styles.codes}>
            <AppText variant="mono">{segment.from.iata}</AppText>
            <Icon name="forward" size="sm" color="textSecondary" />
            <AppText variant="mono">{segment.to.iata}</AppText>
          </View>
          <Icon name="chevron" color="textTertiary" />
        </View>
        <AppText variant="monoSmall" color="textSecondary">
          {times}
        </AppText>
        <View style={styles.chips}>
          <Pill label={baggage} />
          <Pill label={passengers} />
        </View>
      </GlassSurface>
    </PressableRow>
  );
}

interface RouteSummaryRowProps {
  route: RouteView;
  onPress: () => void;
  testID?: string;
}

/** design/screens/trip-detail.md: "KRK · OPO · BCN · VIE" + "Весь маршрут · 4 рейса, 1 пересадка". */
function RouteSummaryRow({ route, onPress, testID }: RouteSummaryRowProps) {
  const { t } = useTranslation("transport");
  const codes = route.summary.codes.join(" · ");
  const segmentsText = t("summary.segments", { count: route.summary.segments });
  const layoversText = t("summary.layovers", { count: route.summary.layovers });
  const summaryLine = `${t("summary.title")} · ${segmentsText}, ${layoversText}`;
  const label = `${codes}. ${summaryLine}`;

  return (
    <PressableRow accessibilityRole="link" accessibilityLabel={label} onPress={onPress} testID={testID}>
      <View style={styles.summaryContent}>
        <AppText variant="monoSmall">{codes}</AppText>
        <AppText color="textSecondary">{summaryLine}</AppText>
      </View>
      <Icon name="chevron" color="textTertiary" />
    </PressableRow>
  );
}

interface NotClosedBannerProps {
  cityId: string;
  locale: Locale;
  onPress: () => void;
  testID?: string;
}

/** design/screens/trip-detail.md: warnBg plaque under the summary, "Тап ведёт туда же" (S13). */
function NotClosedBanner({ cityId, locale, onPress, testID }: NotClosedBannerProps) {
  const { t } = useTranslation("transport");
  const { tokens } = useTheme();
  const cityName = findPlaceById(cityId)?.[placeLanguageOf(locale)] ?? cityId;
  const text = t("route.notClosedBanner", { city: cityName });

  return (
    <PressableRow
      accessibilityRole="link"
      accessibilityLabel={text}
      onPress={onPress}
      testID={testID}
      style={[styles.banner, { backgroundColor: tokens.warnBg }]}
    >
      <Icon name="warning" color="text" />
      <AppText style={styles.bannerText}>{text}</AppText>
    </PressableRow>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  pressable: { width: "100%" },
  card: { width: "100%", padding: spacing.lg, borderRadius: radius.card, gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  codes: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  summaryContent: { flex: 1, gap: spacing.xs },
  banner: { padding: spacing.md, borderRadius: radius.card },
  bannerText: { flexShrink: 1 },
});
