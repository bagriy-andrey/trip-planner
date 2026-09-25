import { MapsLinkField, TextField } from "@/components";
import { useTranslation } from "@/lib/i18n";

import type { CarFormController } from "../hooks/useCarForm";
import { useErrorText } from "./useErrorText";

/** "Office": maps link (shared field), address and phone (Manrope, not mono; phone keyboard). */
export function OfficeGroup({ form }: { form: CarFormController }) {
  const { t } = useTranslation("car");
  const text = useErrorText();
  const { state, errors, maps } = form;
  return (
    <>
      <MapsLinkField
        acceptedUrl={state.mapsUrl}
        text={state.mapsUrlText}
        onChangeText={maps.changeText}
        labels={{
          field: t("form.field.mapsUrl"),
          placeholder: t("form.field.mapsUrlPlaceholder"),
          added: t("form.mapsLink.added"),
          source: t("form.mapsLink.source"),
          open: t("form.mapsLink.open"),
          remove: t("form.mapsLink.remove"),
          openFailed: t("form.mapsLink.openFailed"),
        }}
        onBlur={maps.blur}
        onRemove={maps.remove}
        onOpen={maps.open}
        errorText={text(errors.mapsUrl)}
        openFailed={maps.openFailed}
        testID="car-form-maps"
      />
      <TextField
        label={t("form.field.address")}
        value={state.address}
        onChangeText={(address) => form.apply({ address })}
        onBlur={() => form.touch("address")}
        errorText={text(errors.address)}
        multiline
        testID="car-form-address"
      />
      <TextField
        label={t("form.field.phone")}
        value={state.phone}
        onChangeText={(phone) => form.apply({ phone })}
        onBlur={() => form.touch("phone")}
        errorText={text(errors.phone)}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        testID="car-form-phone"
      />
    </>
  );
}
