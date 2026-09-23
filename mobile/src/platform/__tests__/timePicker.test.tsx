import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { screen, userEvent } from "@testing-library/react-native";
import { Platform } from "react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { TimePicker } from "../datePicker";

const openDialog = jest.mocked(DateTimePickerAndroid.open);

describe("TimePicker (platform boundary)", () => {
  afterEach(() => {
    openDialog.mockClear();
  });

  describe("iOS", () => {
    it("reports the picked time as \"HH:MM\", not a Date", async () => {
      const onChange = jest.fn();
      await renderWithProviders(
        <TimePicker value="14:05" onChange={onChange} accessibilityLabel="Departure time" testID="picker" />,
      );
      // The jest mock "sets" its own `value` back through onChange.
      await userEvent.press(screen.getByTestId("picker"));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith("14:05");
    });

    it("round-trips midnight and the last minute of the day without shifting", async () => {
      const seen: string[] = [];
      for (const time of ["00:00", "23:59", "09:00"] as const) {
        const { unmount } = await renderWithProviders(
          <TimePicker value={time} onChange={(next) => seen.push(next)} accessibilityLabel="t" testID="picker" />,
        );
        await userEvent.press(screen.getByTestId("picker"));
        unmount();
      }
      expect(seen).toEqual(["00:00", "23:59", "09:00"]);
    });

    it("passes the label and mode=time to the underlying picker; opens at noon when null", async () => {
      await renderWithProviders(
        <TimePicker value={null} onChange={jest.fn()} accessibilityLabel="Arrival time" testID="picker" />,
      );
      const props = screen.UNSAFE_getByType(DateTimePicker).props as {
        mode: string;
        value: Date;
        accessibilityLabel: string;
      };
      expect(props.mode).toBe("time");
      expect(props.accessibilityLabel).toBe("Arrival time");
      expect([props.value.getHours(), props.value.getMinutes()]).toEqual([12, 0]);
    });

    it("ignores a dismissed event", async () => {
      const onChange = jest.fn();
      await renderWithProviders(<TimePicker value="14:05" onChange={onChange} accessibilityLabel="t" />);
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
        <TimePicker
          value={null}
          onChange={onChange}
          accessibilityLabel="Departure time"
          placeholder="Pick a time"
          testID="picker"
        />,
      );
      expect(screen.getByText("Pick a time")).toBeOnTheScreen();
      expect(openDialog).not.toHaveBeenCalled();

      await userEvent.press(screen.getByRole("button", { name: "Departure time" }));
      expect(openDialog).toHaveBeenCalledTimes(1);
      expect(openDialog.mock.calls[0]?.[0]).toMatchObject({ mode: "time" });
      // The mock "sets" its initial value, which is noon when nothing was chosen.
      expect(onChange).toHaveBeenCalledWith("12:00");
    });

    it("shows the formatted chosen time", async () => {
      await renderWithProviders(
        <TimePicker value="07:05" onChange={jest.fn()} accessibilityLabel="Departure time" />,
      );
      expect(screen.getByText("7:05 AM")).toBeOnTheScreen();
    });
  });
});
