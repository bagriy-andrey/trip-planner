import { StyleSheet, View } from "react-native";

import { AppText, Icon, IconButton, SecondaryButton, TextField } from "@/components";
import { useTranslation } from "@/lib/i18n";
import { spacing } from "@/lib/theme";

export interface MapsLinkFieldProps {
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
}: MapsLinkFieldProps) {
  const { t } = useTranslation("hotel");
  if (acceptedUrl === null) {
    return (
      <TextField
        label={t("form.field.mapsUrl")}
        placeholder={t("form.field.mapsUrlPlaceholder")}
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
        {t("form.field.mapsUrl")}
      </AppText>
      <View style={styles.row}>
        <Icon name="pin" color="accent" />
        <View style={styles.text}>
          <AppText>{t("form.mapsLink.added")}</AppText>
          <AppText variant="small" color="textSecondary">
            {t("form.mapsLink.source")}
          </AppText>
        </View>
        <SecondaryButton
          label={t("form.mapsLink.open")}
          accessibilityLabel={t("form.mapsLink.open")}
          onPress={onOpen}
          testID={`${testID}-open`}
        />
        <IconButton
          filled={false}
          accessibilityLabel={t("form.mapsLink.remove")}
          onPress={onRemove}
          testID={`${testID}-remove`}
        >
          <Icon name="close" color="textSecondary" />
        </IconButton>
      </View>
      {openFailed ? (
        <AppText variant="small" color="danger" accessibilityRole="alert" testID={`${testID}-open-error`}>
          {t("form.mapsLink.openFailed")}
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
