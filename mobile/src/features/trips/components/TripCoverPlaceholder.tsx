import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";

import { radii, spacing, useTheme } from "@/lib/theme";

// The theme has no cover palette (and no images exist in the skeleton), so the
// placeholder varies the accent's strength over a neutral base.
const COVER_STRENGTH = [1, 0.7, 0.45, 0.28] as const;
const COVER_HEIGHT = 180;

export interface TripCoverPlaceholderProps {
  /** Which colour variant to draw; wraps around the palette. */
  variant: number;
  /** Dimmed look for finished trips (History). */
  muted?: boolean;
  /** Content sitting at the bottom of the cover (the glass info panel). */
  children?: ReactNode;
}

/** Coloured stand-in for a trip photo. Decorative: the card carries the accessible name. */
export function TripCoverPlaceholder({ variant, muted = false, children }: TripCoverPlaceholderProps) {
  const { tokens } = useTheme();
  const strength = COVER_STRENGTH[Math.abs(variant) % COVER_STRENGTH.length] ?? 1;
  return (
    <View style={[styles.cover, { backgroundColor: tokens.pill }, muted && styles.muted]}>
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.accent, opacity: strength }]}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: tokens.coverOverlay }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    minHeight: COVER_HEIGHT,
    flex: 1,
    justifyContent: "flex-end",
    padding: spacing.md,
    borderRadius: radii.lg,
    overflow: "hidden",
  },
  muted: { opacity: 0.55 },
});
