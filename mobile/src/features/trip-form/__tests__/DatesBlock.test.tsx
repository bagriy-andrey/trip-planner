import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { DatesBlock } from "../components/DatesBlock";

// Records what the block hands to the platform picker (the real one is covered in `platform/`).
const mockPickerProps: {
  value: string | null;
  minimumDate?: string;
  accessibilityLabel: string;
  testID?: string;
}[] = [];
jest.mock("@/platform/datePicker", () => {
  const { Pressable } = require("react-native");
  return {
    DatePicker: (props: {
      value: string | null;
      onChange: (date: string) => void;
      minimumDate?: string;
      accessibilityLabel: string;
      testID?: string;
    }) => {
      mockPickerProps.push(props);
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={props.accessibilityLabel}
          testID={props.testID}
          onPress={() => props.onChange("2030-01-02")}
        />
      );
    },
  };
});

const noop = () => undefined;
const base = {
  startDate: null,
  endDate: null,
  noDates: false,
  onChangeStart: noop,
  onChangeEnd: noop,
  onChangeNoDates: noop,
  startFallback: "2026-09-21",
  endFallback: "2026-09-21",
} as const;

beforeEach(() => {
  mockPickerProps.length = 0;
});

describe("DatesBlock", () => {
  it("shows an empty button (no picker) until a date exists, and applies the fallback on tap", async () => {
    const onChangeStart = jest.fn();
    const onChangeEnd = jest.fn();
    await renderWithProviders(
      <DatesBlock {...base} onChangeStart={onChangeStart} onChangeEnd={onChangeEnd} endFallback="2026-10-01" />,
    );
    expect(mockPickerProps).toHaveLength(0);
    await userEvent.press(screen.getByRole("button", { name: "Start" }));
    await userEvent.press(screen.getByRole("button", { name: "End" }));
    expect(onChangeStart).toHaveBeenCalledWith("2026-09-21");
    expect(onChangeEnd).toHaveBeenCalledWith("2026-10-01");
  });

  it("limits the end picker to the start date and names both buttons with their dates", async () => {
    await renderWithProviders(<DatesBlock {...base} startDate="2026-10-05" endDate="2026-10-09" />);
    const start = mockPickerProps.find((props) => props.testID === "trip-form-start-date");
    const end = mockPickerProps.find((props) => props.testID === "trip-form-end-date");
    expect(start?.minimumDate).toBeUndefined();
    expect(end?.minimumDate).toBe("2026-10-05");
    expect(start?.accessibilityLabel).toMatch(/^Start date: .*5/);
    expect(end?.accessibilityLabel).toMatch(/^End date: .*9/);
  });

  it("renders the error once, at the block, not on each button", async () => {
    await renderWithProviders(<DatesBlock {...base} errorText="Dates are wrong" />);
    expect(screen.getAllByText("Dates are wrong")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Dates are wrong");
  });

  it("hides the pickers when the checkbox is set and reports the toggle", async () => {
    const onChangeNoDates = jest.fn();
    await renderWithProviders(
      <DatesBlock {...base} startDate="2026-10-05" endDate="2026-10-09" noDates onChangeNoDates={onChangeNoDates} />,
    );
    expect(screen.queryByTestId("trip-form-start-date")).not.toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "No dates yet" })).toBeChecked();
    await userEvent.press(screen.getByRole("checkbox", { name: "No dates yet" }));
    expect(onChangeNoDates).toHaveBeenCalledWith(false);
  });
});
