import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { act, screen, userEvent } from "@testing-library/react-native";
import { Platform, Pressable } from "react-native";

import { renderWithProviders } from "@/test-utils/renderWithProviders";

import { useTimeSheetPicker } from "../timeSheetPicker";

const labels = { done: "Done", cancel: "Cancel", close: "Close" };

function Harness({ onPick }: { onPick: (time: string) => void }) {
  const picker = useTimeSheetPicker(labels);
  return (
    <>
      <Pressable testID="open" onPress={() => picker.open({ title: "Check-in", value: null, startTime: "15:00", onPick })} />
      {picker.element}
    </>
  );
}

describe("useTimeSheetPicker", () => {
  describe("iOS", () => {
    it("opens the sheet on the first tap, reports nothing until Done, and reports the start time on Done", async () => {
      const onPick = jest.fn();
      await renderWithProviders(<Harness onPick={onPick} />);
      await userEvent.press(screen.getByTestId("open"));
      expect(screen.getByTestId("time-sheet")).toBeOnTheScreen();
      expect(onPick).not.toHaveBeenCalled();
      await userEvent.press(screen.getByTestId("time-sheet-done"));
      expect(onPick).toHaveBeenCalledWith("15:00");
    });

    it("does not report anything on Cancel", async () => {
      const onPick = jest.fn();
      await renderWithProviders(<Harness onPick={onPick} />);
      await userEvent.press(screen.getByTestId("open"));
      await userEvent.press(screen.getByTestId("time-sheet-cancel"));
      expect(onPick).not.toHaveBeenCalled();
    });
  });

  describe("Android", () => {
    const original = Platform.OS;
    beforeEach(() => {
      Object.defineProperty(Platform, "OS", { configurable: true, get: () => "android" });
    });
    afterEach(() => {
      Object.defineProperty(Platform, "OS", { configurable: true, get: () => original });
      jest.mocked(DateTimePickerAndroid.open).mockClear();
    });

    it("opens the system dialog at the start time and renders no sheet", async () => {
      const onPick = jest.fn();
      await renderWithProviders(<Harness onPick={onPick} />);
      await act(async () => {
        await userEvent.press(screen.getByTestId("open"));
      });
      expect(DateTimePickerAndroid.open).toHaveBeenCalledWith(expect.objectContaining({ mode: "time" }));
      expect(screen.queryByTestId("time-sheet")).not.toBeOnTheScreen();
      // The jest mock "sets" its own value at once.
      expect(onPick).toHaveBeenCalledWith("15:00");
    });
  });
});
