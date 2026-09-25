import { useState } from "react";

import { PickerSheet } from "@/components";
import type { PickerItem } from "@/components";
import { LANGUAGE_PREFERENCES, useLanguagePreference, useTranslation } from "@/lib/i18n";
import type { LanguagePreference } from "@/lib/i18n";

import { ProfileValueRow } from "./ProfileValueRow";

/**
 * The UI language: "System" (the device language) or English / Русский / Українська. The choice is
 * device-local, like the theme, and is applied at once. It always holds a value, so the sheet has no
 * "Not specified" row.
 */
export function LanguageRow() {
  const { t } = useTranslation("profile");
  const { preference, setPreference } = useLanguagePreference();
  const [open, setOpen] = useState(false);

  const nameOf = (option: LanguagePreference) => t(`languageOptions.${option}`);
  const items: PickerItem[] = LANGUAGE_PREFERENCES.map((option) => ({ key: option, name: nameOf(option), code: "" }));

  return (
    <>
      <ProfileValueRow
        label={t("rows.language")}
        value={{ kind: "text", text: nameOf(preference) }}
        onPress={() => setOpen(true)}
        testID="row-language"
      />
      {open ? (
        <PickerSheet
          title={t("rows.language")}
          selectedKey={preference}
          clearable={false}
          search={() => items}
          onSelect={(key) => {
            setOpen(false);
            if (key !== null) void setPreference(key as LanguagePreference);
          }}
          onClose={() => setOpen(false)}
          testID="language-picker"
        />
      ) : null}
    </>
  );
}
