import { flagEmojiOf } from "@tripplanner/shared";
import { StyleSheet, Text } from "react-native";

import { iconSize } from "@/lib/theme";
import { FLAG_DISPLAY } from "@/platform/flag";

import { AppText } from "./AppText";

export interface CountryFlagProps {
  countryCode: string;
  testID?: string;
}

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: "no-hide-descendants" } as const;

/** Flag emoji for a valid country code; otherwise (or where flags do not render) the code in mono. Decorative. */
export function CountryFlag({ countryCode, testID }: CountryFlagProps) {
  const emoji = FLAG_DISPLAY === "emoji" ? flagEmojiOf(countryCode) : null;
  if (emoji === null) {
    return (
      <AppText variant="monoSmall" color="textSecondary" testID={testID} {...HIDDEN}>
        {countryCode}
      </AppText>
    );
  }
  return (
    <Text testID={testID} style={styles.flag} {...HIDDEN}>
      {emoji}
    </Text>
  );
}

const styles = StyleSheet.create({ flag: { fontSize: iconSize.lg } });
