import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { screen, userEvent } from "@testing-library/react-native";
import { Platform } from "react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { DatePicker } from "../datePicker";

const openDialog = jest.mocked(DateTimePickerAndroid.open);

describe("DatePicker (platform boundary)", () => {
  afterEach(() => {
    openDialog.mockClear();
  });

  describe("iOS", () => {
    it("reports the picked day as a calendar date, not a Date", async () => {
      const onChange = jest.fn();
      await renderWithProviders(
        <DatePicker
          value="2026-10-05"
          onChange={onChange}
          accessibilityLabel="Start date"
          testID="picker"
        />,
      );
      // The jest mock "sets" its own `value` back through onChange.
      await userEvent.press(screen.getByTestId("picker"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("2026-10-05");
    });

    it("does not shift the day for the first and last day of a year or a leap day", async () => {
      const seen: string[] = [];
      for (const day of ["2026-01-01", "2026-12-31", "2028-02-29"] as const) {
        const { unmount } = await renderWithProviders(
          <DatePicker
            value={day}
            onChange={(next) => seen.push(next)}
            accessibilityLabel="d"
            testID="picker"
          />,
        );
        await userEvent.press(screen.getByTestId("picker"));
        unmount();
      }
      expect(seen).toEqual(["2026-01-01", "2026-12-31", "2028-02-29"]);
    });

    it("passes the label, the bounds (as local-noon Dates) and today when there is no value", async () => {
      await renderWithProviders(
        <DatePicker
          value={null}
          onChange={jest.fn()}
          minimumDate="2026-09-21"
          maximumDate="2027-01-01"
          accessibilityLabel="End date"
          testID="picker"
        />,
        { today: "2026-09-21" },
      );
      const props = screen.UNSAFE_getByType(DateTimePicker).props as {
        value: Date;
        minimumDate: Date;
        maximumDate: Date;
        accessibilityLabel: string;
      };
      expect(props.accessibilityLabel).toBe("End date");
      expect([props.value, props.minimumDate, props.maximumDate].map(localDay)).toEqual([
        "2026-09-21",
        "2026-09-21",
        "2027-01-01",
      ]);
    });

    it("ignores a dismissed event", async () => {
      const onChange = jest.fn();
      await renderWithProviders(
        <DatePicker value="2026-10-05" onChange={onChange} accessibilityLabel="d" />,
      );
      const props = screen.UNSAFE_getByType(DateTimePicker).props as {
        onChange: (event: { type: string; nativeEvent: object }, date?: Date) => void;
      };
      props.onChange({ type: "dismissed", nativeEvent: {} });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("Android", () => {
    const original = Platform.OS;
    beforeEach(() => {
      Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    });
    afterEach(() => {
      Object.defineProperty(Platform, "OS", { configurable: true, get: () => original });
    });

    it("shows the placeholder, and opens the imperative dialog only on press", async () => {
      const onChange = jest.fn();
      await renderWithProviders(
        <DatePicker
          value={null}
          onChange={onChange}
          accessibilityLabel="Start date"
          placeholder="Pick a date"
          testID="picker"
        />,
      );
      expect(screen.getByText("Pick a date")).toBeOnTheScreen();
      expect(openDialog).not.toHaveBeenCalled();

      await userEvent.press(screen.getByRole("button", { name: "Start date" }));
      expect(openDialog).toHaveBeenCalledTimes(1);
      // The mock "sets" its initial value, which is today when nothing was chosen.
      expect(onChange).toHaveBeenCalledWith("2026-09-21");
    });

    it("shows the formatted chosen day", async () => {
      await renderWithProviders(
        <DatePicker value="2026-10-05" onChange={jest.fn()} accessibilityLabel="Start date" />,
      );
      expect(screen.getByText("Oct 5, 2026")).toBeOnTheScreen();
    });
  });
});

function localDay(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
