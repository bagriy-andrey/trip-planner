import { screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { layout } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { ToggleSwitch } from "../ToggleSwitch";

describe("ToggleSwitch", () => {
  it("is a switch with a checked state and toggles on press", async () => {
    const onChange = jest.fn();
    await renderWithProviders(<ToggleSwitch label="Baggage" value onChange={onChange} testID="sw" />);
    expect(screen.getByRole("switch", { name: "Baggage" })).toBeChecked();
    await userEvent.setup().press(screen.getByTestId("sw"));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it("is unchecked when off and its hit area is at least 44pt", async () => {
    await renderWithProviders(<ToggleSwitch label="Baggage" value={false} onChange={jest.fn()} testID="sw" />);
    expect(screen.getByRole("switch")).not.toBeChecked();
    const style = StyleSheet.flatten(screen.getByTestId("sw").props.style) as { minWidth: number; minHeight: number };
    expect(style.minWidth).toBeGreaterThanOrEqual(layout.minTouch);
    expect(style.minHeight).toBeGreaterThanOrEqual(layout.minTouch);
  });
});
