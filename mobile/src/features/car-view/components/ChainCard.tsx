import { StyleSheet, View } from "react-native";
import type { Car } from "@tripplanner/shared";

import { AppText, GlassSurface } from "@/components";
import { formatViewMoment } from "@/features/cars";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { layout, radius, size, spacing, useTheme } from "@/lib/theme";

interface StopProps {
  filled: boolean;
  label: string;
  moment: string;
  place: string;
  testID: string;
}

function Stop({ filled, label, moment, place, testID }: StopProps) {
  const { tokens } = useTheme();
  return (
    <View style={styles.stop} testID={testID}>
      <View style={styles.nodeCol} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View
          style={[
            styles.node,
            { borderColor: tokens.accent, backgroundColor: filled ? tokens.accent : "transparent" },
          ]}
        />
      </View>
      <View style={styles.text}>
        <AppText variant="caption" color="textSecondary">
          {label}
        </AppText>
        <AppText variant="mono" style={styles.moment}>
          {moment}
        </AppText>
        <AppText variant="small" color="textSecondary">
          {place}
        </AppText>
      </View>
    </View>
  );
}

export function ChainCard({ car, locale }: { car: Car; locale: Locale }) {
  const { t } = useTranslation("car");
  const { tokens } = useTheme();
  const returnPlace = car.returnSamePlace ? t("view.samePlace") : (car.returnPlace ?? car.pickupPlace);
  return (
    <GlassSurface style={styles.card}>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.line, { backgroundColor: tokens.divider }]}
      />
      <Stop
        filled
        label={t("view.pickup")}
        moment={formatViewMoment(t, locale, car.pickupDate, car.pickupTime)}
        place={car.pickupPlace}
        testID="car-view-pickup"
      />
      <Stop
        filled={false}
        label={t("view.return")}
        moment={formatViewMoment(t, locale, car.returnDate, car.returnTime)}
        place={returnPlace}
        testID="car-view-return"
      />
    </GlassSurface>
  );
}

const NODE_COL = layout.chainNode + 2;

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.card, gap: spacing.lg },
  line: {
    position: "absolute",
    width: layout.chainLine,
    top: spacing.lg + spacing.sm,
    bottom: spacing.lg + spacing.sm,
    left: spacing.lg + NODE_COL / 2 - layout.chainLine / 2,
  },
  stop: { flexDirection: "row", gap: spacing.md },
  nodeCol: { width: NODE_COL, alignItems: "center", paddingTop: spacing.xs },
  node: { width: layout.chainNode, height: layout.chainNode, borderRadius: radius.pill, borderWidth: layout.borderWidth },
  text: { flex: 1, gap: spacing.xs },
  moment: { fontSize: size.body },
});
