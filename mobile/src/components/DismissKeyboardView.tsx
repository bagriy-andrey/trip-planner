import type { ReactNode } from "react";
import { Keyboard, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";

/**
 * Touch-start events bubble child -> parent, so an input that is touched marks the touch here
 * BEFORE the wrapper below sees it. A plain module flag is enough: it is set and consumed within
 * the same synchronous dispatch of one touch.
 */
let touchStartedOnInput = false;

/** Called by `TextField` on touch start: this touch belongs to an input and must keep the focus. */
export function markInputTouch(): void {
  touchStartedOnInput = true;
}

export interface DismissKeyboardViewProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Tap outside any input = blur the focused input and hide the keyboard: labels, empty areas,
 * buttons, calendars, sheets. Reacts to the raw touch start (it never becomes the responder), so
 * buttons, scrolling and suggestion taps keep working exactly as before.
 */
export function DismissKeyboardView({ children, style, testID }: DismissKeyboardViewProps) {
  return (
    <View
      style={style}
      testID={testID}
      onTouchStart={() => {
        const onInput = touchStartedOnInput;
        touchStartedOnInput = false;
        if (!onInput) Keyboard.dismiss();
      }}
    >
      {children}
    </View>
  );
}
