import { SEGMENT_PASSENGERS_MAX, SEGMENT_PASSENGERS_MIN } from "@tripplanner/shared";
import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { PassengerStepper } from "../components/PassengerStepper";

function renderStepper(value: number, extra: { onIncrement?: () => void; onDecrement?: () => void } = {}) {
  return renderWithProviders(
    <PassengerStepper
      label="Passengers"
      value={value}
      decrementAccessibilityLabel="Decrease passengers"
      incrementAccessibilityLabel="Increase passengers"
      onDecrement={extra.onDecrement ?? jest.fn()}
      onIncrement={extra.onIncrement ?? jest.fn()}
      testID="stepper"
    />,
  );
}

describe("PassengerStepper (AC-36)", () => {
  it("starts at 1 and shows the value (not mono)", async () => {
    await renderStepper(SEGMENT_PASSENGERS_MIN);
    expect(screen.getByTestId("stepper-value")).toHaveTextContent("1");
  });

  it("disables decrement at the minimum", async () => {
    await renderStepper(SEGMENT_PASSENGERS_MIN);
    expect(screen.getByRole("button", { name: "Decrease passengers" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase passengers" })).toBeEnabled();
  });

  it("disables increment at the maximum", async () => {
    await renderStepper(SEGMENT_PASSENGERS_MAX);
    expect(screen.getByRole("button", { name: "Increase passengers" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease passengers" })).toBeEnabled();
  });

  it("calls onIncrement/onDecrement on press", async () => {
    const onIncrement = jest.fn();
    const user = userEvent.setup();
    await renderStepper(2, { onIncrement });
    await user.press(screen.getByRole("button", { name: "Increase passengers" }));
    expect(onIncrement).toHaveBeenCalledTimes(1);
  });
});
