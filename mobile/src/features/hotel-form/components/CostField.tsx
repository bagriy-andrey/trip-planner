import { StyleSheet, View } from "react-native";

import { CurrencyButton, MoneyField } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface CostFieldProps {
  amount: string;
  /** Chosen ISO code, or "" while none is chosen (never defaulted). */
  currency: string;
  onChangeAmount: (text: string) => void;
  /** Opens the currency bottom sheet (rendered by the screen, above everything). */
  onOpenCurrency: () => void;
  /** The amount field lost focus (the screen then reveals a missing currency). */
  onBlurAmount?: () => void;
  /** Hint shown while no currency is chosen: the home currency or the generic example (AC-40). Never a value. */
  currencyPlaceholder: string;
  amountError?: string;
  currencyError?: string;
  testID: string;
}

/** "Стоимость": amount (mono, ticket data) + a currency dropdown button that opens the picker sheet (AC-19). */
export function CostField({
  amount,
  currency,
  onChangeAmount,
  onOpenCurrency,
  onBlurAmount,
  currencyPlaceholder,
  amountError,
  currencyError,
  testID,
}: CostFieldProps) {
  const { t } = useTranslation("hotel");
  const chosen = currency !== "";
  // The placeholder (EUR) is only a hint: never the value, never spoken as one.
  const required = !chosen && amount !== "";
  return (
    <View testID={testID} style={styles.row}>
      <MoneyField
        style={styles.amount}
        label={t("form.field.cost")}
        placeholder={t("form.field.costAmountPlaceholder")}
        value={amount}
        onChangeText={onChangeAmount}
        errorText={amountError}
        onBlur={onBlurAmount}
        mono
        testID={`${testID}-amount`}
      />
      <CurrencyButton
        style={styles.currency}
        currency={currency}
        placeholder={currencyPlaceholder}
        caption={required ? t("form.field.currencyRequired") : t("form.field.currency")}
        accessibilityLabel={t("form.a11y.currencyField", { value: chosen ? currency : t("form.a11y.currencyEmpty") })}
        onPress={onOpenCurrency}
        errorText={currencyError}
        testID={`${testID}-currency`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.gap, alignItems: "flex-start" },
  amount: { flex: 2 },
  currency: { flex: 2 },
});
