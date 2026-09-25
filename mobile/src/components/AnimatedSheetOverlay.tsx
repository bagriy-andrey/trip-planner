import { useCallback, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { easing, layout, motion, radius, spacing, useTheme } from "@/lib/theme";

export interface AnimatedSheetOverlayProps {
  /** Spoken name of the scrim (tapping it asks to close). */
  closeLabel: string;
  /** Scrim tap: the owner should set `closing`. */
  onRequestClose: () => void;
  /** True = play the exit animation; `onExited` fires when it has finished (then unmount). */
  closing: boolean;
  onExited: () => void;
  children: ReactNode;
  /** Panel runs from this offset to the bottom of the window; unset = as tall as its content. */
  topInset?: number;
  /** Decorative grabber at the top of the panel (no gesture). */
  handle?: boolean;
  testID?: string;
}

/**
 * `ConfirmOverlay` with motion: the scrim fades and the panel slides up from below the window
 * (and back on close). Still an in-tree view (no `Modal`, no native module); `Animated` runs on
 * the native driver. With "Reduce motion" on, it jumps straight to the end state.
 */
export function AnimatedSheetOverlay({
  closeLabel,
  onRequestClose,
  closing,
  onExited,
  children,
  topInset,
  handle = false,
  testID,
}: AnimatedSheetOverlayProps) {
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  // Unknown = animate: the async Reduce Motion read must never suppress the first slide-in.
  const reduceMotion = useRef(false);
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  const run = useCallback((to: 0 | 1, done?: () => void) => {
    const duration = reduceMotion.current ? 0 : to === 1 ? motion.sheetEnter : motion.sheetExit;
    Animated.timing(progress, {
      toValue: to,
      duration,
      easing: to === 1 ? easing.enter : easing.exit,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) done?.();
    });
  }, [progress]);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!alive) return;
      reduceMotion.current = reduced;
      if (reduced) progress.setValue(1);
    });
    run(1);
    return () => {
      alive = false;
      progress.stopAnimation();
    };
  }, [progress, run]);

  useEffect(() => {
    if (closing) run(0, () => onExitedRef.current());
  }, [closing, run]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] });

  return (
    <View testID={testID} accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.root]}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          onPress={onRequestClose}
          testID={testID === undefined ? undefined : `${testID}-backdrop`}
          style={[StyleSheet.absoluteFill, { backgroundColor: tokens.scrim }]}
        />
      </Animated.View>
      <Animated.View
        testID={testID === undefined ? undefined : `${testID}-panel`}
        style={[
          styles.panel,
          topInset === undefined ? null : { position: "absolute", top: topInset, bottom: 0, left: 0, right: 0 },
          {
            backgroundColor: tokens.bg,
            borderColor: tokens.surfaceBorder,
            paddingBottom: insets.bottom + spacing.lg,
            transform: [{ translateY }],
          },
        ]}
      >
        {handle ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.handle, { backgroundColor: tokens.divider }]}
          />
        ) : null}
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { justifyContent: "flex-end" },
  handle: {
    alignSelf: "center",
    width: layout.sheetHandleW,
    height: layout.sheetHandleH,
    borderRadius: layout.sheetHandleH / 2,
  },
  panel: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderWidth: layout.borderWidth,
  },
});
