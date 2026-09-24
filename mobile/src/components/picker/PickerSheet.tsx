import { useState } from "react";
import { FlatList, Modal, StyleSheet, View } from "react-native";

import { useTranslation } from "@/lib/i18n";
import { layout, radius, spacing, useTheme } from "@/lib/theme";

import { AnimatedSheetOverlay } from "../AnimatedSheetOverlay";
import { PickerEmpty } from "./PickerEmpty";
import { PickerHeader } from "./PickerHeader";
import { PickerRow } from "./PickerRow";
import { PickerSearchField } from "./PickerSearchField";
import type { PickerItem, PickerSheetProps } from "./types";

type Exit = { key: string | null } | "close";

/**
 * Searchable single-choice sheet. Hosted in a transparent `Modal` so it covers the tab bar and
 * isolates the accessibility tree; it pushes no route. A choice or a cancel first plays the exit
 * animation, then calls `onSelect`/`onClose`; the first tap wins (a double tap selects once).
 */
export function PickerSheet({ title, selectedKey, search, emptyWhenBlank, required = false, onSelect, onClose, testID }: PickerSheetProps) {
  const { t } = useTranslation("picker");
  const { tokens } = useTheme();
  const [query, setQuery] = useState("");
  const [exit, setExit] = useState<Exit | null>(null);
  const choose = (next: Exit) => setExit((current) => current ?? next);

  const blank = query.trim() === "";
  const items = search(query);
  const withNone: readonly PickerItem[] =
    selectedKey === null ? items : [{ key: "", name: t("notSpecified"), code: "" }, ...items];
  // AC-26: a blank query that finds nothing (e.g. a country with no listed cities).
  const empty = blank && items.length === 0 ? (emptyWhenBlank ?? null) : null;

  let body;
  if (empty !== null) {
    body = <PickerEmpty title={empty.title} body={empty.body} testID={`${testID}-empty`} />;
  } else if (items.length === 0) {
    body = (
      <PickerEmpty
        title={t("noResults.title")}
        body={required ? t("noResults.required") : t("noResults.optional")}
        testID={`${testID}-empty`}
      />
    );
  } else {
    body = (
      <FlatList
        data={withNone}
        keyExtractor={(item) => (item.key === "" ? "__none" : item.key)}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        testID={`${testID}-list`}
        renderItem={({ item, index }) => (
          <PickerRow
            item={item}
            selected={item.key !== "" && item.key === selectedKey}
            last={index === withNone.length - 1}
            onPress={() => choose({ key: item.key === "" ? null : item.key })}
            testID={item.key === "" ? `${testID}-none` : `${testID}-item-${item.key}`}
          />
        )}
      />
    );
  }

  return (
    <Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={() => choose("close")}>
      <AnimatedSheetOverlay
        closeLabel={t("a11y.close")}
        onRequestClose={() => choose("close")}
        closing={exit !== null}
        onExited={() => (exit === null || exit === "close" ? onClose() : onSelect(exit.key))}
        topInset={layout.sheetTopInset}
        handle
        testID={testID}
      >
        <PickerHeader title={title} onCancel={() => choose("close")} testID={testID} />
        <PickerSearchField value={query} onChangeText={setQuery} testID={`${testID}-search`} />
        <View style={[styles.card, { backgroundColor: tokens.surface, borderColor: tokens.surfaceBorder }]}>{body}</View>
      </AnimatedSheetOverlay>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { flexShrink: 1, borderRadius: radius.card, borderWidth: layout.borderWidth, overflow: "hidden", marginTop: spacing.xs },
});
