import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { darkTokens } from "@/lib/theme";
import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { FlightNumberField } from "../components/FlightNumberField";

const recognizedText = (name: string) => `${name} — from the directory, offline`;
const unrecognizedText = "Airline not recognized";

describe("FlightNumberField (AC-23, AC-24)", () => {
  it("shows no carrier line and a neutral border when empty", async () => {
    await renderWithProviders(
      <FlightNumberField
        label="Flight number"
        value=""
        onChangeText={jest.fn()}
        carrier={{ kind: "empty" }}
        recognizedText={recognizedText}
        unrecognizedText={unrecognizedText}
        testID="flight-number"
      />,
    );
    expect(screen.queryByTestId("flight-number-carrier")).not.toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId("flight-number").props.style).borderColor).toBe(
      darkTokens.surfaceBorder,
    );
  });

  it("shows the accent border and the recognized carrier name — no network call", async () => {
    await renderWithProviders(
      <FlightNumberField
        label="Flight number"
        value="LO1234"
        onChangeText={jest.fn()}
        carrier={{ kind: "recognized", name: "LOT Polish Airlines" }}
        recognizedText={recognizedText}
        unrecognizedText={unrecognizedText}
        testID="flight-number"
      />,
    );
    expect(screen.getByTestId("flight-number-carrier")).toHaveTextContent(
      "LOT Polish Airlines — from the directory, offline",
    );
    expect(StyleSheet.flatten(screen.getByTestId("flight-number").props.style).borderColor).toBe(
      darkTokens.accent,
    );
  });

  it("shows a neutral 'not recognized' line for an unrecognized code", async () => {
    await renderWithProviders(
      <FlightNumberField
        label="Flight number"
        value="ZZ999"
        onChangeText={jest.fn()}
        carrier={{ kind: "unrecognized" }}
        recognizedText={recognizedText}
        unrecognizedText={unrecognizedText}
        testID="flight-number"
      />,
    );
    expect(screen.getByTestId("flight-number-carrier")).toHaveTextContent(unrecognizedText);
    expect(StyleSheet.flatten(screen.getByTestId("flight-number").props.style).borderColor).toBe(
      darkTokens.surfaceBorder,
    );
  });
});
