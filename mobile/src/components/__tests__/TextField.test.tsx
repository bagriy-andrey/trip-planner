import { fireEvent, screen, userEvent } from "@testing-library/react-native";
import { createRef, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, TextInput } from "react-native";

import { darkTokens, lightTokens, typography } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { TextField } from "../index";
import type { TextFieldProps } from "../index";

function flatStyle(element: { props: { style?: unknown } }) {
  return StyleSheet.flatten(element.props.style as never) as Record<string, unknown>;
}

/** Controlled wrapper: the field is always driven by state, like on a real form. */
function Controlled(props: Partial<TextFieldProps> & { initial?: string }) {
  const { initial = "", ...rest } = props;
  const [value, setValue] = useState(initial);
  return <TextField label="Field" value={value} onChangeText={setValue} {...rest} />;
}

describe("TextField: real input contract (AC-38)", () => {
  it("is editable by default and exposes its label as the accessible name", async () => {
    await renderWithProviders(<Controlled />);
    const input = screen.getByLabelText("Field");
    expect(input.props.editable).toBe(true);
    expect(screen.getByText("Field")).toBeOnTheScreen();
  });

  it("email variant: address keyboard, no capitalisation or correction, email autofill", async () => {
    await renderWithProviders(<Controlled variant="email" />);
    const { props } = screen.getByLabelText("Field");
    expect(props.keyboardType).toBe("email-address");
    expect(props.autoCapitalize).toBe("none");
    expect(props.autoCorrect).toBe(false);
    expect(props.textContentType).toBe("emailAddress");
    expect(props.secureTextEntry).toBeFalsy();
  });

  it("password variants mask the value and hint the matching autofill", async () => {
    await renderWithProviders(
      <>
        <TextField label="Current" variant="password" value="" onChangeText={() => {}} />
        <TextField label="New" variant="newPassword" value="" onChangeText={() => {}} />
      </>,
    );
    const current = screen.getByLabelText("Current").props;
    const created = screen.getByLabelText("New").props;
    expect(current.secureTextEntry).toBe(true);
    expect(current.textContentType).toBe("password");
    expect(current.autoCapitalize).toBe("none");
    expect(current.autoCorrect).toBe(false);
    expect(created.secureTextEntry).toBe(true);
    expect(created.textContentType).toBe("newPassword");
  });

  it("code variant: digit keyboard, one-time-code autofill, and NOT the mono face", async () => {
    await renderWithProviders(<Controlled variant="code" initial="123456" />);
    const input = screen.getByLabelText("Field");
    expect(input.props.keyboardType).toBe("number-pad");
    expect(input.props.textContentType).toBe("oneTimeCode");
    const style = flatStyle(input);
    expect(style.fontFamily).toBe(typography.body.fontFamily);
    expect(style.fontFamily).not.toBe(typography.mono.fontFamily);
  });

  it("explicit props override the preset (e.g. a name field keeps capitalisation)", async () => {
    await renderWithProviders(<Controlled variant="text" autoCapitalize="words" autoCorrect />);
    const { props } = screen.getByLabelText("Field");
    expect(props.autoCapitalize).toBe("words");
    expect(props.autoCorrect).toBe(true);
    expect(props.secureTextEntry).toBeFalsy();
  });

  it("forwards returnKeyType and onSubmitEditing", async () => {
    const onSubmitEditing = jest.fn();
    await renderWithProviders(
      <Controlled returnKeyType="next" onSubmitEditing={onSubmitEditing} />,
    );
    const input = screen.getByLabelText("Field");
    expect(input.props.returnKeyType).toBe("next");
    fireEvent(input, "submitEditing");
    expect(onSubmitEditing).toHaveBeenCalledTimes(1);
  });

  it("forwards the ref to the underlying input", async () => {
    const ref = createRef<TextInput>();
    await renderWithProviders(<Controlled ref={ref} />);
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.focus).toBe("function");
  });

  it("moves focus to the next field on submit through the forwarded ref", async () => {
    const focusSpy = jest.fn();
    function Form() {
      const nextRef = useRef<TextInput>(null);
      return (
        <>
          <TextField
            label="First"
            value=""
            onChangeText={() => {}}
            returnKeyType="next"
            onSubmitEditing={() => {
              nextRef.current?.focus();
              focusSpy();
            }}
          />
          <TextField ref={nextRef} label="Second" value="" onChangeText={() => {}} />
        </>
      );
    }
    await renderWithProviders(<Form />);
    fireEvent(screen.getByLabelText("First"), "submitEditing");
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("typing and programmatic autofill take the same onChangeText path", async () => {
    const onChangeText = jest.fn();
    await renderWithProviders(<TextField label="Field" value="" onChangeText={onChangeText} />);
    const input = screen.getByLabelText("Field");
    const user = userEvent.setup();
    await user.type(input, "a");
    fireEvent.changeText(input, "from-keychain");
    expect(onChangeText).toHaveBeenNthCalledWith(1, "a");
    expect(onChangeText).toHaveBeenNthCalledWith(2, "from-keychain");
  });

  it("invents no text of its own: no placeholder unless the caller passes one", async () => {
    await renderWithProviders(<Controlled />);
    expect(screen.getByLabelText("Field").props.placeholder).toBeUndefined();
  });
});

describe.each([
  ["dark", darkTokens],
  ["light", lightTokens],
] as const)("TextField border and error colours, %s theme (AC-36, AC-38)", (themePreference, tokens) => {
  it("uses the surface border at rest, `accent` while focused, and back on blur", async () => {
    await renderWithProviders(<Controlled />, { themePreference });
    const input = screen.getByLabelText("Field");
    expect(flatStyle(input).borderColor).toBe(tokens.surfaceBorder);
    fireEvent(input, "focus");
    expect(flatStyle(screen.getByLabelText("Field")).borderColor).toBe(tokens.accent);
    fireEvent(input, "blur");
    expect(flatStyle(screen.getByLabelText("Field")).borderColor).toBe(tokens.surfaceBorder);
  });

  it("draws the error under the field in `danger` with a `danger` border, even when focused", async () => {
    await renderWithProviders(<Controlled errorText="Enter a valid email" />, { themePreference });
    const input = screen.getByLabelText("Field, Enter a valid email");
    expect(flatStyle(input).borderColor).toBe(tokens.danger);
    fireEvent(input, "focus");
    expect(flatStyle(screen.getByLabelText("Field, Enter a valid email")).borderColor).toBe(
      tokens.danger,
    );
    expect(flatStyle(screen.getByText("Enter a valid email")).color).toBe(tokens.danger);
  });
});

describe("TextField error is accessible (AC-40)", () => {
  it("puts the error into the field's accessible description, and drops it when cleared", async () => {
    function Toggle() {
      const [error, setError] = useState<string | undefined>("Wrong password");
      return (
        <>
          <TextField label="Password" value="" onChangeText={() => {}} errorText={error} />
          <TextField label="Trigger" value="" onChangeText={() => setError(undefined)} />
        </>
      );
    }
    await renderWithProviders(<Toggle />);
    expect(screen.getByLabelText("Password, Wrong password")).toBeOnTheScreen();
    expect(screen.getByRole("alert")).toHaveTextContent("Wrong password");
    fireEvent.changeText(screen.getByLabelText("Trigger"), "x");
    expect(screen.getByLabelText("Password")).toBeOnTheScreen();
    expect(screen.queryByText("Wrong password")).toBeNull();
  });

  it("announces the error when it appears, once, and not on unrelated re-renders", async () => {
    // The RN jest setup already makes this a shared jest.fn: calls from earlier tests leak in.
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    announce.mockClear();

    function Harness() {
      const [value, setValue] = useState("");
      const [error, setError] = useState<string | undefined>(undefined);
      return (
        <>
          <TextField label="Field" value={value} onChangeText={setValue} errorText={error} />
          <TextField label="Trigger" value="" onChangeText={() => setError("Too short")} />
        </>
      );
    }
    await renderWithProviders(<Harness />);
    expect(announce).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText("Trigger"), "x");
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith("Too short");

    // Typing re-renders the field but the message is unchanged: no second announcement.
    fireEvent.changeText(screen.getByLabelText("Field, Too short"), "a");
    expect(announce).toHaveBeenCalledTimes(1);
  });
});
