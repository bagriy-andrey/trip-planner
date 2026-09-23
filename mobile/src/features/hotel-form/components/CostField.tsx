import type { CurrencyCode } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, PressableRow, TextField } from "@/components";
import { layout, radius, spacing, useTheme } from "@/lib/theme";
import { useTranslation } from "@/lib/i18n";

export interface CostFieldProps {
  amount: string;
  currency: string;
  onChangeAmount: (text: string) => void;
  onChangeCurrency: (text: string) => void;
  onSelectCurrency: (code: CurrencyCode) => void;
  onBlurCurrency: () => void;
  /** At most 4 codes from `searchCurrencies`; empty = none. */
  suggestions: readonly CurrencyCode[];
  amountError?: string;
  currencyError?: string;
  testID: string;
}

/** "Стоимость": amount + currency (both mono, ticket data) with tappable currency suggestions (AC-19). */
export function CostField({
  amount,
  currency,
  onChangeAmount,
  onChangeCurrency,
  onSelectCurrency,
  onBlurCurrency,
  suggestions,
  amountError,
  currencyError,
  testID,
}: CostFieldProps) {
  const { t } = useTranslation("hotel");
  const { tokens } = useTheme();
  return (
    <View testID={testID} style={styles.block}>
      <View style={styles.row}>
        <TextField
          style={styles.amount}
          label={t("form.field.cost")}
          placeholder={t("form.field.costAmountPlaceholder")}
          value={amount}
          onChangeText={onChangeAmount}
          errorText={amountError}
          variant="decimal"
          mono
          testID={`${testID}-amount`}
        />
        <TextField
          style={styles.currency}
          label={t("form.field.currency")}
          placeholder={t("form.field.currencyPlaceholder")}
          value={currency}
          onChangeText={onChangeCurrency}
          onBlur={onBlurCurrency}
          errorText={currencyError}
          variant="currency"
          mono
          testID={`${testID}-currency`}
        />
      </View>
      {suggestions.length > 0 ? (
        <View style={styles.chips}>
          {suggestions.map((code) => (
            <PressableRow
              key={code}
              accessibilityLabel={t("form.a11y.currencySuggestion", { code })}
              onPress={() => onSelectCurrency(code)}
              testID={`${testID}-suggestion-${code}`}
              style={[styles.chip, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}
            >
              <AppText variant="mono">{code}</AppText>
            </PressableRow>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: { flexDirection: "row", gap: spacing.gap },
  amount: { flex: 2 },
  currency: { flex: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: layout.minTouch,
    minWidth: layout.minTouch,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: layout.borderWidth,
  },
});
