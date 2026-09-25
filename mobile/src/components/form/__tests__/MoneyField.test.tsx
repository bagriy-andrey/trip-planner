import { screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { MoneyField } from "../MoneyField";

const base = { label: "Cost", placeholder: "0", value: "", onChangeText: jest.fn(), testID: "m" };

function fontOf(): unknown {
  return StyleSheet.flatten(screen.getByTestId("m").props.style)?.fontFamily;
}

describe("MoneyField", () => {
  it("filters typed text", async () => {
    const onChangeText = jest.fn();
    await renderWithProviders(<MoneyField {...base} onChangeText={onChangeText} />);
    await userEvent.setup().type(screen.getByTestId("m"), "1a2");
    expect(onChangeText).toHaveBeenLastCalledWith("2");
  });

  it("renders mono by default and not mono with mono={false}", async () => {
    await renderWithProviders(<MoneyField {...base} value="12" />);
    const monoFont = fontOf();
    screen.unmount();
    await renderWithProviders(<MoneyField {...base} value="12" mono={false} />);
    expect(fontOf()).not.toEqual(monoFont);
  });
});
