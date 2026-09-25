import type { CurrencyCode, PlaceLanguage } from "@tripplanner/shared";

import { CurrencyPickerSheet, PickerSheet } from "@/components";
import { useTranslation } from "@/lib/i18n";

import type { ProfileEditor } from "../hooks/useProfileEditor";
import { emptyWhenBlankFor, itemsFor, selectedKeyOf } from "../pickerItems";

export interface ProfileFieldPickerProps {
  editor: ProfileEditor;
  lang: PlaceLanguage;
}

/** The sheet of the active field; renders nothing while none is open. */
export function ProfileFieldPicker({ editor, lang }: ProfileFieldPickerProps) {
  const { t } = useTranslation("profile");
  const { t: tPicker } = useTranslation("picker");
  const { activeField, display } = editor;
  if (activeField === null) return null;

  if (activeField === "homeCurrency") {
    return (
      <CurrencyPickerSheet
        title={t("rows.currency")}
        selected={display.homeCurrency as CurrencyCode | null}
        onSelect={(code) => editor.choose(code)}
        onClose={editor.close}
        testID="profile-picker"
      />
    );
  }
  return (
    <PickerSheet
      title={t(`fields.${activeField}`)}
      selectedKey={selectedKeyOf(activeField, display)}
      search={(query) => itemsFor(activeField, query, lang, display)}
      emptyWhenBlank={
        emptyWhenBlankFor(activeField, display)
          ? { title: tPicker("noCities.title"), body: tPicker("noCities.body") }
          : undefined
      }
      onSelect={editor.choose}
      onClose={editor.close}
      testID="profile-picker"
    />
  );
}
