import { CURRENCIES } from "@tripplanner/shared";
import type { CurrencyCode } from "@tripplanner/shared";
import { useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";

import { AnimatedSheetOverlay, AppText, Icon, PressableRow, TextField } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

/** The list takes at most this share of the window height (1/2), the rest is header + search. */
const LIST_SHARE = 2;

export interface CurrencyOption {
  code: CurrencyCode;
  name: string;
}

/** Case-insensitive match of the query against the code OR the (localized) name; blank = everything. */
export function filterCurrencies(options: readonly CurrencyOption[], query: string): CurrencyOption[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [...options];
  return options.filter((o) => o.code.toLowerCase().includes(q) || o.name.toLowerCase().includes(q));
}

export interface CurrencySheetProps {
  /** Currently chosen code ("" = none). */
  selected: string;
  /** A code, or `null` for "no currency". Closing is the caller's job (the hook closes on select). */
  onSelect: (code: CurrencyCode | null) => void;
  onClose: () => void;
  testID: string;
}

/** Bottom-sheet currency picker: search by code or name, the full list, a "none" row. In-tree overlay, no Alert. */
export function CurrencySheet({ selected, onSelect, onClose, testID }: CurrencySheetProps) {
  const { t } = useTranslation("hotel");
  const { tokens } = useTheme();
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState("");
  // What to do once the exit animation has finished: null = just close, else apply this choice.
  const [exit, setExit] = useState<{ code: CurrencyCode | null } | "close" | null>(null);
  const options: CurrencyOption[] = CURRENCIES.map((code) => ({ code, name: t(`form.currencyName.${code}`) }));
  const shown = filterCurrencies(options, query);

  return (
    <AnimatedSheetOverlay
      closeLabel={t("form.a11y.currencyClose")}
      onRequestClose={() => setExit((current) => current ?? "close")}
      closing={exit !== null}
      onExited={() => (exit === null || exit === "close" ? onClose() : onSelect(exit.code))}
      testID={testID}
    >
      <AppText variant="h2" accessibilityRole="header">
        {t("form.currency.title")}
      </AppText>
      <TextField
        label={t("form.currency.searchLabel")}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        testID={`${testID}-search`}
      />
      <ScrollView style={{ maxHeight: height / LIST_SHARE }} keyboardShouldPersistTaps="handled" testID={`${testID}-list`}>
        {selected === "" ? null : (
          <PressableRow
            accessibilityLabel={t("form.currency.none")}
            onPress={() => setExit((current) => current ?? { code: null })}
            testID={`${testID}-none`}
            style={styles.row}
          >
            <Icon name="close" color="textSecondary" />
            <AppText color="textSecondary">{t("form.currency.none")}</AppText>
          </PressableRow>
        )}
        {shown.length === 0 ? (
          <AppText color="textSecondary" testID={`${testID}-empty`}>
            {t("form.currency.empty")}
          </AppText>
        ) : (
          shown.map((option) => (
            <PressableRow
              key={option.code}
              accessibilityLabel={`${option.code}, ${option.name}`}
              onPress={() => setExit((current) => current ?? { code: option.code })}
              testID={`${testID}-option-${option.code}`}
              style={[styles.row, option.code === selected && { backgroundColor: tokens.surfaceStrong }]}
            >
              <View style={styles.code}>
                <AppText variant="mono">{option.code}</AppText>
              </View>
              <AppText color="textSecondary" style={styles.name}>
                {option.name}
              </AppText>
            </PressableRow>
          ))
        )}
      </ScrollView>
    </AnimatedSheetOverlay>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: layout.minTouch, flexDirection: "row", alignItems: "center", gap: spacing.md },
  code: { minWidth: layout.minTouch },
  name: { flexShrink: 1 },
});
