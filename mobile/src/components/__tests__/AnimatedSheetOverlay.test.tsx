import { screen, userEvent, waitFor } from "@testing-library/react-native";
import { useState } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";

import { motion } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { AnimatedSheetOverlay } from "../AnimatedSheetOverlay";

function translateY(): number {
  const style = StyleSheet.flatten(screen.getByTestId("sheet-panel").props.style) as {
    transform: { translateY: number }[];
  };
  return style.transform[0]?.translateY ?? Number.NaN;
}

describe("AnimatedSheetOverlay topInset and handle", () => {
  it("pins the panel between topInset and the bottom and draws a handle only on request", async () => {
    await renderWithProviders(
      <AnimatedSheetOverlay closeLabel="Close" onRequestClose={jest.fn()} closing={false} onExited={jest.fn()} topInset={104} handle testID="sheet">
        <Text>body</Text>
      </AnimatedSheetOverlay>,
    );
    const style = StyleSheet.flatten(screen.getByTestId("sheet-panel").props.style) as Record<string, unknown>;
    expect(style).toMatchObject({ position: "absolute", top: 104, bottom: 0 });
    expect(screen.UNSAFE_getAllByProps({ accessibilityElementsHidden: true }).length).toBeGreaterThan(0);
  });

  it("keeps the content-height layout without topInset", async () => {
    await renderWithProviders(
      <AnimatedSheetOverlay closeLabel="Close" onRequestClose={jest.fn()} closing={false} onExited={jest.fn()} testID="sheet">
        <Text>body</Text>
      </AnimatedSheetOverlay>,
    );
    const style = StyleSheet.flatten(screen.getByTestId("sheet-panel").props.style) as Record<string, unknown>;
    expect(style.position).toBeUndefined();
    expect(screen.UNSAFE_queryAllByProps({ accessibilityElementsHidden: true })).toHaveLength(0);
  });
});

describe("AnimatedSheetOverlay motion", () => {
  it("mounts off-screen (not at its end state), then slides to 0; slides back down on close", async () => {
    const onExited = jest.fn();
    function Harness() {
      const [closing, setClosing] = useState(false);
      return (
        <>
          <Pressable testID="close" onPress={() => setClosing(true)} />
          <AnimatedSheetOverlay closeLabel="Close" onRequestClose={jest.fn()} closing={closing} onExited={onExited} testID="sheet">
            <Text>body</Text>
          </AnimatedSheetOverlay>
        </>
      );
    }
    const timing = jest.spyOn(Animated, "timing");
    await renderWithProviders(<Harness />);
    // First frame: the panel is below the window, not already in place.
    expect(translateY()).toBeGreaterThan(0);
    // The enter animation is started toward the end state with the theme duration. (Values driven
    // natively do not re-render the JS style, so the end state is asserted through the animation.)
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: 1, duration: motion.sheetEnter, useNativeDriver: true }),
    );

    await userEvent.press(screen.getByTestId("close", { includeHiddenElements: true }));
    await waitFor(() => expect(onExited).toHaveBeenCalledTimes(1));
    expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  });
});

describe("AnimatedSheetOverlay swipeToClose", () => {
  /** Drives the panel's PanResponder handlers with a synthetic touch history (drag down by `dy`). */
  function drag(dy: number) {
    const panel = screen.getByTestId("sheet-panel");
    const touch = {
      touchActive: true,
      startPageX: 0,
      startPageY: 0,
      startTimeStamp: 0,
      currentPageX: 0,
      currentPageY: dy,
      currentTimeStamp: 1,
      previousPageX: 0,
      previousPageY: 0,
      previousTimeStamp: 0,
    };
    const event = {
      nativeEvent: { touches: [{ pageX: 0, pageY: dy }], changedTouches: [{ pageX: 0, pageY: dy }], timestamp: 1 },
      touchHistory: { touchBank: [touch], numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: 1 },
    };
    const { onMoveShouldSetResponder, onResponderGrant, onResponderMove, onResponderRelease } = panel.props;
    onMoveShouldSetResponder?.(event);
    onResponderGrant?.(event);
    onResponderMove?.(event);
    onResponderRelease?.(event);
  }

  it("a long downward drag asks to close", async () => {
    const onRequestClose = jest.fn();
    await renderWithProviders(
      <AnimatedSheetOverlay closeLabel="Close" onRequestClose={onRequestClose} closing={false} onExited={jest.fn()} swipeToClose testID="sheet">
        <Text>body</Text>
      </AnimatedSheetOverlay>,
    );
    drag(400);
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });

  it("has no gesture without the prop", async () => {
    await renderWithProviders(
      <AnimatedSheetOverlay closeLabel="Close" onRequestClose={jest.fn()} closing={false} onExited={jest.fn()} testID="sheet">
        <Text>body</Text>
      </AnimatedSheetOverlay>,
    );
    expect(screen.getByTestId("sheet-panel").props.onResponderRelease).toBeUndefined();
  });
});
