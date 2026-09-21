// Static architecture guardrails (PLAN-01 Step 9, rewritten by PLAN-02 Step 6). They read the
// SOURCE, not the runtime, and back the "architectural" ACs of SPEC-01 (16, 17, 24, 26, 27, 33)
// and of SPEC-02 (8, 39, 46).
//
// SPEC-02 replaced two SPEC-01 rules deliberately — never by deleting them:
//   - `no-backend-or-network` (AC-25, "no backend anywhere")  -> `backend-only-behind-the-boundary`
//   - "exactly one AsyncStorage key, one setItem" (AC-33)     -> a check against the registry
//     `src/lib/storage/keys.ts` (exactly three declared keys, declared write sites, secret keys
//     only as ciphertext).
//
// Scope: everything under app/ and src/, except test files (`__tests__/`, `*.test.*`,
// `*.spec.*`) — tests legitimately contain Russian strings, literals and mocks. The two
// secret-hygiene rules (`no-service-role`, `no-secret-env`) also cover the mobile/ config files;
// `no-service-role` covers tests too.
// Comments are ignored for the "code" rules (a comment may say "no Platform.OS here"),
// but NOT for suppression directives: `@ts-ignore` in a comment is still a violation.
// Every failure lists `file:line` so the offender is one click away.

import ts from "typescript";

import { ALLOWED_SETTING_KEYS, STORAGE_KEYS } from "@/lib/storage";

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
const MOBILE_SKIPPED_DIRS = new Set([
  "node_modules",
  "ios",
  "android",
  ".expo",
  ".git",
  "coverage",
  "dist",
  "build",
]);

// Allow-lists (posix paths relative to mobile/). Each entry is a deliberate exception.
const I18N_LOCALES = "src/lib/i18n/locales/";
const THEME_DIR = "src/lib/theme/";
const PLATFORM_DIR = "src/platform/";
const STORAGE_DIR = "src/lib/storage/";
const SUPABASE_DIR = "src/lib/supabase/";
const SESSION_DIR = "src/lib/session/";
/** The ONLY file that may import `@supabase/supabase-js` (SPEC-02 AC-8). */
const SUPABASE_CLIENT = "src/lib/supabase/client.ts";
// The font loader maps family names to bundled assets. It imports `@expo-google-fonts/*`
// (package paths contain the family names) and takes every family NAME from the theme's
// `family`, so it is the theme's asset half, not a second source of truth (AC-17).
const FONT_LOADER = "src/lib/fonts.ts";

/** `src/features/<feature>/api/**` — the feature-level backend modules. */
function isFeatureApi(file: string): boolean {
  return /^src\/features\/[^/]+\/api\//.test(file);
}

/** Where the identifier/path `supabase` may appear: the boundary, the session, feature `api/`. */
function mayMentionSupabase(file: string): boolean {
  return file.startsWith(SUPABASE_DIR) || file.startsWith(SESSION_DIR) || isFeatureApi(file);
}

/** Code that handles credentials/tokens: nothing here may log request data (AC-39). */
function isCredentialCode(file: string): boolean {
  return (
    isFeatureApi(file) ||
    file.startsWith(SUPABASE_DIR) ||
    file.startsWith(STORAGE_DIR) ||
    file.startsWith(SESSION_DIR)
  );
}

// The only `EXPO_PUBLIC_*` variables the app may read: the project URL and the anon key (AC-46).
const ALLOWED_PUBLIC_ENV: ReadonlySet<string> = new Set([
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
]);

// The forbidden key names are assembled from parts so this very file (which `no-service-role`
// scans too) never contains them literally.
const SECRET_TERMS = [
  ["service", "role"].join("_"),
  ["SERVICE", "ROLE"].join("_"),
  ["sb", "secret"].join("_"),
];

// Arguments a `console.*` call may receive in credential code: literals and these two names.
const LOGGABLE_IDENTIFIERS: ReadonlySet<string> = new Set(["operation", "errorCode"]);

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

/** Every text file (code, JSON, `.env*`) in mobile/, tests included; generated dirs skipped. */
function listMobileFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(MOBILE_ROOT, dir), { withFileTypes: true })) {
      const relative = dir === "" ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!MOBILE_SKIPPED_DIRS.has(entry.name)) walk(relative);
      } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name) || entry.name.startsWith(".env")) {
        out.push(relative);
      }
    }
  };
  walk("");
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

/** Comment-free text of any scanned file: TS/JS comments, `#` lines of `.env*`, JSON as is. */
function codeOf(file: string, text: string): string {
  if (/\.(ts|tsx|js|jsx)$/.test(file)) return maskComments(file, text);
  const base = file.split("/").pop() ?? file;
  if (base.startsWith(".env")) {
    return text
      .split("\n")
      .map((line) => (line.trimStart().startsWith("#") ? "" : line))
      .join("\n");
  }
  return text;
}

// ---------------------------------------------------------------------------
// AST helpers for the structural rules
// ---------------------------------------------------------------------------

function lineOf(source: ts.SourceFile, node: ts.Node): number {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

function isSafeLogArgument(node: ts.Expression): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  if (ts.isIdentifier(node)) return LOGGABLE_IDENTIFIERS.has(node.text);
  if (ts.isTemplateExpression(node)) {
    return node.templateSpans.every((span) => isSafeLogArgument(span.expression));
  }
  return false;
}

/** Lines where `console` is used with anything but literals / `operation` / `errorCode`. */
function unsafeConsoleLines(file: string, text: string): number[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const lines: number[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === "console") {
      const parent = node.parent;
      const isMemberCall =
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        ts.isCallExpression(parent.parent) &&
        parent.parent.expression === parent;
      const call = isMemberCall ? (parent.parent as ts.CallExpression) : undefined;
      if (!call || !call.arguments.every(isSafeLogArgument)) lines.push(lineOf(source, node));
    }
    node.forEachChild(visit);
  };
  visit(source);
  return lines;
}

const WRITE_METHODS = new Set(["setItem", "multiSet", "mergeItem", "multiMerge"]);

/** Every AsyncStorage-style write call in `text`, as `{ line, args }` (args source, one line). */
function storageWrites(file: string, text: string): { line: number; args: string }[] {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const writes: { line: number; args: string }[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      WRITE_METHODS.has(node.expression.name.text)
    ) {
      writes.push({
        line: lineOf(source, node),
        args: node.arguments.map((arg) => arg.getText(source).replace(/\s+/g, " ")).join(", "),
      });
    }
    node.forEachChild(visit);
  };
  visit(source);
  return writes;
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

type Scope = "source" | "mobile-code" | "mobile-all";

interface Rule {
  id: string;
  ac: string;
  /** `source`: app/ + src/ non-test (default). `mobile-code`: all non-test mobile/ files. `mobile-all`: + tests. */
  scope?: Scope;
  /** Matches the comment-masked code (or the raw text when `raw`). */
  pattern?: RegExp;
  /** Alternative to `pattern`: true when the (comment-masked) line violates the rule. */
  test?: (line: string) => boolean;
  /** Alternative to `pattern`: 1-based lines violating the rule, from the raw text (AST based). */
  findLines?: (file: string, text: string) => number[];
  raw?: boolean;
  /** Returns true when the file may legitimately contain the pattern. */
  allowed?: (file: string) => boolean;
}

const RULES: Rule[] = [
  {
    id: "no-cyrillic-outside-locales",
    ac: "AC-24",
    pattern: /[Ѐ-ӿ]/,
    allowed: (file) => file.startsWith(I18N_LOCALES),
  },
  {
    id: "no-platform-os-outside-platform",
    ac: "AC-27",
    pattern: /\bPlatform\s*\.\s*(OS|select)\b/,
    allowed: (file) => file.startsWith(PLATFORM_DIR),
  },
  // --- backend-only-behind-the-boundary (replaces SPEC-01 `no-backend-or-network`) -----------
  {
    id: "backend-only-behind-the-boundary",
    ac: "SPEC-02 AC-8: supabase-js import only in src/lib/supabase/client.ts",
    pattern: /@supabase\//,
    allowed: (file) => file === SUPABASE_CLIENT,
  },
  {
    id: "backend-only-behind-the-boundary",
    ac: "SPEC-02 AC-8: fetch/XHR/axios only in src/lib/supabase/**",
    pattern: /\bfetch\s*\(|XMLHttpRequest|\baxios\b/i,
    allowed: (file) => file.startsWith(SUPABASE_DIR),
  },
  {
    id: "backend-only-behind-the-boundary",
    ac: "SPEC-02 AC-8: `supabase` only in lib/supabase, lib/session, features/*/api",
    pattern: /supabase/i,
    allowed: mayMentionSupabase,
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
  {
    id: "no-secure-store-outside-storage",
    ac: "SPEC-02 AC-7: Keychain access only via src/lib/storage",
    pattern: /expo-secure-store/,
    allowed: (file) => file.startsWith(STORAGE_DIR),
  },
  {
    id: "no-credentials-in-logs",
    ac: "SPEC-02 AC-39",
    findLines: unsafeConsoleLines,
    allowed: (file) => !isCredentialCode(file),
  },
  // --- secret hygiene across mobile/ ---------------------------------------------------------
  {
    id: "no-service-role",
    ac: "SPEC-02 AC-46",
    scope: "mobile-all",
    pattern: new RegExp(SECRET_TERMS.join("|")),
  },
  {
    id: "no-secret-env",
    ac: "SPEC-02 AC-46",
    scope: "mobile-code",
    test: (line) =>
      (line.match(/EXPO_PUBLIC_[A-Za-z0-9_]*/g) ?? []).some((name) => !ALLOWED_PUBLIC_ENV.has(name)),
  },
];

/** Every violation of `rules` in one file's text. */
function scanText(file: string, text: string, rules: Rule[] = RULES): Violation[] {
  const code = codeOf(file, text);
  const violations: Violation[] = [];
  const originalLines = text.split("\n");
  const report = (rule: Rule, line: number) => {
    violations.push({
      file,
      line,
      rule: `${rule.id} (${rule.ac})`,
      excerpt: (originalLines[line - 1] ?? "").trim().slice(0, 100),
    });
  };
  for (const rule of rules) {
    if (rule.allowed?.(file)) continue;
    if (rule.findLines) {
      rule.findLines(file, text).forEach((line) => report(rule, line));
      continue;
    }
    const haystack = rule.raw ? text : code;
    haystack.split("\n").forEach((line, index) => {
      const hit = rule.pattern ? rule.pattern.test(line) : (rule.test?.(line) ?? false);
      if (hit) report(rule, index + 1);
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
    expect(scan(file, `await fetch("x");`)).toContain("backend-only-behind-the-boundary");
    expect(scan(file, `const r = new XMLHttpRequest();`)).toContain("backend-only-behind-the-boundary");
    expect(scan(file, `import axios from "axios";`)).toContain("backend-only-behind-the-boundary");
    expect(scan(file, `import { createClient } from "@supabase/supabase-js";`)).toContain(
      "backend-only-behind-the-boundary",
    );
    expect(scan(file, `import { supabase } from "@/lib/supabase";`)).toContain(
      "backend-only-behind-the-boundary",
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
    expect(scan(file, `import * as S from "expo-secure-store";`)).toContain(
      "no-secure-store-outside-storage",
    );
  });

  describe("backend-only-behind-the-boundary", () => {
    const supabaseImport = `import { createClient } from "@supabase/supabase-js";`;

    it("lets ONLY client.ts import supabase-js", () => {
      expect(scan(SUPABASE_CLIENT, supabaseImport)).toEqual([]);
      expect(scan("src/lib/supabase/other.ts", supabaseImport)).toContain(
        "backend-only-behind-the-boundary",
      );
      expect(scan("src/lib/session/SessionProvider.tsx", supabaseImport)).toContain(
        "backend-only-behind-the-boundary",
      );
      expect(scan("src/features/auth/api/authApi.ts", supabaseImport)).toContain(
        "backend-only-behind-the-boundary",
      );
      expect(scan("app/_layout.tsx", supabaseImport)).toContain("backend-only-behind-the-boundary");
    });

    it("lets fetch / XMLHttpRequest / axios live only in src/lib/supabase/**", () => {
      expect(scan("src/lib/supabase/client.ts", `const r = await fetch(url);`)).toEqual([]);
      for (const file of [
        "src/features/x/X.tsx",
        "src/features/auth/api/authApi.ts",
        "src/lib/session/SessionProvider.tsx",
        "src/lib/storage/x.ts",
        "app/index.tsx",
      ]) {
        expect(scan(file, `await fetch("x");`)).toContain("backend-only-behind-the-boundary");
        expect(scan(file, `new XMLHttpRequest();`)).toContain("backend-only-behind-the-boundary");
        expect(scan(file, `axios.get("x");`)).toContain("backend-only-behind-the-boundary");
      }
    });

    it("lets the identifier `supabase` appear only in lib/supabase, lib/session and features/*/api", () => {
      const use = `import { supabase } from "@/lib/supabase";`;
      expect(scan("src/features/auth/api/authApi.ts", use)).toEqual([]);
      expect(scan("src/features/trips/api/tripsApi.ts", use)).toEqual([]);
      expect(scan("src/lib/session/SessionProvider.tsx", use)).toEqual([]);
      expect(scan("src/lib/supabase/index.ts", use)).toEqual([]);
      expect(scan("src/features/auth/SignInScreen.tsx", use)).toContain(
        "backend-only-behind-the-boundary",
      );
      expect(scan("src/features/auth/components/X.tsx", use)).toContain(
        "backend-only-behind-the-boundary",
      );
      expect(scan("src/components/Button.tsx", use)).toContain("backend-only-behind-the-boundary");
      expect(scan("app/sign-in.tsx", use)).toContain("backend-only-behind-the-boundary");
    });
  });

  describe("no-credentials-in-logs", () => {
    const api = "src/features/auth/api/authApi.ts";

    it("flags console output of request data in credential code", () => {
      expect(scan(api, `console.log(email);`)).toContain("no-credentials-in-logs");
      expect(scan(api, `console.error(error);`)).toContain("no-credentials-in-logs");
      expect(scan(api, "console.warn(`signIn failed for ${email}`);")).toContain("no-credentials-in-logs");
      expect(scan(api, `console.info({ email, password });`)).toContain("no-credentials-in-logs");
      expect(scan(api, `console.debug(JSON.stringify(values));`)).toContain("no-credentials-in-logs");
      expect(scan(api, `const log = console.log;`)).toContain("no-credentials-in-logs");
      expect(scan(api, `console["log"](token);`)).toContain("no-credentials-in-logs");
      expect(scan("src/lib/supabase/client.ts", `console.log(anonKey);`)).toContain(
        "no-credentials-in-logs",
      );
      expect(scan("src/lib/storage/x.ts", `console.log(ciphertext);`)).toContain("no-credentials-in-logs");
    });

    it("allows literals, `operation` and `errorCode`", () => {
      expect(scan(api, `console.warn("[auth]", operation, "failed", errorCode);`)).toEqual([]);
      expect(scan(api, "console.warn(`[auth] ${operation} failed: ${errorCode}`);")).toEqual([]);
      expect(scan(api, `console.warn();`)).toEqual([]);
    });

    it("is scoped to credential code and reports the right line", () => {
      expect(scan("src/features/trips/TripsScreen.tsx", `console.log(email);`)).toEqual([]);
      const [violation] = scanText(api, "const a = 1;\n\nconsole.log(password);");
      expect(violation?.line).toBe(3);
    });
  });

  describe("secret hygiene (AC-46)", () => {
    const [serviceRole, serviceRoleUpper, secretPrefix] = SECRET_TERMS as [string, string, string];

    it("no-service-role flags the forbidden key names anywhere in mobile/", () => {
      for (const term of [serviceRole, serviceRoleUpper, secretPrefix]) {
        expect(scan("src/lib/supabase/client.ts", `const k = "${term}";`)).toContain("no-service-role");
        expect(scan("app.config.ts", `export const k = "${term}_x";`)).toContain("no-service-role");
        expect(scan("__tests__/x.test.ts", `const k = "${term}";`)).toContain("no-service-role");
        expect(scan("package.json", `{ "k": "${term}" }`)).toContain("no-service-role");
        expect(scan(".env", `KEY=${term}`)).toContain("no-service-role");
      }
    });

    it("no-service-role ignores comments (code, `.env` comment lines)", () => {
      expect(scan("src/x.ts", `// never use ${serviceRole}\nexport const a = 1;`)).toEqual([]);
      expect(scan(".env.example", `# no ${serviceRole} key here\nAPP_NAME=x`)).toEqual([]);
    });

    it("no-secret-env allows only the two public Supabase variables", () => {
      const allowed = ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"];
      for (const name of allowed) {
        expect(scan("src/lib/supabase/client.ts", `const v = process.env.${name};`)).toEqual([]);
        expect(scan(".env.example", `${name}=`).filter((id) => id === "no-secret-env")).toEqual([]);
      }
      const rogue = ["EXPO", "PUBLIC", "STRIPE_SECRET"].join("_");
      expect(scan("src/lib/x.ts", `const v = process.env.${rogue};`)).toContain("no-secret-env");
      expect(scan("app.config.ts", `extra: { k: process.env.${rogue} }`)).toContain("no-secret-env");
      expect(scan(".env", `${rogue}=abc`)).toContain("no-secret-env");
      expect(scan("src/lib/x.ts", `const v = process.env.EXPO_PUBLIC_SUPABASE_URL_2;`)).toContain(
        "no-secret-env",
      );
      expect(scan("src/lib/x.ts", `const v = process.env.EXPO_PUBLIC_;`)).toContain("no-secret-env");
    });
  });

  describe("AsyncStorage write inspection", () => {
    it("lists every write call with its arguments", () => {
      const writes = storageWrites(
        "src/lib/storage/x.ts",
        `AsyncStorage.setItem(KEY, ciphertext);\nawait AsyncStorage.multiSet([["a", "b"]]);\nAsyncStorage.getItem(KEY);`,
      );
      expect(writes).toEqual([
        { line: 1, args: "KEY, ciphertext" },
        { line: 2, args: `[["a", "b"]]` },
      ]);
    });
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
    expect(scanText("src/lib/storage/x.ts", `import * as S from "expo-secure-store";`)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The guardrails on the real source
// ---------------------------------------------------------------------------

const files = listSourceFiles();
const mobileFiles = listMobileFiles();
const mobileCodeFiles = mobileFiles.filter((file) => !isTestFile(file));

const rulesOf = (scope: Scope) => RULES.filter((rule) => (rule.scope ?? "source") === scope);
const readMobile = (file: string) => fs.readFileSync(path.join(MOBILE_ROOT, file), "utf8");

const allViolations = [
  ...files.flatMap((file) => scanText(file, readMobile(file), rulesOf("source"))),
  ...mobileCodeFiles.flatMap((file) => scanText(file, readMobile(file), rulesOf("mobile-code"))),
  ...mobileFiles.flatMap((file) => scanText(file, readMobile(file), rulesOf("mobile-all"))),
];

function violationsOf(ruleId: string): string[] {
  return format(allViolations.filter((v) => v.rule.startsWith(`${ruleId} `)));
}

/** Source files under src/lib/storage/ (non-test), with their comment-free code. */
const storageFiles = files.filter((file) => file.startsWith(STORAGE_DIR));

describe("source guardrails", () => {
  it("scans a plausible set of files (guards against an empty glob)", () => {
    expect(files.length).toBeGreaterThan(50);
    expect(files).toContain("app/_layout.tsx");
    expect(files).toContain("src/features/trips/TripsScreen.tsx");
    expect(files).toContain("src/lib/theme/tokens.ts");
    expect(files).toContain(SUPABASE_CLIENT);
    expect(files).toContain("src/features/auth/api/authApi.ts");
    expect(files.filter(isTestFile)).toEqual([]);
    expect(mobileFiles).toContain("package.json");
    expect(mobileFiles).toContain("app.config.ts");
    expect(mobileFiles).toContain(".env.example");
    expect(mobileFiles).toContain("__tests__/guardrails.test.ts");
    expect(mobileFiles.filter((file) => file.startsWith("node_modules/"))).toEqual([]);
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

  describe("backend-only-behind-the-boundary (SPEC-02 AC-8; replaces SPEC-01 AC-25)", () => {
    it("supabase-js is imported by exactly one file: src/lib/supabase/client.ts", () => {
      const importers = files.filter((file) =>
        /["']@supabase\/supabase-js["']/.test(maskComments(file, readMobile(file))),
      );
      expect(importers).toEqual([SUPABASE_CLIENT]);
    });

    it("no @supabase import elsewhere, no fetch/XHR/axios outside src/lib/supabase, no `supabase` outside the three allowed places", () => {
      expect(violationsOf("backend-only-behind-the-boundary")).toEqual([]);
    });

    it("the client module is the only place that makes a network call", () => {
      const callers = files.filter((file) =>
        /\bfetch\s*\(|XMLHttpRequest|\baxios\b/i.test(maskComments(file, readMobile(file))),
      );
      expect(callers.every((file) => file.startsWith(SUPABASE_DIR))).toBe(true);
      expect(callers).toContain(SUPABASE_CLIENT);
    });
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

  it("AC-33: AsyncStorage and the Keychain are touched only by src/lib/storage", () => {
    expect(violationsOf("no-async-storage-outside-storage")).toEqual([]);
    expect(violationsOf("no-storage-writes-outside-storage")).toEqual([]);
    expect(violationsOf("no-secure-store-outside-storage")).toEqual([]);
  });

  describe("AC-33 / SPEC-02 AC-7: the storage-key registry (src/lib/storage/keys.ts)", () => {
    const entries = Object.entries(STORAGE_KEYS);
    const secretEntries = entries.filter(([, info]) => info.secret);

    it("declares exactly three AsyncStorage keys: theme, encrypted session, first-launch flag", () => {
      expect(entries.map(([name]) => name).sort()).toEqual(["firstLaunch", "session", "theme"]);
      expect(new Set(entries.map(([, info]) => info.key)).size).toBe(3);
      for (const [, info] of entries) expect(info.purpose.length).toBeGreaterThan(10);
    });

    it("marks exactly the session ciphertext as secret", () => {
      expect(secretEntries.map(([name]) => name)).toEqual(["session"]);
    });

    it("the plain settings writer accepts no secret key", () => {
      const secretKeys = secretEntries.map(([, info]) => info.key as string);
      const registered = entries.map(([, info]) => info.key as string);
      expect(ALLOWED_SETTING_KEYS.length).toBeGreaterThan(0);
      for (const key of ALLOWED_SETTING_KEYS) {
        expect(registered).toContain(key);
        expect(secretKeys).not.toContain(key);
      }
    });

    it("no writer exists outside src/lib/storage, and inside it the write sites are exactly the declared ones", () => {
      const declared: Record<string, string[]> = {
        "src/lib/storage/settingsStorage.ts": ["key, value"],
        "src/lib/storage/sessionSecureStorage.ts": ["SESSION_KEY, ciphertext"],
        "src/lib/storage/freshInstall.ts": ["STORAGE_KEYS.firstLaunch.key, FLAG_VALUE"],
      };
      const actual: Record<string, string[]> = {};
      for (const file of storageFiles) {
        const writes = storageWrites(file, maskComments(file, readMobile(file)));
        if (writes.length > 0) actual[file] = writes.map((write) => write.args);
      }
      expect(actual).toEqual(declared);
    });

    it("secret keys are written only as ciphertext (never a raw value)", () => {
      const file = "src/lib/storage/sessionSecureStorage.ts";
      const writes = storageWrites(file, readMobile(file));
      expect(writes).toHaveLength(1);
      expect(writes[0]?.args).toBe("SESSION_KEY, ciphertext");
      // `ciphertext` must be the output of `encrypt(...)`, not an alias of the caller's value.
      expect(maskComments(file, readMobile(file))).toMatch(
        /const\s+ciphertext\s*=\s*encrypt\s*\(/,
      );
    });

    it("secret key names and values are referenced only by the session storage, the client config and the registry", () => {
      const allowedReferrers = new Set([
        "src/lib/storage/keys.ts",
        "src/lib/storage/sessionSecureStorage.ts",
        SUPABASE_CLIENT,
      ]);
      const offenders: string[] = [];
      for (const file of files) {
        if (allowedReferrers.has(file)) continue;
        const code = maskComments(file, readMobile(file));
        for (const [name, info] of secretEntries) {
          if (new RegExp(`STORAGE_KEYS\\s*\\.\\s*${name}\\b`).test(code) || code.includes(info.key)) {
            offenders.push(`${file}  [references secret key "${name}"]`);
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  });

  describe("SPEC-02 AC-46: no secrets in the client", () => {
    it("no-service-role: the service-role / secret-key names appear nowhere in mobile/", () => {
      expect(violationsOf("no-service-role")).toEqual([]);
    });

    it("no-secret-env: only EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are read", () => {
      expect(violationsOf("no-secret-env")).toEqual([]);
    });

    it("the two public variables are actually read (the rule is not vacuous)", () => {
      const readers = mobileCodeFiles.filter((file) =>
        /EXPO_PUBLIC_SUPABASE_ANON_KEY/.test(codeOf(file, readMobile(file))),
      );
      expect(readers).toEqual(expect.arrayContaining([".env.example", SUPABASE_CLIENT]));
    });
  });

  it("SPEC-02 AC-39: credential code never logs request data", () => {
    expect(violationsOf("no-credentials-in-logs")).toEqual([]);
  });
});
