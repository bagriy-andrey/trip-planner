import { StyleSheet, View } from "react-native";

import { AppText } from "../AppText";
import { Icon } from "../Icon";
import { IconButton } from "../IconButton";
import { SecondaryButton } from "../SecondaryButton";
import { TextField } from "../TextField";
import { spacing } from "@/lib/theme";

export interface MapsLinkLabels {
  field: string;
  placeholder: string;
  added: string;
  source: string;
  open: string;
  remove: string;
  openFailed: string;
}

export interface MapsLinkFieldProps {
  /** Already translated strings: the component knows no feature namespace. */
  labels: MapsLinkLabels;
  /** The accepted, normalized link; `null` while the field is still an input. */
  acceptedUrl: string | null;
  text: string;
  onChangeText: (text: string) => void;
  onBlur: () => void;
  onRemove: () => void;
  onOpen: () => void;
  /** Schema error of the typed text (already translated). */
  errorText?: string;
  /** The link could not be opened (re-check failed or the system refused). */
  openFailed: boolean;
  testID: string;
}

/**
 * "Ссылка на карту" (AC-24..AC-27): an input until a link is accepted, then "Ссылка добавлена /
 * Google Maps" + "Открыть" + "×". The link itself is never printed (long, and not needed).
 */
export function MapsLinkField({
  acceptedUrl,
  text,
  onChangeText,
  onBlur,
  onRemove,
  onOpen,
  errorText,
  openFailed,
  testID,
  labels,
}: MapsLinkFieldProps) {
  if (acceptedUrl === null) {
    return (
      <TextField
        label={labels.field}
        placeholder={labels.placeholder}
        value={text}
        onChangeText={onChangeText}
        onBlur={onBlur}
        onSubmitEditing={onBlur}
        returnKeyType="done"
        errorText={errorText}
        variant="url"
        testID={testID}
      />
    );
  }
  return (
    <View testID={testID} style={styles.block}>
      <AppText variant="small" color="textSecondary">
        {labels.field}
      </AppText>
      <View style={styles.row}>
        <Icon name="pin" color="accent" />
        <View style={styles.text}>
          <AppText>{labels.added}</AppText>
          <AppText variant="small" color="textSecondary">
            {labels.source}
          </AppText>
        </View>
        <SecondaryButton
          label={labels.open}
          accessibilityLabel={labels.open}
          onPress={onOpen}
          testID={`${testID}-open`}
        />
        <IconButton
          filled={false}
          accessibilityLabel={labels.remove}
          onPress={onRemove}
          testID={`${testID}-remove`}
        >
          <Icon name="close" color="textSecondary" />
        </IconButton>
      </View>
      {openFailed ? (
        <AppText variant="small" color="danger" accessibilityRole="alert" testID={`${testID}-open-error`}>
          {labels.openFailed}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  text: { flex: 1 },
});
