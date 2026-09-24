import { Pressable, StyleSheet } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { layout, spacing, useTheme } from "@/lib/theme";

import { AppText } from "../AppText";
import { CountryFlag } from "../CountryFlag";
import { Icon } from "../Icon";
import type { PickerItem } from "./types";

export interface PickerRowProps {
  item: PickerItem;
  selected: boolean;
  last: boolean;
  onPress: () => void;
  testID: string;
}

export function PickerRow({ item, selected, last, onPress, testID }: PickerRowProps) {
  const { t } = useTranslation("picker");
  const { tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        item.code.length === 0 ? item.name : t("a11y.item", { name: item.a11yName ?? item.name, code: item.code })
      }
      accessibilityState={{ selected }}
      onPress={onPress}
      testID={testID}
      style={[
        styles.row,
        { borderBottomColor: tokens.divider, borderBottomWidth: last ? 0 : layout.borderWidth },
        selected && { backgroundColor: tokens.surface },
      ]}
    >
      {item.flagCountryCode === undefined ? null : <CountryFlag countryCode={item.flagCountryCode} />}
      <AppText style={styles.name}>{item.name}</AppText>
      <AppText variant="monoSmall" color="textSecondary">
        {item.code}
      </AppText>
      {selected ? <Icon name="check" color="accent" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.minTouch,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  name: { flex: 1, flexShrink: 1 },
});
