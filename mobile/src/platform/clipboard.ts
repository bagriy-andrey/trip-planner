type ClipboardModule = typeof import("expo-clipboard");

/**
 * Copies text to the system clipboard. The native module is loaded lazily inside `try`: a dev
 * client built without `expo-clipboard` yields `false` instead of crashing the screen. The text
 * is never logged (it can be a booking reference or an address).
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    // Lazy `require` (not a top-level import): a missing native module must throw HERE, inside try.
    const Clipboard = require("expo-clipboard") as ClipboardModule;
    await Clipboard.setStringAsync(text);
    return true;
  } catch {
    return false;
  }
}
