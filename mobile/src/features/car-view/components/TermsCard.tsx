import { StyleSheet, View } from "react-native";
import type { Car } from "@tripplanner/shared";

import { AppText, GlassSurface } from "@/components";
import { formatMoneyAmount } from "@/features/cars";
import { useTranslation } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { family, radius, spacing } from "@/lib/theme";

interface Row {
  key: string;
  label: string;
  value: string;
}

/** Terms grid (AC-44, AC-48): empty rows are not drawn; the whole card is hidden if none is left. */
export function TermsCard({ car, locale }: { car: Car; locale: Locale }) {
  const { t } = useTranslation("car");
  const rows: Row[] = [];
  if (car.insurance !== null) {
    rows.push({ key: "insurance", label: t("view.insurance"), value: t(`view.insuranceValue.${car.insurance}`) });
  }
  if (car.fuelPolicy !== null) {
    rows.push({ key: "fuel", label: t("view.fuel"), value: t(`form.fuel.${car.fuelPolicy}`) });
  }
  const cost = car.money?.cost ?? null;
  const status = car.paymentStatus === null ? null : t(`view.paymentStatus.${car.paymentStatus}`);
  if (cost !== null && car.money !== null) {
    const amount = formatMoneyAmount(locale, cost);
    const { currency } = car.money;
    rows.push({
      key: "payment",
      label: t("view.payment"),
      value: status === null ? `${amount} ${currency}` : t("view.paymentLine", { amount, currency, status }),
    });
  } else if (status !== null) {
    rows.push({ key: "payment", label: t("view.payment"), value: status });
  }
  rows.push({ key: "extraDriver", label: t("view.extraDriver"), value: car.extraDriver ? t("view.yes") : t("view.no") });
  const deposit = car.money?.deposit ?? null;
  if (deposit !== null && car.money !== null) {
    rows.push({
      key: "deposit",
      label: t("view.deposit"),
      value: `${formatMoneyAmount(locale, deposit)} ${car.money.currency}`,
    });
  }

  return (
    <GlassSurface style={styles.card}>
      <AppText variant="h2">{t("view.terms")}</AppText>
      {rows.map((row) => (
        <View key={row.key} style={styles.row} testID={`car-view-terms-${row.key}`}>
          <AppText variant="caption" color="textSecondary" style={styles.label}>
            {row.label}
          </AppText>
          <AppText variant="small" style={styles.value}>
            {row.value}
          </AppText>
        </View>
      ))}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.card, gap: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: spacing.md },
  label: { flexShrink: 0 },
  value: { flex: 1, textAlign: "right", fontFamily: family.bold },
});
