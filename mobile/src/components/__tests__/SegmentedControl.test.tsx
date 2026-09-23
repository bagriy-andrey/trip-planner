import { screen, userEvent } from "@testing-library/react-native";
import { useState } from "react";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { SegmentedControl } from "../SegmentedControl";
import { Stepper } from "../Stepper";
import { TextField } from "../TextField";

const OPTIONS = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
] as const;

function Harness() {
  const [v, setV] = useState<"a" | "b">("a");
  return <SegmentedControl label="Kind" options={OPTIONS} value={v} onChange={setV} testID="seg" />;
}

describe("SegmentedControl", () => {
  it("exposes radios with checked state and changes selection", async () => {
    await renderWithProviders(<Harness />);
    expect(screen.getByRole("radio", { name: "Alpha" })).toBeChecked();
    await userEvent.setup().press(screen.getByRole("radio", { name: "Beta" }));
    expect(screen.getByRole("radio", { name: "Beta" })).toBeChecked();
  });
});

describe("Stepper bounds", () => {
  const base = {
    accessibilityLabel: "Guests",
    decrementAccessibilityLabel: "Less",
    incrementAccessibilityLabel: "More",
  };
  it("disables buttons at min and max", async () => {
    await renderWithProviders(<Stepper {...base} value={1} min={1} max={3} />);
    expect(screen.getByRole("button", { name: "Less" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "More" })).toBeEnabled();
  });
  it("disables increment at max", async () => {
    await renderWithProviders(<Stepper {...base} value={3} min={1} max={3} />);
    expect(screen.getByRole("button", { name: "More" })).toBeDisabled();
  });
  it("leaves buttons enabled without bounds", async () => {
    await renderWithProviders(<Stepper {...base} value={0} />);
    expect(screen.getByRole("button", { name: "Less" })).toBeEnabled();
  });
});

describe("TextField presets", () => {
  it("applies url, decimal and currency presets and multiline", async () => {
    await renderWithProviders(
      <>
        <TextField label="U" value="" onChangeText={() => {}} variant="url" testID="u" />
        <TextField label="D" value="" onChangeText={() => {}} variant="decimal" testID="d" />
        <TextField label="C" value="" onChangeText={() => {}} variant="currency" testID="c" multiline mono />
      </>,
    );
    expect(screen.getByTestId("u").props.keyboardType).toBe("url");
    expect(screen.getByTestId("d").props.keyboardType).toBe("decimal-pad");
    expect(screen.getByTestId("c").props.maxLength).toBe(3);
    expect(screen.getByTestId("c").props.autoCapitalize).toBe("characters");
    expect(screen.getByTestId("c").props.multiline).toBe(true);
  });
});
