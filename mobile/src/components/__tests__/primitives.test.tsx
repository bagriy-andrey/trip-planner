import { screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { ReactElement } from "react";

import { family } from "@/lib/theme";
import { darkTokens, lightTokens } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import {
  AppText,
  Avatar,
  AvatarButton,
  EmptyState,
  GlassSurface,
  IconButton,
  MIN_HIT_SIZE,
  ModalHeader,
  Pill,
  PlaceholderField,
  PressableRow,
  PrimaryButton,
  SecondaryButton,
  SoonBadge,
  Stepper,
} from "../index";
import type {
  AccessibleProps,
  AvatarButtonProps,
  IconButtonProps,
  PressableRowProps,
  PrimaryButtonProps,
  SecondaryButtonProps,
} from "../index";

// --- Type-level contract (AC-19): `accessibilityLabel` must be REQUIRED. -----
// If any of these props became optional, the `true` assignment stops compiling
// (typecheck is part of the step's gate). No suppression directives involved.
type IsRequired<T, K extends keyof T> = Record<never, never> extends Pick<T, K> ? false : true;
const requiredLabels: [
  IsRequired<AccessibleProps, "accessibilityLabel">,
  IsRequired<PrimaryButtonProps, "accessibilityLabel">,
  IsRequired<SecondaryButtonProps, "accessibilityLabel">,
  IsRequired<IconButtonProps, "accessibilityLabel">,
  IsRequired<PressableRowProps, "accessibilityLabel">,
  IsRequired<AvatarButtonProps, "accessibilityLabel">,
] = [true, true, true, true, true, true];

function flatStyle(element: { props: { style?: unknown } }) {
  return StyleSheet.flatten(element.props.style as never) as Record<string, unknown>;
}

describe("interactive primitives: role, label, hit area (AC-19, AC-20)", () => {
  const cases: [string, ReactElement][] = [
    ["PrimaryButton", <PrimaryButton key="p" label="Go" accessibilityLabel="Primary action" />],
    ["SecondaryButton", <SecondaryButton key="s" label="Go" accessibilityLabel="Secondary action" />],
    ["IconButton", <IconButton key="i" accessibilityLabel="Icon action"><AppText>+</AppText></IconButton>],
    [
      "PressableRow",
      <PressableRow key="r" accessibilityLabel="Row action"><AppText>Row</AppText></PressableRow>,
    ],
    ["AvatarButton", <AvatarButton key="a" initials="AB" accessibilityLabel="Avatar action" />],
  ];

  it("declares accessibilityLabel as required in every interactive props type", () => {
    expect(requiredLabels.every(Boolean)).toBe(true);
  });

  it.each(cases)("%s exposes a button role and a non-empty label", async (_name, element) => {
    await renderWithProviders(element);
    const button = screen.getByRole("button");
    expect(button.props.accessibilityLabel).toEqual(expect.any(String));
    expect((button.props.accessibilityLabel as string).length).toBeGreaterThan(0);
  });

  it.each(cases)("%s guarantees a touch target of at least 44x44 on both axes", async (_name, element) => {
    await renderWithProviders(element);
    const style = flatStyle(screen.getByRole("button"));
    expect(MIN_HIT_SIZE).toBe(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
  });

  it("keeps a 44pt hit area when the visible icon circle is smaller", async () => {
    await renderWithProviders(
      <IconButton accessibilityLabel="Tiny" size={20}>
        <AppText>x</AppText>
      </IconButton>,
    );
    const style = flatStyle(screen.getByRole("button"));
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
  });

  it("calls onPress, and does not when disabled", async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await renderWithProviders(
      <>
        <PrimaryButton label="On" accessibilityLabel="Enabled" onPress={onPress} />
        <PrimaryButton label="Off" accessibilityLabel="Disabled" onPress={onPress} disabled />
      </>,
    );
    await user.press(screen.getByRole("button", { name: "Disabled" }));
    expect(onPress).not.toHaveBeenCalled();
    await user.press(screen.getByRole("button", { name: "Enabled" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("PressableRow accepts a link role", async () => {
    await renderWithProviders(
      <PressableRow accessibilityLabel="Open" accessibilityRole="link">
        <AppText>Row</AppText>
      </PressableRow>,
    );
    expect(screen.getByRole("link", { name: "Open" })).toBeTruthy();
  });
});

describe("AppText typography (AC-17, AC-21)", () => {
  it("uses IBM Plex Mono for the mono roles", async () => {
    await renderWithProviders(
      <>
        <AppText variant="mono">SVO</AppText>
        <AppText variant="monoSmall">12A</AppText>
      </>,
    );
    expect(flatStyle(screen.getByText("SVO")).fontFamily).toMatch(/^IBMPlexMono_/);
    expect(flatStyle(screen.getByText("12A")).fontFamily).toMatch(/^IBMPlexMono_/);
  });

  it("uses Manrope for every non-mono role", async () => {
    await renderWithProviders(
      <>
        <AppText variant="h1">h1</AppText>
        <AppText variant="h2">h2</AppText>
        <AppText variant="button">button</AppText>
        <AppText variant="body">body</AppText>
        <AppText variant="caption">caption</AppText>
      </>,
    );
    for (const name of ["h1", "h2", "button", "body", "caption"]) {
      expect(flatStyle(screen.getByText(name)).fontFamily).toMatch(/^Manrope_/);
    }
    expect(flatStyle(screen.getByText("h1")).fontFamily).toBe(family.display);
    expect(flatStyle(screen.getByText("body")).fontFamily).toBe(family.medium);
  });

  it("never turns off font scaling", async () => {
    await renderWithProviders(<AppText>scales</AppText>);
    expect(screen.getByText("scales").props.allowFontScaling).not.toBe(false);
  });

  it("resolves colour tokens against the active theme", async () => {
    await renderWithProviders(<AppText>themed</AppText>, { themePreference: "light" });
    expect(flatStyle(screen.getByText("themed")).color).toBe(lightTokens.text);
  });

  it("can draw textTertiary and danger text", async () => {
    await renderWithProviders(
      <>
        <AppText color="textTertiary">hint</AppText>
        <AppText color="danger">error</AppText>
      </>,
    );
    expect(flatStyle(screen.getByText("hint")).color).toBe(darkTokens.textTertiary);
    expect(flatStyle(screen.getByText("error")).color).toBe(darkTokens.danger);
  });

  it("uses the dark text token in the default (dark) theme", async () => {
    await renderWithProviders(<AppText>themed</AppText>);
    expect(flatStyle(screen.getByText("themed")).color).toBe(darkTokens.text);
  });
});

describe("PlaceholderField", () => {
  it("is not editable and masks secure values", async () => {
    await renderWithProviders(<PlaceholderField label="Password" value="hunter2" secure />);
    const input = screen.getByLabelText("Password");
    expect(input.props.editable).toBe(false);
    expect(input.props.secureTextEntry).toBe(true);
  });

  it("does not mask non-secure fields", async () => {
    await renderWithProviders(<PlaceholderField label="Email" value="a@b.co" />);
    const input = screen.getByLabelText("Email");
    expect(input.props.editable).toBe(false);
    expect(input.props.secureTextEntry).toBe(false);
  });
});

describe("Stepper", () => {
  it("shows the static value between labelled minus and plus buttons", async () => {
    const user = userEvent.setup();
    const onIncrement = jest.fn();
    const onDecrement = jest.fn();
    await renderWithProviders(
      <Stepper
        value={2}
        accessibilityLabel="Passengers"
        decrementAccessibilityLabel="Fewer passengers"
        incrementAccessibilityLabel="More passengers"
        onIncrement={onIncrement}
        onDecrement={onDecrement}
      />,
    );
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByLabelText("Passengers, 2")).toBeTruthy();
    await user.press(screen.getByRole("button", { name: "More passengers" }));
    await user.press(screen.getByRole("button", { name: "Fewer passengers" }));
    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onDecrement).toHaveBeenCalledTimes(1);
  });
});

describe("static and composite primitives", () => {
  it("SoonBadge renders the localized shared string in both locales", async () => {
    const en = await renderWithProviders(<SoonBadge />, { locale: "en" });
    expect(screen.getByText("soon")).toBeTruthy();
    en.unmount();
    await renderWithProviders(<SoonBadge />, { locale: "ru" });
    expect(screen.queryByText("soon")).toBeNull();
    expect(screen.getByLabelText("Скоро", { exact: false })).toBeTruthy();
  });

  it("Pill renders its label", async () => {
    await renderWithProviders(<Pill label="today" tone="accent" />);
    expect(screen.getByText("today")).toBeTruthy();
  });

  it("EmptyState renders title, description and action", async () => {
    await renderWithProviders(
      <EmptyState
        title="No trips"
        description="Add your first"
        action={<PrimaryButton label="Add" accessibilityLabel="Add trip" />}
      />,
    );
    expect(screen.getByText("No trips")).toBeTruthy();
    expect(screen.getByText("Add your first")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add trip" })).toBeTruthy();
  });

  it("ModalHeader defaults Cancel/Done to the shared strings and wires callbacks", async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    const onDone = jest.fn();
    await renderWithProviders(<ModalHeader title="New trip" onCancel={onCancel} onDone={onDone} />);
    expect(screen.getByRole("header", { name: "New trip" })).toBeTruthy();
    await user.press(screen.getByRole("button", { name: "Cancel" }));
    await user.press(screen.getByRole("button", { name: "Done" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("ModalHeader buttons keep a 44pt hit area", async () => {
    await renderWithProviders(<ModalHeader title="New trip" />);
    for (const name of ["Cancel", "Done"]) {
      const style = flatStyle(screen.getByRole("button", { name }));
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
      expect(style.minWidth).toBeGreaterThanOrEqual(44);
    }
  });

  it("Avatar is hidden from assistive tech (decorative)", async () => {
    await renderWithProviders(<Avatar initials="AB" />);
    expect(screen.queryByText("AB")).toBeNull();
    expect(screen.getByText("AB", { includeHiddenElements: true })).toBeTruthy();
  });

  it("GlassSurface renders children over the neutral Blur", async () => {
    await renderWithProviders(
      <GlassSurface strengthen>
        <AppText>on glass</AppText>
      </GlassSurface>,
    );
    expect(screen.getByText("on glass")).toBeTruthy();
  });
});
