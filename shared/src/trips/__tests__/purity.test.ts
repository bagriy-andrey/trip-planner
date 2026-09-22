import { describe, expect, it } from "vitest";

// Minimal typing for Vite's glob import (this package has no `vite/client` types: `types: []`).
declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options: { query: string; import: string; eager: true },
    ): Record<string, string>;
  }
}

describe("runtime neutrality of the places / trips / forms modules", () => {
  const sources = import.meta.glob("/src/**/*.ts", { query: "?raw", import: "default", eager: true });
  const files = Object.entries(sources).filter(
    ([path]) =>
      !path.includes("/__tests__/") &&
      (path.startsWith("/src/places/") || path.startsWith("/src/trips/") || path.startsWith("/src/forms/")),
  );
  const specifierPattern = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']/g;

  it("scans the module sources", () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  it("imports only relative modules and zod (no react-native, supabase, node:* or DOM libs)", () => {
    const offenders: string[] = [];
    for (const [path, source] of files) {
      for (const match of source.matchAll(specifierPattern)) {
        const specifier = match[1] ?? "";
        if (!(specifier.startsWith(".") || specifier === "zod")) offenders.push(`${path}: ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never reads the clock or randomness: 'today' is always injected (AC-24)", () => {
    const offenders: string[] = [];
    for (const [path, source] of files) {
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (/\bDate\.now\s*\(/.test(code)) offenders.push(`${path}: Date.now`);
      if (/\bnew\s+Date\s*\(\s*\)/.test(code)) offenders.push(`${path}: new Date()`);
      if (/\bMath\.random\s*\(/.test(code)) offenders.push(`${path}: Math.random`);
      if (/\bperformance\s*\./.test(code)) offenders.push(`${path}: performance`);
    }
    expect(offenders).toEqual([]);
  });

  it("uses Intl only to validate a time zone (never to format), and no Unicode property escapes or normalize()", () => {
    const intlUsers: string[] = [];
    const offenders: string[] = [];
    for (const [path, source] of files) {
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (/\bIntl\b/.test(code)) intlUsers.push(path);
      if (/\\p\{/.test(code)) offenders.push(`${path}: \\p{...}`);
      if (/\.normalize\s*\(/.test(code)) offenders.push(`${path}: normalize()`);
      if (/toLocale\w*String|\.format\(/.test(code)) offenders.push(`${path}: locale formatting`);
    }
    expect(intlUsers).toEqual(["/src/places/timeZone.ts"]);
    expect(offenders).toEqual([]);
  });

  it("puts no user-facing text in shared: error values are the pinned ids only", () => {
    const cyrillic = /[А-Яа-яЁё]/;
    const offenders: string[] = [];
    for (const [path, source] of files) {
      if (path.endsWith("/places/directory.ts")) continue; // place NAMES are data, not UI text
      const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      if (path.endsWith("/places/fold.ts")) continue; // Cyrillic letters of the fold table
      if (cyrillic.test(code)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });
});
