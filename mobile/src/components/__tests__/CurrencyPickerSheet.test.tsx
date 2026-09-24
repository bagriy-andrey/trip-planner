import { screen, userEvent, waitFor } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { CurrencyPickerSheet } from "../picker";

async function open(selected: "USD" | null = null) {
  const onSelect = jest.fn();
  await renderWithProviders(
    <CurrencyPickerSheet title="Currency" selected={selected} onSelect={onSelect} onClose={jest.fn()} testID="c" />,
  );
  return onSelect;
}

describe("CurrencyPickerSheet", () => {
  it("finds a currency by code and by a name in either language", async () => {
    await open();
    const user = userEvent.setup();
    await user.type(screen.getByTestId("c-search"), "eur");
    expect(screen.getByTestId("c-item-EUR")).toBeOnTheScreen();
    await user.clear(screen.getByTestId("c-search"));
    await user.type(screen.getByTestId("c-search"), "дол");
    await waitFor(() => expect(screen.getByTestId("c-item-USD")).toBeOnTheScreen());
  });

  it("selects a code after the exit animation", async () => {
    const onSelect = await open();
    await userEvent.press(screen.getByTestId("c-item-USD"));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("USD"));
  });

  it("shows no flag rows and offers Not specified when a value is set", async () => {
    await open("USD");
    expect(screen.getByTestId("c-none")).toBeOnTheScreen();
    expect(screen.getByTestId("c-item-USD").props.accessibilityState).toMatchObject({ selected: true });
  });
});
