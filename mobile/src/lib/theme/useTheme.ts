import { useContext } from "react";

import { ThemeContext } from "./ThemeProvider";
import type { ThemeContextValue } from "./ThemeProvider";

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return value;
}
