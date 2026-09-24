import { StyleSheet, TextInput, View } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, typography, useTheme } from "@/lib/theme";

import { Icon } from "../Icon";
import { IconButton } from "../IconButton";

export interface PickerSearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  testID: string;
}

/** Search line: magnifier, input (autofocus), and a clear button only while there is text. */
export function PickerSearchField({ value, onChangeText, testID }: PickerSearchFieldProps) {
  const { t } = useTranslation("picker");
  const { tokens } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}>
      <Icon name="search" color="textSecondary" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        autoFocus
        autoCorrect={false}
        autoCapitalize="none"
        accessibilityLabel={t("searchLabel")}
        placeholder={t("searchLabel")}
        placeholderTextColor={tokens.textTertiary}
        testID={testID}
        style={[styles.input, typography.body, { color: tokens.text }]}
      />
      {value === "" ? null : (
        <IconButton
          filled={false}
          onPress={() => onChangeText("")}
          accessibilityLabel={t("clearSearch")}
          testID={`${testID}-clear`}
        >
          <Icon name="close" color="textSecondary" />
        </IconButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingLeft: spacing.md,
    minHeight: layout.minTouch,
    borderRadius: radius.card,
    borderWidth: layout.borderWidth,
  },
  input: { flex: 1, minHeight: layout.minTouch },
});
