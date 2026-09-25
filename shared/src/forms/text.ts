/** Code points, not UTF-16 units: an emoji counts once. */
export function codePointLength(value: string): number {
  return Array.from(value).length;
}

/** Single-line text: trim + collapse every whitespace run. Empty gives `null`. */
export function singleLine(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  return text === "" ? null : text;
}

/** Multi-line text: trim + CRLF/CR to LF; inner line breaks are kept. Empty gives `null`. */
export function multiLine(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\r\n?/g, "\n");
  return text === "" ? null : text;
}

export function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
