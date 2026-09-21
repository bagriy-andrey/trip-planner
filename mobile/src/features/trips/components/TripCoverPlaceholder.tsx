import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { coverColors, coverMuteSaturation, layout, radius, spacing, useTheme } from "@/lib/theme";

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
// Rec. 709 luma weights: the grey a colour collapses to when fully desaturated.
const LUMA = { r: 0.2126, g: 0.7152, b: 0.0722 } as const;

/**
 * The colour with its saturation scaled by `saturation` (1 = unchanged, 0 = grey), as a six-digit
 * hex string. React Native has no CSS `filter`, and dimming with `opacity` is forbidden (it multiplies
 * with the glass panel and the secondary text on top, dropping contrast below AA), so the muted
 * backdrop is a colour of its own.
 */
export function desaturate(color: string, saturation: number): string {
  const match = HEX_COLOR.exec(color);
  if (match === null) return color;
  const channelOf = (part: string | undefined) => Number.parseInt(part ?? "0", 16);
  const [r, g, b] = [channelOf(match[1]), channelOf(match[2]), channelOf(match[3])];
  const grey = LUMA.r * r + LUMA.g * g + LUMA.b * b;
  const mix = (channel: number) =>
    Math.round(grey + (channel - grey) * saturation)
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export interface TripCoverPlaceholderProps {
  /** Index into `coverColors` (from `coverIndexOf(trip.id, …)`); wraps around the palette. */
  variant: number;
  /**
   * History look: only the colour backing is desaturated (`coverMuteSaturation`). The glass panel,
   * the text on it and the status chip are drawn as usual.
   */
  muted?: boolean;
  /** Content sitting at the bottom of the cover (the glass info panel). */
  children?: ReactNode;
}

/** Coloured stand-in for a trip photo. Decorative: the card carries the accessible name. */
export function TripCoverPlaceholder({ variant, muted = false, children }: TripCoverPlaceholderProps) {
  const { tokens } = useTheme();
  const base = coverColors[Math.abs(variant) % coverColors.length] ?? coverColors[0];
  const backing = muted ? desaturate(base, coverMuteSaturation) : base;
  return (
    <View style={styles.cover}>
      <View
        pointerEvents="none"
        testID="trip-cover-backing"
        style={[StyleSheet.absoluteFill, { backgroundColor: backing }]}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.coverScrim }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    minHeight: layout.coverHeight,
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
    borderRadius: radius.cover,
    overflow: "hidden",
  },
});
