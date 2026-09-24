import type Feather from "@expo/vector-icons/Feather";
import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

type FeatherGlyph = ComponentProps<typeof Feather>["name"];
type IoniconsGlyph = ComponentProps<typeof Ionicons>["name"];

export type IconDefinition =
  | { set: "feather"; glyph: FeatherGlyph }
  | { set: "ionicons"; glyph: IoniconsGlyph };

/**
 * Semantic icon name -> glyph. Feather is the app's icon set (design/README.md,
 * «Иконки»); Feather has no plane, bed or car, so those three come from the
 * Ionicons outline set of the same package (also font-based, no native module).
 * Feature code only ever sees the semantic name.
 */
export const ICONS = {
  pin: { set: "feather", glyph: "map-pin" },
  plane: { set: "ionicons", glyph: "airplane-outline" },
  bed: { set: "ionicons", glyph: "bed-outline" },
  car: { set: "ionicons", glyph: "car-outline" },
  chevron: { set: "feather", glyph: "chevron-right" },
  back: { set: "feather", glyph: "arrow-left" },
  forward: { set: "feather", glyph: "arrow-right" },
  plus: { set: "feather", glyph: "plus" },
  minus: { set: "feather", glyph: "minus" },
  close: { set: "feather", glyph: "x" },
  check: { set: "feather", glyph: "check" },
  warning: { set: "feather", glyph: "alert-triangle" },
  phone: { set: "feather", glyph: "phone" },
  camera: { set: "feather", glyph: "camera" },
  document: { set: "feather", glyph: "file-text" },
  image: { set: "feather", glyph: "image" },
  clock: { set: "feather", glyph: "clock" },
  suitcase: { set: "feather", glyph: "briefcase" },
  user: { set: "feather", glyph: "user" },
  calendar: { set: "feather", glyph: "calendar" },
  search: { set: "feather", glyph: "search" },
  more: { set: "feather", glyph: "more-horizontal" },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;
