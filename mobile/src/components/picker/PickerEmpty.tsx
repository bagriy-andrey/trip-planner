import { StyleSheet, View } from "react-native";

import { spacing } from "@/lib/theme";

import { AppText } from "../AppText";

export interface PickerEmptyProps {
  title: string;
  body: string;
  testID: string;
}

export function PickerEmpty({ title, body, testID }: PickerEmptyProps) {
  return (
    <View style={styles.box} testID={testID}>
      <AppText variant="h2" style={styles.text}>
        {title}
      </AppText>
      <AppText color="textSecondary" style={styles.text}>
        {body}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, padding: spacing.lg },
  text: { textAlign: "center" },
});
