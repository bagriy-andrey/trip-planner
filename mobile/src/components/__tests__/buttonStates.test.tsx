import { screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { darkTokens, lightTokens } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { MIN_HIT_SIZE, PrimaryButton, SecondaryButton } from "../index";

function flatStyle(element: { props: { style?: unknown } }) {
  return StyleSheet.flatten(element.props.style as never) as Record<string, unknown>;
}

describe.each([
  ["dark", darkTokens],
  ["light", lightTokens],
] as const)("disabled buttons, %s theme (AC-42)", (themePreference, tokens) => {
  it("PrimaryButton: `divider` background, `textTertiary` text, no opacity", async () => {
    await renderWithProviders(
      <PrimaryButton label="Send" accessibilityLabel="Send form" disabled />,
      { themePreference },
    );
    const style = flatStyle(screen.getByRole("button"));
    expect(style.backgroundColor).toBe(tokens.divider);
    expect(style.opacity).toBeUndefined();
    expect(flatStyle(screen.getByText("Send")).color).toBe(tokens.textTertiary);
  });

  it("SecondaryButton: `divider` background, `textTertiary` text, no opacity", async () => {
    await renderWithProviders(
      <SecondaryButton label="Later" accessibilityLabel="Later action" disabled />,
      { themePreference },
    );
    const style = flatStyle(screen.getByRole("button"));
    expect(style.backgroundColor).toBe(tokens.divider);
    expect(style.opacity).toBeUndefined();
    expect(flatStyle(screen.getByText("Later")).color).toBe(tokens.textTertiary);
  });

  it("enabled buttons keep their active colours", async () => {
    await renderWithProviders(
      <>
        <PrimaryButton label="Send" accessibilityLabel="Send form" />
        <SecondaryButton label="Later" accessibilityLabel="Later action" />
      </>,
      { themePreference },
    );
    const primary = screen.getByRole("button", { name: "Send form" });
    const secondary = screen.getByRole("button", { name: "Later action" });
    expect(flatStyle(primary).backgroundColor).toBe(tokens.accent);
    expect(flatStyle(screen.getByText("Send")).color).toBe(tokens.onAccent);
    expect(flatStyle(secondary).backgroundColor).toBe(tokens.surface);
    expect(flatStyle(screen.getByText("Later")).color).toBe(tokens.text);
  });
});

describe("PrimaryButton loading (AC-14)", () => {
  it("shows a spinner inside the button, is disabled and busy, and never fires onPress", async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <PrimaryButton
        label="Send"
        accessibilityLabel="Send form"
        testID="submit"
        loading
        onPress={onPress}
      />,
    );
    const button = screen.getByRole("button");
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: true, busy: true }),
    );
    expect(screen.getByTestId("submit-spinner")).toBeOnTheScreen();
    await userEvent.setup().press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("has no spinner and stays pressable when not loading", async () => {
    const onPress = jest.fn();
    await renderWithProviders(
      <PrimaryButton label="Send" accessibilityLabel="Send form" testID="submit" onPress={onPress} />,
    );
    expect(screen.queryByTestId("submit-spinner")).toBeNull();
    const button = screen.getByRole("button");
    expect(button.props.accessibilityState).toEqual(
      expect.objectContaining({ disabled: false, busy: false }),
    );
    await userEvent.setup().press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("keeps the 44pt hit area while loading", async () => {
    await renderWithProviders(<PrimaryButton label="Send" accessibilityLabel="Send form" loading />);
    const style = flatStyle(screen.getByRole("button"));
    expect(style.minHeight).toBeGreaterThanOrEqual(MIN_HIT_SIZE);
    expect(style.minWidth).toBeGreaterThanOrEqual(MIN_HIT_SIZE);
  });
});
