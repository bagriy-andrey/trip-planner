import { CAR_PAYMENT_STATUS } from "@tripplanner/shared";
import type { CarPaymentStatus } from "@tripplanner/shared";
import { StyleSheet, View } from "react-native";

import { AppText, CurrencyButton, MoneyField, SegmentedControl } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

import type { CarFormController } from "../hooks/useCarForm";
import { useErrorText } from "./useErrorText";

/** "Payment": cost + currency (1fr / 112) and the payment status segments. Amounts are Manrope, not mono (AC-12). */
export function PaymentGroup({ form }: { form: CarFormController }) {
  const { t } = useTranslation("car");
  const text = useErrorText();
  const { state, errors, currency } = form;
  const chosen = state.costCurrency !== "";
  // A filled amount or deposit without a currency asks for one; the placeholder is only a hint.
  const required = !chosen && (state.costAmount !== "" || state.depositAmount !== "");
  const options = CAR_PAYMENT_STATUS.map((value) => ({ value, label: t(`form.payment.${value}`) }));
  return (
    <>
      <View style={styles.row} testID="car-form-cost">
        <MoneyField
          style={styles.amount}
          label={t("form.field.cost")}
          placeholder={t("form.field.costAmountPlaceholder")}
          value={state.costAmount}
          onChangeText={(costAmount) => form.apply({ costAmount })}
          onBlur={() => form.touch("cost")}
          errorText={text(errors.costAmount)}
          mono={false}
          testID="car-form-cost-amount"
        />
        <CurrencyButton
          style={styles.currency}
          currency={state.costCurrency}
          placeholder={currency.placeholder ?? t("form.field.currencyPlaceholder")}
          caption={required ? t("form.field.currencyRequired") : t("form.field.currency")}
          accessibilityLabel={`${t("form.a11y.currencyField")}: ${chosen ? state.costCurrency : t("form.a11y.currencyEmpty")}`}
          onPress={currency.openSheet}
          errorText={text(errors.costCurrency)}
          testID="car-form-cost-currency"
        />
      </View>
      <View style={styles.status}>
        <AppText variant="small" color="textSecondary">
          {t("form.field.paymentStatus")}
        </AppText>
        <SegmentedControl<CarPaymentStatus>
          allowDeselect
          label={t("form.a11y.paymentGroup")}
          options={options}
          value={state.paymentStatus}
          onChange={(paymentStatus) => form.apply({ paymentStatus })}
          testID="car-form-payment"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.gap, alignItems: "flex-start" },
  // The design's 1fr / 112pt is about one part to two on a phone.
  amount: { flex: 2 },
  currency: { flex: 1 },
  status: { gap: spacing.xs },
});
