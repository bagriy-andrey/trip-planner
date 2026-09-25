export interface PickerItem {
  key: string;
  name: string;
  /** Mono code on the right: ISO country, IATA airport, ISO currency. */
  code: string;
  /** Draws a flag before the name (countries and cities). */
  flagCountryCode?: string;
  /** Spoken name when it differs from `name`. */
  a11yName?: string;
  /** `add` = "use what I typed" action row: a plus icon instead of a flag, no code. */
  kind?: "add";
}

export interface PickerSheetProps {
  title: string;
  selectedKey: string | null;
  /** Pure lookup; blank query = the whole list. */
  search: (query: string) => readonly PickerItem[];
  /** When set, a blank query (or no items) shows this instead of a list (AC-26). */
  emptyWhenBlank?: { title: string; body: string };
  /** Shows the "Not specified" row when a value is selected (default true). False for fields that always hold a value, e.g. the UI language. */
  clearable?: boolean;
  /** Field is required: the "nothing found" hint drops the "optional" remark (AC-18). */
  required?: boolean;
  /** Called after the exit animation; `null` = "Not specified". */
  onSelect: (key: string | null) => void;
  onClose: () => void;
  testID: string;
}
