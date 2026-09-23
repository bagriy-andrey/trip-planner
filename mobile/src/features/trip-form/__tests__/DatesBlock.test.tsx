import { screen, userEvent } from "@testing-library/react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { DatesBlock } from "../components/DatesBlock";

const noop = () => undefined;
const base = {
  startDate: null,
  endDate: null,
  noDates: false,
  onChangeRange: noop,
  onChangeNoDates: noop,
  startFallback: "2026-09-21",
} as const;

const field = () => screen.getByTestId("trip-form-dates-field");

describe("DatesBlock", () => {
  it("shows one field with no default date; the first tap opens the calendar, nothing is chosen yet", async () => {
    const onChangeRange = jest.fn();
    await renderWithProviders(<DatesBlock {...base} onChangeRange={onChangeRange} />);
    expect(screen.getByText("Choose dates")).toBeOnTheScreen();
    expect(screen.queryByTestId("trip-form-calendar")).not.toBeOnTheScreen();
    await userEvent.press(field());
    expect(screen.getByTestId("trip-form-calendar")).toBeOnTheScreen();
    expect(screen.getByText("September 2026")).toBeOnTheScreen();
    expect(onChangeRange).not.toHaveBeenCalled();
  });

  it("reports the range only after the second day, then closes the calendar", async () => {
    const onChangeRange = jest.fn();
    await renderWithProviders(<DatesBlock {...base} onChangeRange={onChangeRange} />);
    await userEvent.press(field());
    await userEvent.press(screen.getByTestId("trip-form-calendar-day-2026-09-25"));
    expect(onChangeRange).not.toHaveBeenCalled();
    expect(screen.getByText("Now tap the last day")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("trip-form-calendar-day-2026-09-30"));
    expect(onChangeRange).toHaveBeenCalledWith("2026-09-25", "2026-09-30");
    expect(screen.queryByTestId("trip-form-calendar")).not.toBeOnTheScreen();
  });

  it("an earlier second tap moves the start instead of ending the range", async () => {
    const onChangeRange = jest.fn();
    await renderWithProviders(<DatesBlock {...base} onChangeRange={onChangeRange} />);
    await userEvent.press(field());
    await userEvent.press(screen.getByTestId("trip-form-calendar-day-2026-09-25"));
    await userEvent.press(screen.getByTestId("trip-form-calendar-day-2026-09-10"));
    expect(onChangeRange).not.toHaveBeenCalled();
    await userEvent.press(screen.getByTestId("trip-form-calendar-day-2026-09-12"));
    expect(onChangeRange).toHaveBeenCalledWith("2026-09-10", "2026-09-12");
  });

  it("shows the chosen range in the field and opens the calendar on its month", async () => {
    await renderWithProviders(<DatesBlock {...base} startDate="2026-10-05" endDate="2026-10-09" />);
    expect(field().props.accessibilityLabel).toMatch(/^Dates: .*5.*9/);
    await userEvent.press(field());
    expect(screen.getByText("October 2026")).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId("trip-form-calendar-next"));
    expect(screen.getByText("November 2026")).toBeOnTheScreen();
  });

  it("renders the error once, at the block", async () => {
    await renderWithProviders(<DatesBlock {...base} errorText="Dates are wrong" />);
    expect(screen.getAllByText("Dates are wrong")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent("Dates are wrong");
  });

  it("hides the field when the checkbox is set and reports the toggle", async () => {
    const onChangeNoDates = jest.fn();
    await renderWithProviders(
      <DatesBlock {...base} startDate="2026-10-05" endDate="2026-10-09" noDates onChangeNoDates={onChangeNoDates} />,
    );
    expect(screen.queryByTestId("trip-form-dates-field")).not.toBeOnTheScreen();
    expect(screen.getByRole("checkbox", { name: "No dates yet" })).toBeChecked();
    await userEvent.press(screen.getByRole("checkbox", { name: "No dates yet" }));
    expect(onChangeNoDates).toHaveBeenCalledWith(false);
  });
});
