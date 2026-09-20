// Static architecture guardrails (PLAN-01 Step 9). They read the SOURCE, not the
// runtime, and back the "architectural" ACs: 16, 17, 24, 25, 26, 27, 33.
//
// Scope: everything under app/ and src/, except test files (`__tests__/`, `*.test.*`,
// `*.spec.*`) — tests legitimately contain Russian strings, literals and mocks.
// Comments are ignored for the "code" rules (a comment may say "no Platform.OS here"),
// but NOT for suppression directives: `@ts-ignore` in a comment is still a violation.
// Every failure lists `file:line` so the offender is one click away.

import ts from "typescript";

import { ALLOWED_SETTING_KEYS } from "@/lib/storage";

// `@types/node` is not a dependency of this package (tsconfig `types: ["jest"]`), so the few
// Node APIs this test needs are typed locally instead of widening the package's globals.
declare const __dirname: string;
interface DirEntry {
  name: string;
  isDirectory(): boolean;
}
interface NodeFs {
  readdirSync(dir: string, options: { withFileTypes: true }): DirEntry[];
  readFileSync(file: string, encoding: "utf8"): string;
}
interface NodePath {
  join(...parts: string[]): string;
  resolve(...parts: string[]): string;
}
const fs = jest.requireActual<NodeFs>("node:fs");
const path = jest.requireActual<NodePath>("node:path");

const MOBILE_ROOT = path.resolve(__dirname, "..");
const SCAN_ROOTS = ["app", "src"];

// Allow-lists (posix paths relative to mobile/). Each entry is a deliberate exception.
const I18N_LOCALES = "src/lib/i18n/locales/";
const THEME_DIR = "src/lib/theme/";
const PLATFORM_DIR = "src/platform/";
const STORAGE_DIR = "src/lib/storage/";
// The font loader maps family names to bundled assets. It imports `@expo-google-fonts/*`
// (package paths contain the family names) and takes every family NAME from the theme's
// FONT_FAMILY, so it is the theme's asset half, not a second source of truth (AC-17).
const FONT_LOADER = "src/lib/fonts.ts";

interface Violation {
  file: string;
  line: number;
  rule: string;
  excerpt: string;
}

// ---------------------------------------------------------------------------
// Source discovery
// ---------------------------------------------------------------------------

function isTestFile(relative: string): boolean {
  return /(^|\/)__tests__\//.test(relative) || /\.(test|spec)\.[tj]sx?$/.test(relative);
}

function listSourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(MOBILE_ROOT, dir), { withFileTypes: true })) {
      const relative = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") walk(relative);
      } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name) && !isTestFile(relative)) {
        out.push(relative);
      }
    }
  };
  SCAN_ROOTS.forEach(walk);
  return out.sort();
}

// ---------------------------------------------------------------------------
// Comment masking (AST based, so `//` inside strings / JSX text is not a comment)
// ---------------------------------------------------------------------------

function isJsDocKind(kind: ts.SyntaxKind): boolean {
  return kind >= ts.SyntaxKind.FirstJSDocNode && kind <= ts.SyntaxKind.LastJSDocNode;
}

/** Returns `text` with every comment replaced by spaces (newlines kept, so line numbers hold). */
function maskComments(fileName: string, text: string): string {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const ranges = new Map<number, number>();
  const collect = (pos: number) => {
    for (const range of [
      ...(ts.getLeadingCommentRanges(text, pos) ?? []),
      ...(ts.getTrailingCommentRanges(text, pos) ?? []),
    ]) {
      ranges.set(range.pos, range.end);
    }
  };
  // JsxText has no trivia: a "comment" found at its start (`<A>// x</A>`) is literal text.
  // The SyntaxList wrapping it shares its `pos`, so those positions are skipped, not just the node.
  const jsxTextStarts = new Set<number>();
  const findJsxText = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.JsxText) jsxTextStarts.add(node.pos);
    node.forEachChild(findJsxText);
  };
  findJsxText(source);
  const visit = (node: ts.Node) => {
    if (!jsxTextStarts.has(node.pos)) collect(node.pos);
    for (const child of node.getChildren(source)) {
      if (!isJsDocKind(child.kind)) visit(child);
    }
  };
  visit(source);

  let masked = text;
  for (const [start, end] of ranges) {
    masked =
      masked.slice(0, start) + masked.slice(start, end).replace(/[^\n]/g, " ") + masked.slice(end);
  }
  return masked;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

interface Rule {
  id: string;
  ac: string;
  /** Matches the comment-masked code (or the raw text when `raw`). */
  pattern: RegExp;
  raw?: boolean;
  /** Returns true when the file may legitimately contain the pattern. */
  allowed?: (file: string) => boolean;
}

const RULES: Rule[] = [
  {
    id: "no-cyrillic-outside-locales",
    ac: "AC-24",
    pattern: /[\u0400-\u04FF]/,
    allowed: (file) => file.startsWith(I18N_LOCALES),
  },
  {
    id: "no-platform-os-outside-platform",
    ac: "AC-27",
    pattern: /\bPlatform\s*\.\s*(OS|select)\b/,
    allowed: (file) => file.startsWith(PLATFORM_DIR),
  },
  {
    id: "no-backend-or-network",
    ac: "AC-25",
    pattern: /supabase|\bfetch\s*\(|XMLHttpRequest|\baxios\b/i,
  },
  {
    id: "no-ts-or-eslint-suppression",
    ac: "AC-26",
    pattern: /@ts-ignore|@ts-expect-error|@ts-nocheck|eslint-disable/,
    raw: true,
  },
  {
    id: "no-hex-or-functional-colors-outside-theme",
    ac: "AC-16",
    pattern: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|\b(?:rgba?|hsla?)\s*\(/,
    allowed: (file) => file.startsWith(THEME_DIR),
  },
  {
    id: "no-font-names-outside-theme",
    ac: "AC-17",
    pattern: /Manrope|IBM\s?Plex|expo-google-fonts|fontFamily\s*:\s*["'`]/i,
    allowed: (file) => file.startsWith(THEME_DIR) || file === FONT_LOADER,
  },
  {
    id: "no-async-storage-outside-storage",
    ac: "AC-33",
    pattern: /@react-native-async-storage\/async-storage/,
    allowed: (file) => file.startsWith(STORAGE_DIR),
  },
  {
    id: "no-storage-writes-outside-storage",
    ac: "AC-33",
    pattern: /\.\s*(setItem|multiSet|mergeItem|multiMerge)\s*\(/,
    allowed: (file) => file.startsWith(STORAGE_DIR),
  },
];

/** Every violation of `rules` in one file's text. */
function scanText(file: string, text: string, rules: Rule[] = RULES): Violation[] {
  const code = maskComments(file, text);
  const violations: Violation[] = [];
  for (const rule of rules) {
    if (rule.allowed?.(file)) continue;
    const haystack = rule.raw ? text : code;
    const lines = haystack.split("\n");
    const originalLines = text.split("\n");
    lines.forEach((line, index) => {
      if (rule.pattern.test(line)) {
        violations.push({
          file,
          line: index + 1,
          rule: `${rule.id} (${rule.ac})`,
          excerpt: (originalLines[index] ?? "").trim().slice(0, 100),
        });
      }
    });
  }
  return violations;
}

function format(violations: Violation[]): string[] {
  return violations.map((v) => `${v.file}:${v.line}  [${v.rule}]  ${v.excerpt}`);
}

// ---------------------------------------------------------------------------
// The scanner itself must not be vacuous
// ---------------------------------------------------------------------------

describe("guardrail scanner (self-test)", () => {
  const scan = (file: string, text: string) => scanText(file, text).map((v) => v.rule.split(" ")[0]);

  it("flags each forbidden construct in feature code", () => {
    const file = "src/features/x/X.tsx";
    expect(scan(file, `const a = "Привет";`)).toContain("no-cyrillic-outside-locales");
    expect(scan(file, `<Text>Привет</Text>`)).toContain("no-cyrillic-outside-locales");
    expect(scan(file, `const o = Platform.OS;`)).toContain("no-platform-os-outside-platform");
    expect(scan(file, `await fetch("x");`)).toContain("no-backend-or-network");
    expect(scan(file, `import axios from "axios";`)).toContain("no-backend-or-network");
    expect(scan(file, `import { createClient } from "@supabase/supabase-js";`)).toContain(
      "no-backend-or-network",
    );
    expect(scan(file, `// @ts-expect-error nope\nconst a = 1;`)).toContain(
      "no-ts-or-eslint-suppression",
    );
    expect(scan(file, `/* eslint-disable */`)).toContain("no-ts-or-eslint-suppression");
    expect(scan(file, `const c = "#F2A93B";`)).toContain("no-hex-or-functional-colors-outside-theme");
    expect(scan(file, `const c = "rgba(0,0,0,0.5)";`)).toContain(
      "no-hex-or-functional-colors-outside-theme",
    );
    expect(scan(file, `const f = { fontFamily: "Manrope_700Bold" };`)).toContain(
      "no-font-names-outside-theme",
    );
    expect(scan(file, `import A from "@react-native-async-storage/async-storage";`)).toContain(
      "no-async-storage-outside-storage",
    );
    expect(scan(file, `await store.setItem("k", "v");`)).toContain("no-storage-writes-outside-storage");
  });

  it("ignores comments for code rules but not for suppression directives", () => {
    const file = "src/features/x/X.tsx";
    expect(scan(file, `// Привет, Platform.OS, #F2A93B, fetch(\nconst a = 1;`)).toEqual([]);
    expect(scan(file, `/** Тест */\nexport const a = 1; // supabase`)).toEqual([]);
    expect(scan(file, `const url = "https://example.com"; const b = "Привет";`)).toEqual([
      "no-cyrillic-outside-locales",
    ]);
    expect(scan(file, `const a = (<Text>// Привет</Text>);`)).toContain("no-cyrillic-outside-locales");
  });

  it("reports the right line number", () => {
    const [violation] = scanText("src/x.ts", "const a = 1;\nconst b = 2;\nconst c = 'Ы';");
    expect(violation?.line).toBe(3);
  });

  it("honours the allow-lists", () => {
    expect(scanText("src/lib/i18n/locales/ru/common.ts", `export const a = "Привет";`)).toEqual([]);
    expect(scanText("src/platform/blur.ts", `const o = Platform.OS;`)).toEqual([]);
    expect(scanText("src/lib/theme/tokens.ts", `const c = "#0B0D11";`)).toEqual([]);
    expect(scanText("src/lib/fonts.ts", `import "@expo-google-fonts/manrope/400Regular";`)).toEqual([]);
    expect(scanText("src/lib/storage/settingsStorage.ts", `AsyncStorage.setItem(k, v);`)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The guardrails on the real source
// ---------------------------------------------------------------------------

const files = listSourceFiles();
const allViolations = files.flatMap((file) =>
  scanText(file, fs.readFileSync(path.join(MOBILE_ROOT, file), "utf8")),
);

function violationsOf(ruleId: string): string[] {
  return format(allViolations.filter((v) => v.rule.startsWith(`${ruleId} `)));
}

describe("source guardrails", () => {
  it("scans a plausible set of files (guards against an empty glob)", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files).toContain("app/_layout.tsx");
    expect(files).toContain("src/features/trips/TripsScreen.tsx");
    expect(files).toContain("src/lib/theme/tokens.ts");
    expect(files.filter(isTestFile)).toEqual([]);
  });

  it("AC-24: no Cyrillic outside src/lib/i18n/locales (no hardcoded UI strings)", () => {
    expect(violationsOf("no-cyrillic-outside-locales")).toEqual([]);
  });

  it("AC-27: Platform.OS / Platform.select only inside src/platform", () => {
    expect(violationsOf("no-platform-os-outside-platform")).toEqual([]);
  });

  it("AC-27: .ios.* / .android.* files only inside src/platform", () => {
    const offenders = files.filter(
      (file) => /\.(ios|android)\.[tj]sx?$/.test(file) && !file.startsWith(PLATFORM_DIR),
    );
    expect(offenders).toEqual([]);
  });

  it("AC-25: no supabase, fetch, XMLHttpRequest or axios anywhere", () => {
    expect(violationsOf("no-backend-or-network")).toEqual([]);
  });

  it("AC-26: no @ts-ignore, @ts-expect-error or eslint-disable", () => {
    expect(violationsOf("no-ts-or-eslint-suppression")).toEqual([]);
  });

  it("AC-16: no hex / rgb(a) / hsl(a) colours outside src/lib/theme", () => {
    expect(violationsOf("no-hex-or-functional-colors-outside-theme")).toEqual([]);
  });

  it("AC-17: no font-family names outside src/lib/theme (and the font loader)", () => {
    expect(violationsOf("no-font-names-outside-theme")).toEqual([]);
  });

  it("AC-33: AsyncStorage is imported only by src/lib/storage", () => {
    expect(violationsOf("no-async-storage-outside-storage")).toEqual([]);
    expect(violationsOf("no-storage-writes-outside-storage")).toEqual([]);
  });

  it("AC-33: exactly one key is writable, and exactly one write call site exists", () => {
    expect(ALLOWED_SETTING_KEYS).toHaveLength(1);
    const writeCalls = files
      .filter((file) => file.startsWith(STORAGE_DIR))
      .flatMap((file) => {
        const code = maskComments(file, fs.readFileSync(path.join(MOBILE_ROOT, file), "utf8"));
        return code.match(/\.\s*(setItem|multiSet|mergeItem|multiMerge)\s*\(/g) ?? [];
      });
    expect(writeCalls).toHaveLength(1);
  });
});
