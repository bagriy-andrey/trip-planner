import { screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { useState } from "react";

import { layout } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { Checkbox } from "../Checkbox";
import { Icon } from "../Icon";
import type { CheckboxProps } from "../Checkbox";

// The label must be required: assigning `true` per key fails to compile if it ever becomes optional.
type IsRequired<T, K extends keyof T> = object extends Pick<T, K> ? false : true;
const labelIsRequired: [IsRequired<CheckboxProps, "accessibilityLabel">] = [true];

function Harness({ initial = false, disabled }: { initial?: boolean; disabled?: boolean }) {
  const [checked, setChecked] = useState(initial);
  return (
    <Checkbox
      accessibilityLabel="No dates yet"
      checked={checked}
      onChange={setChecked}
      disabled={disabled}
    />
  );
}

describe("Checkbox", () => {
  it("requires an accessibility label in its prop type", () => {
    expect(labelIsRequired).toEqual([true]);
  });

  it("has the checkbox role, a non-empty name and a readable checked state", async () => {
    await renderWithProviders(<Harness />);
    const box = screen.getByRole("checkbox", { name: "No dates yet" });
    expect(box).not.toBeChecked();
    expect(box.props.accessibilityLabel).toBeTruthy();
  });

  it("toggles on press and reports the new state", async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <Checkbox accessibilityLabel="No dates yet" checked={false} onChange={onChange} />,
    );
    await userEvent.press(screen.getByRole("checkbox", { name: "No dates yet" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("flips between checked and unchecked when controlled", async () => {
    await renderWithProviders(<Harness />);
    const user = userEvent.setup();
    await user.press(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).toBeChecked();
    await user.press(screen.getByRole("checkbox"));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("draws the Feather check icon only when checked (no text glyph)", async () => {
    await renderWithProviders(<Checkbox accessibilityLabel="L" checked onChange={jest.fn()} />);
    expect(screen.UNSAFE_queryAllByType(Icon)).toHaveLength(1);
    expect(screen.UNSAFE_getByType(Icon).props.name).toBe("check");
  });

  it("draws no icon while unchecked", async () => {
    await renderWithProviders(
      <Checkbox accessibilityLabel="L" checked={false} onChange={jest.fn()} />,
    );
    expect(screen.UNSAFE_queryAllByType(Icon)).toHaveLength(0);
  });

  it("has a touch target of at least 44x44 on both axes", async () => {
    await renderWithProviders(<Harness />);
    const style = StyleSheet.flatten(
      screen.getByRole("checkbox").props.style as never,
    ) as Record<string, unknown>;
    expect(layout.minTouch).toBe(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
  });

  it("does not fire when disabled and reports the disabled state", async () => {
    const onChange = jest.fn();
    await renderWithProviders(
      <Checkbox accessibilityLabel="No dates yet" checked={false} onChange={onChange} disabled />,
    );
    const box = screen.getByRole("checkbox");
    expect(box).toBeDisabled();
    await userEvent.press(box);
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(["light", "dark"] as const)("renders in the %s theme", async (themePreference) => {
    await renderWithProviders(<Harness initial />, { themePreference });
    expect(screen.getByRole("checkbox")).toBeChecked();
  });
});
