import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { AppText } from "./AppText";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlBase<T extends string> {
  /** Spoken name of the group (already translated). */
  label: string;
  options: readonly SegmentedOption<T>[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Default: a value is always selected and a tap on it changes nothing. */
interface SegmentedRequired<T extends string> extends SegmentedControlBase<T> {
  value: T;
  allowDeselect?: false;
  onChange: (value: T) => void;
}

/** `allowDeselect`: `null` = nothing selected; tapping the selected option calls `onChange(null)`. */
interface SegmentedDeselectable<T extends string> extends SegmentedControlBase<T> {
  value: T | null;
  allowDeselect: true;
  onChange: (value: T | null) => void;
}

export type SegmentedControlProps<T extends string> = SegmentedRequired<T> | SegmentedDeselectable<T>;

/**
 * Single-choice segments. The container is a radiogroup but NOT accessible itself, otherwise
 * VoiceOver swallows the radios inside it; each option is a radio with its checked state.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  allowDeselect,
  style,
  testID,
}: SegmentedControlProps<T>) {
  const { tokens } = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      testID={testID}
      style={[styles.row, { borderColor: tokens.surfaceBorder, backgroundColor: tokens.surface }, style]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => (allowDeselect === true && selected ? onChange(null) : onChange(option.value))}
            testID={testID === undefined ? undefined : `${testID}-${option.value}`}
            style={[styles.option, selected && { backgroundColor: tokens.accent }]}
          >
            <AppText
              variant="button"
              color={selected ? "onAccent" : "text"}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={layout.minFontScale}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    borderRadius: radius.field,
    borderWidth: layout.borderWidth,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  option: {
    flex: 1,
    minHeight: layout.minTouch,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.field,
  },
});
