import { Fragment } from "react";
import { StyleSheet, View } from "react-native";
import type { RouteView, RouteWarning } from "@tripplanner/shared";

import type { Locale } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

import { GapRow } from "./GapRow";
import { SegmentCard } from "./SegmentCard";
import { WarningRow } from "./WarningRow";
import type { ChainWarning } from "./WarningRow";

export interface RouteChainProps {
  route: RouteView;
  locale: Locale;
  onSegmentPress: (segmentId: string) => void;
  testID?: string;
}

function pairKey(beforeId: string, afterId: string): string {
  return `${beforeId}\u0000${afterId}`;
}

/**
 * The chain itself (AC-63, design/screens/route.md "Цепочка"): a vertical `divider` line with a
 * filled `chainNode` (8pt, `accent`) marking each segment and a hollow `chainGapNode` (10pt,
 * `divider` or `warnBorder` for a risky pause) marking each gap, in `buildRoute`'s own chain
 * order. Warnings ride next to the element they concern (AC-66): `segment.outsideTripDates` under
 * its segment, and the pair warnings (risky layover / airport mismatch / overlap) under the gap
 * between the two segments they name. `route.notClosed` is never rendered here — that is
 * `NotClosedCard`'s job, one level up. The line and the nodes are purely decorative and excluded
 * from the accessibility tree (AC-91); every card/row inside carries its own label.
 */
export function RouteChain({ route, locale, onSegmentPress, testID }: RouteChainProps) {
  const { tokens } = useTheme();

  const bySegment = new Map<string, RouteWarning[]>();
  const byPair = new Map<string, ChainWarning[]>();
  const unmatched: ChainWarning[] = [];

  const adjacentPairs = new Set<string>();
  for (let i = 0; i < route.chain.length - 1; i++) {
    adjacentPairs.add(pairKey(route.chain[i]!.segment.id, route.chain[i + 1]!.segment.id));
  }

  for (const warning of route.warnings) {
    if (warning.id === "route.notClosed") continue;
    if (warning.id === "segment.outsideTripDates") {
      const list = bySegment.get(warning.segmentId) ?? [];
      list.push(warning);
      bySegment.set(warning.segmentId, list);
      continue;
    }
    const key = pairKey(warning.beforeSegmentId, warning.afterSegmentId);
    if (!adjacentPairs.has(key)) {
      // The wrap-around "closing" mismatch (last segment -> first segment) does not sit between
      // two consecutive chain rows; render it at the end of the chain rather than drop it.
      unmatched.push(warning);
      continue;
    }
    const list = byPair.get(key) ?? [];
    list.push(warning);
    byPair.set(key, list);
  }

  return (
    <View testID={testID} style={styles.root}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.line,
          { backgroundColor: tokens.divider, left: layout.chainGapNode / 2 - layout.chainLine / 2 },
        ]}
      />
      <View style={styles.items}>
        {route.chain.map((node, index) => {
          const segment = node.segment;
          const nextNode = route.chain[index + 1];
          const gap =
            nextNode === undefined
              ? undefined
              : route.gaps.find(
                  (g) => g.beforeSegmentId === segment.id && g.afterSegmentId === nextNode.segment.id,
                );
          const pairWarnings =
            nextNode === undefined ? [] : (byPair.get(pairKey(segment.id, nextNode.segment.id)) ?? []);
          const segmentWarnings = bySegment.get(segment.id) ?? [];

          return (
            <Fragment key={segment.id}>
              <View style={styles.itemRow}>
                <View style={styles.nodeColumn}>
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={[styles.segmentNode, { backgroundColor: tokens.accent }]}
                  />
                </View>
                <View style={styles.itemContent}>
                  <SegmentCard
                    segment={segment}
                    locale={locale}
                    onPress={onSegmentPress}
                    testID={testID === undefined ? undefined : `${testID}-segment-${segment.id}`}
                  />
                  {segmentWarnings.map((warning, warningIndex) => (
                    <WarningRow
                      key={`${segment.id}-${warningIndex}`}
                      warning={warning as ChainWarning}
                      testID={testID === undefined ? undefined : `${testID}-warning-${segment.id}-${warningIndex}`}
                    />
                  ))}
                </View>
              </View>
              {nextNode === undefined ? null : (
                <View style={styles.itemRow}>
                  <View style={styles.nodeColumn}>
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={[
                        styles.gapNode,
                        {
                          backgroundColor: tokens.bg,
                          borderColor: gap?.risky === true ? tokens.warnBorder : tokens.divider,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.itemContent}>
                    {gap === undefined ? null : (
                      <GapRow
                        gap={gap}
                        locale={locale}
                        testID={testID === undefined ? undefined : `${testID}-gap-${segment.id}`}
                      />
                    )}
                    {pairWarnings.map((warning, warningIndex) => (
                      <WarningRow
                        key={`${segment.id}-${nextNode.segment.id}-${warningIndex}`}
                        warning={warning}
                        testID={
                          testID === undefined
                            ? undefined
                            : `${testID}-warning-${segment.id}-${nextNode.segment.id}-${warningIndex}`
                        }
                      />
                    ))}
                  </View>
                </View>
              )}
            </Fragment>
          );
        })}
        {unmatched.map((warning, index) => (
          <WarningRow key={`unmatched-${index}`} warning={warning} testID={testID === undefined ? undefined : `${testID}-warning-unmatched-${index}`} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row" },
  line: { position: "absolute", top: 0, bottom: 0, width: layout.chainLine },
  items: { flex: 1, gap: spacing.md },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  nodeColumn: { width: layout.chainGapNode, alignItems: "center", paddingTop: spacing.md },
  itemContent: { flex: 1, gap: spacing.sm },
  segmentNode: {
    width: layout.chainNode,
    height: layout.chainNode,
    borderRadius: layout.chainNode / 2,
  },
  gapNode: {
    width: layout.chainGapNode,
    height: layout.chainGapNode,
    borderRadius: layout.chainGapNode / 2,
    borderWidth: layout.borderWidth,
  },
});
