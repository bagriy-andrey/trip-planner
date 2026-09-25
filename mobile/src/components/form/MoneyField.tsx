import { useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import { TextField } from "../TextField";
import { filterMoneyInput } from "./moneyInput";

export interface MoneyFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  errorText?: string;
  /** Ticket data (IBM Plex Mono). The hotel cost is; the car rental cost is not (AC-12). */
  mono?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Amount input: filters what can be typed (`filterMoneyInput`) and force-overwrites a rejected char. */
export function MoneyField({
  label,
  placeholder,
  value,
  onChangeText,
  onBlur,
  errorText,
  mono = true,
  style,
  testID,
}: MoneyFieldProps) {
  // A controlled native input keeps whatever the user typed unless React re-renders it with a
  // value: when the filter drops the char ("12" + "a" -> "12") the state does not change, React
  // bails out, and the native field would keep showing "12a". Bumping this forces the re-render
  // so the native text is overwritten. The overlaid display (`overlayValue`) means the rejected
  // character is never visible in the meantime.
  const [, forceRender] = useState(0);
  const handleChange = (raw: string) => {
    const filtered = filterMoneyInput(raw);
    if (filtered !== raw) forceRender((n) => n + 1);
    onChangeText(filtered);
  };
  return (
    <TextField
      style={style}
      label={label}
      placeholder={placeholder}
      value={value}
      onChangeText={handleChange}
      errorText={errorText}
      onBlur={onBlur}
      variant="decimal"
      mono={mono}
      overlayValue
      testID={testID}
    />
  );
}
