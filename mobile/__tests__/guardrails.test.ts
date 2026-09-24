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
// SPEC-03 added two rules on top (never replacing one): `no-mocks-directory` (AC-63) and
// `no-direct-clock-outside-clock` (AC-64).
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
  existsSync(target: string): boolean;
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
/** The injectable clock: the ONLY place that may read the system time (SPEC-03 AC-64). */
const CLOCK_DIR = "src/lib/clock/";
/** The ONLY file that may import `@supabase/supabase-js` (SPEC-02 AC-8). */
const SUPABASE_CLIENT = "src/lib/supabase/client.ts";
// The font loader maps family names to bundled assets. It imports `@expo-google-fonts/*`
// (package paths contain the family names) and takes every family NAME from the theme's
// `family`, so it is the theme's asset half, not a second source of truth (AC-17).
const FONT_LOADER = "src/lib/fonts.ts";

// `Date.now(` in the auth feature measures ELAPSED milliseconds for the resend cooldown (a
// duration between two instants, never a calendar "today"), so the injectable day-clock does not
// apply. These two files are the entire exception; the "not stale" self-test below fails the moment
// one stops using `Date.now(`, so the allowance cannot outlive its reason.
const ELAPSED_TIME_FILES: ReadonlySet<string> = new Set([
  "src/features/auth/flowState.ts",
  "src/features/auth/hooks/useResendCountdown.ts",
]);

// The forbidden "frozen now" names and the mocks import path are assembled from parts, like the
// secret terms below, so this very file (scanned by the `mobile-all` rules) never contains them.
const FROZEN_NOW_NAMES = [["MOCK", "NOW"].join("_"), ["FIXED", "NOW"].join("_")];
const FROZEN_NOW_NAME = new RegExp(`\\b(?:${FROZEN_NOW_NAMES.join("|")})\\b`);
const MOCKS_DIR_NAME = ["mo", "cks"].join("");
/** A quoted import/mock specifier pointing into a mocks directory: alias (`@/…`) or relative. */
const MOCKS_SPECIFIER = new RegExp(
  "[\"'`](?:@/|(?:\\.\\.?/)+)(?:[^\"'`\\s]*/)?" + MOCKS_DIR_NAME + "(?:/[^\"'`]*)?[\"'`]",
);

// PLAN-05 step 9. Needles are assembled from parts so this file (scanned by `mobile-all` rules)
// never contains them.
/** The maps allow-list lives only in shared/src/hotels/mapsUrl.ts (AC-24). */
const MAPS_HOST_PATTERN = new RegExp(
  [["goo", "gl"].join("\\."), ["google", "com"].join("\\.")].join("|"),
);
// PLAN-06 step 6: the `profiles` table is read and written only by src/features/profile/api/**.
const PROFILE_API_DIR = "src/features/profile/api/";
const PROFILES_TABLE_CALL = new RegExp(
  ["\\.from\\(\\s*[\"'`]", "prof", "iles[\"'`]"].join(""),
);
/** Hotel features never count nights themselves (AC-20). */
const HOTEL_FEATURE_DIRS = ["src/features/hotels/", "src/features/hotel-form/"];
const NIGHTS_ARITHMETIC_NEEDLES = [
  ["days", "Between("].join(""),
  ["24 * 60", "60"].join(" * "),
  ["8640", "0000"].join(""),
  ["864", "e5"].join(""),
];

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

// The layover / risky-layover thresholds and the "same airport code" comparisons they gate live
// ONLY in `shared/src/segments/route.ts` (PLAN-04 AC-62); `mobile/` must always go through
// `buildRoute`/`RouteView` instead of re-deriving them. Computed (not typed as digit literals) so
// this very file's needles below don't read as the forbidden constant even by accident, mirroring
// the SECRET_TERMS/FROZEN_NOW_NAMES "assembled from parts" precedent above.
const LAYOVER_THRESHOLD_MS = [8 * 60 * 60 * 1000, 90 * 60 * 1000].map(String);
const LAYOVER_THRESHOLD_MIN = [8 * 60, 90].map(String);
const LAYOVER_THRESHOLD_MS_PATTERN = new RegExp(`\\b(?:${LAYOVER_THRESHOLD_MS.join("|")})\\b`);
// Only counted next to a "min" unit — bare `90` / `480` are common, harmless numbers elsewhere.
const LAYOVER_THRESHOLD_MIN_PATTERN = new RegExp(
  `\\b(?:${LAYOVER_THRESHOLD_MIN.join("|")})\\s*[Mm][Ii][Nn]\\b`,
);
// The multiplication idiom `shared` itself uses (`8 * 60 * 60 * 1000`, `90 * 60 * 1000`), flexible
// whitespace: catches a re-derivation that never collapses to the plain millisecond literal.
const LAYOVER_MULTIPLICATION_PATTERNS = [
  [8, 60, 60, 1000],
  [90, 60, 1000],
].map((parts) => new RegExp(parts.map(String).join("\\s*\\*\\s*")));

// Two airport-code-ish field reads compared for equality on one line: the "same airport" checks
// `buildRoute` owns (adjacency, route closing). A NEGATIVE LOOKBEHIND excludes optional chaining
// (`?.iata`) so a plain field-by-field form dirty-check (e.g. `segment-form`'s `segmentFormEquals`,
// which nullish-coalesces before comparing) is not a false positive — only a direct, non-optional
// `.iata`/`.code`/`.airportCode` access on BOTH sides trips this.
const AIRPORT_CODE_FIELD = "(?:iata|code|airportCode)";
const AIRPORT_EQUALITY_PATTERN = new RegExp(
  `(?<!\\?)\\.\\s*${AIRPORT_CODE_FIELD}\\b[^\\n]*?(?:===|!==)[^\\n]*?(?<!\\?)\\.\\s*${AIRPORT_CODE_FIELD}\\b`,
);

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
  // --- SPEC-03: no mock data, no hard-wired "now" --------------------------------------------
  {
    id: "no-mocks-directory",
    ac: "SPEC-03 AC-63: no import from a mocks directory, in product code or in tests",
    scope: "mobile-all",
    pattern: MOCKS_SPECIFIER,
  },
  {
    id: "no-direct-clock-outside-clock",
    ac: "SPEC-03 AC-64: `new Date()` / `Date.now(` only in src/lib/clock/**",
    // Constructors WITH arguments (`new Date(y, m, d)`, `new Date(iso)`, `new Date(Date.UTC(..))`)
    // are pure conversions, not clock reads, and stay legal. Tests are out of this scope (they
    // build relative timestamps and drive fake timers); product code is what AC-64 protects.
    pattern: /\bnew\s+Date\s*\(\s*\)|\bDate\s*\.\s*now\s*\(/,
    allowed: (file) => file.startsWith(CLOCK_DIR) || ELAPSED_TIME_FILES.has(file),
  },
  {
    id: "no-direct-clock-outside-clock",
    ac: "SPEC-03 AC-64: no fixed-`now` constant anywhere (tests included)",
    scope: "mobile-all",
    pattern: FROZEN_NOW_NAME,
  },
  // --- PLAN-04 AC-62: layover thresholds and airport-code equality stay inside shared/ --------
  {
    id: "no-route-threshold-or-airport-equality-duplication",
    ac: "AC-62: 8h/90min layover thresholds (ms, min or the shared/ multiplication idiom) only in shared/src/segments/route.ts",
    test: (line) =>
      LAYOVER_THRESHOLD_MS_PATTERN.test(line) ||
      LAYOVER_THRESHOLD_MIN_PATTERN.test(line) ||
      LAYOVER_MULTIPLICATION_PATTERNS.some((pattern) => pattern.test(line)),
  },
  {
    id: "no-route-threshold-or-airport-equality-duplication",
    ac: "AC-62: airport-code equality (adjacency / route-closing checks) only in shared/src/segments/route.ts",
    pattern: AIRPORT_EQUALITY_PATTERN,
  },
  // --- PLAN-05 AC-24 / AC-20 -------------------------------------------------------------------
  {
    id: "no-maps-allowlist-outside-shared",
    ac: "AC-24: maps hosts are a literal only in shared/src/hotels/mapsUrl.ts",
    pattern: MAPS_HOST_PATTERN,
  },
  {
    id: "no-nights-arithmetic-in-hotel-features",
    ac: "AC-20: hotel features take the night count from shared/, never compute it",
    test: (line) => NIGHTS_ARITHMETIC_NEEDLES.some((needle) => line.includes(needle)),
    allowed: (file) => !HOTEL_FEATURE_DIRS.some((dir) => file.startsWith(dir)),
  },
  // --- PLAN-06: the profiles table stays behind its own api module ------------------------------
  {
    id: "profiles-table-only-in-profile-api",
    ac: "PLAN-06: the profiles table is addressed only from src/features/profile/api/**",
    pattern: PROFILES_TABLE_CALL,
    allowed: (file) => file.startsWith(PROFILE_API_DIR),
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

  it("flags the maps host literal and nights arithmetic (PLAN-05 step 9)", () => {
    const scan = (file: string, text: string) => scanText(file, text).map((v) => v.rule.split(" ")[0]);
    const host = ["maps.app.goo", "gl"].join(".");
    const google = ["www.google", "com"].join(".");
    expect(scan("src/features/x/X.tsx", `const u = "https://${host}/a";`)).toContain("no-maps-allowlist-outside-shared");
    expect(scan("app/x.tsx", `const u = "${google}";`)).toContain("no-maps-allowlist-outside-shared");
    expect(scan("src/features/x/X.tsx", `const t = "Open in Google Maps";`)).not.toContain("no-maps-allowlist-outside-shared");
    const rule = "no-nights-arithmetic-in-hotel-features";
    for (const needle of NIGHTS_ARITHMETIC_NEEDLES) {
      expect(scan("src/features/hotels/a.ts", `const n = x ${needle} y;`)).toContain(rule);
      expect(scan("src/features/hotel-form/a.ts", `const n = x ${needle} y;`)).toContain(rule);
      expect(scan("src/features/trips/a.ts", `const n = x ${needle} y;`)).not.toContain(rule);
    }
  });

  it("flags a profiles table call outside the profile api (PLAN-06 step 6)", () => {
    const rule = "profiles-table-only-in-profile-api";
    const call = `const q = supabase.from("${["prof", "iles"].join("")}").select("*");`;
    expect(scan("src/features/trips/api/tripsApi.ts", call)).toContain(rule);
    expect(scan("src/features/profile/hooks/x.ts", call)).toContain(rule);
    expect(scan("src/features/profile/api/profileApi.ts", call)).not.toContain(rule);
  });

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

  describe("no-mocks-directory (SPEC-03 AC-63)", () => {
    const alias = ["@", MOCKS_DIR_NAME].join("/");

    it("flags an import of / a mock of a mocks directory, in feature code and in tests", () => {
      const feature = "src/features/x/X.tsx";
      expect(scan(feature, `import { MOCK_USER } from "${alias}";`)).toContain("no-mocks-directory");
      expect(scan(feature, `import { a } from '${alias}/trips';`)).toContain("no-mocks-directory");
      expect(scan(feature, `import { a } from "../../${MOCKS_DIR_NAME}/user";`)).toContain(
        "no-mocks-directory",
      );
      expect(scan(feature, `import { a } from "../${MOCKS_DIR_NAME}";`)).toContain("no-mocks-directory");
      expect(scan(feature, `const a = require("./data/${MOCKS_DIR_NAME}/x");`)).toContain(
        "no-mocks-directory",
      );
      expect(scan("src/features/x/__tests__/X.test.tsx", `import { a } from "${alias}";`)).toContain(
        "no-mocks-directory",
      );
      expect(scan("src/features/x/__tests__/X.test.tsx", `jest.mock("${alias}/trips");`)).toContain(
        "no-mocks-directory",
      );
    });

    it("does not flag look-alikes (jest `__mocks__`, prose, unrelated paths)", () => {
      const feature = "src/features/x/X.tsx";
      expect(scan(feature, `import { a } from "./__${MOCKS_DIR_NAME}__/x";`)).toEqual([]);
      expect(scan(feature, `import { a } from "@/lib/${MOCKS_DIR_NAME}ter";`)).toEqual([]);
      expect(scan(feature, `// no import from ${alias}\nexport const a = 1;`)).toEqual([]);
    });
  });

  describe("no-direct-clock-outside-clock (SPEC-03 AC-64)", () => {
    const feature = "src/features/trips/TripsScreen.tsx";
    const [mockNow, fixedNow] = FROZEN_NOW_NAMES as [string, string];

    it("flags the empty-argument `new Date()` and `Date.now(` outside src/lib/clock", () => {
      expect(scan(feature, `const today = new Date();`)).toContain("no-direct-clock-outside-clock");
      expect(scan(feature, `const today = new  Date( );`)).toContain("no-direct-clock-outside-clock");
      expect(scan(feature, `const t = Date.now();`)).toContain("no-direct-clock-outside-clock");
      expect(scan(feature, `const t = Date . now ();`)).toContain("no-direct-clock-outside-clock");
      expect(scan("src/lib/dates/x.ts", `export const t = () => Date.now();`)).toContain(
        "no-direct-clock-outside-clock",
      );
      expect(scan("app/index.tsx", `const d = new Date();`)).toContain("no-direct-clock-outside-clock");
    });

    it("lets src/lib/clock/** read the system time", () => {
      expect(scan("src/lib/clock/clock.ts", `createClock(() => new Date());`)).toEqual([]);
      expect(scan("src/lib/clock/x.ts", `const t = Date.now();`)).toEqual([]);
    });

    it("keeps constructors WITH arguments legal (pure conversions, not clock reads)", () => {
      expect(scan(feature, `const d = new Date(2026, 8, 22);`)).toEqual([]);
      expect(scan(feature, `const d = new Date(iso);`)).toEqual([]);
      expect(scan(feature, `const d = new Date(Date.UTC(2026, 8, 22));`)).toEqual([]);
      expect(scan(feature, `const d = new Date(someMillis);`)).toEqual([]);
    });

    it("ignores comments; the clock-read pattern is scoped to non-test source files", () => {
      expect(scan(feature, `// new Date() and Date.now( are read in the clock\nexport const a = 1;`)).toEqual([]);
      // `scan` applies every rule to any path; test files are excluded by discovery (`source` scope).
      const clockRules = RULES.filter((rule) => rule.id === "no-direct-clock-outside-clock");
      expect(clockRules.map((rule) => rule.scope ?? "source").sort()).toEqual(["mobile-all", "source"]);
    });

    it("flags a fixed-now constant anywhere, tests included", () => {
      for (const name of [mockNow, fixedNow]) {
        expect(scan(feature, `const ${name} = new Date(2026, 8, 22);`)).toContain(
          "no-direct-clock-outside-clock",
        );
        expect(scan("src/lib/dates/x.ts", `export { ${name} } from "./y";`)).toContain(
          "no-direct-clock-outside-clock",
        );
        expect(scan("src/features/x/__tests__/X.test.ts", `expect(${name}).toBeDefined();`)).toContain(
          "no-direct-clock-outside-clock",
        );
        // Not even in the clock module: a frozen constant defeats the injectable source.
        expect(scan("src/lib/clock/clock.ts", `const ${name} = 1;`)).toContain(
          "no-direct-clock-outside-clock",
        );
      }
      expect(scan(feature, `const NOWHERE = 1; const MOCK_NOWHERE = 2;`)).toEqual([]);
    });

    it("keeps the auth elapsed-time allowance narrow and not stale", () => {
      const line = `const t = Date.now();`;
      for (const file of ELAPSED_TIME_FILES) {
        expect(scan(file, line)).toEqual([]);
        expect(maskComments(file, readMobile(file))).toMatch(/\bDate\s*\.\s*now\s*\(/);
      }
      expect(scan("src/features/auth/SignInScreen.tsx", line)).toContain("no-direct-clock-outside-clock");
      expect(scan("src/features/auth/hooks/useOther.ts", line)).toContain("no-direct-clock-outside-clock");
    });
  });

  describe("no-route-threshold-or-airport-equality-duplication (PLAN-04 AC-62)", () => {
    const feature = "src/features/transport/x.ts";

    it("flags the exact millisecond literal of either threshold", () => {
      expect(scan(feature, `const LAYOVER_MAX_MS = 28800000;`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
      expect(scan(feature, `if (durationMs <= 28800000) return "layover";`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
      expect(scan(feature, `const RISKY_LAYOVER_MS = 5400000;`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
    });

    it("flags a minute literal next to a 'min' unit, but not a bare number", () => {
      expect(scan(feature, `const maxMin = 480; // min`)).toEqual([]); // no unit on the same line
      expect(scan(feature, `const maxMin = "480min";`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
      expect(scan(feature, `const risky = 90 min;`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
      expect(scan(feature, `const seats = 90;`)).toEqual([]);
      expect(scan(feature, `const gap = spacing.xl * 480;`)).toEqual([]);
    });

    it("flags the shared/ multiplication idiom re-derived in mobile/", () => {
      expect(scan(feature, `const layoverMaxMs = 8 * 60 * 60 * 1000;`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
      expect(scan(feature, `const riskyMs = 90*60*1000;`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
    });

    it("flags a direct comparison of two airport-code fields", () => {
      expect(scan(feature, `if (before.to.iata !== after.from.iata) { warn(); }`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
      expect(scan(feature, `const closed = first.from.iata === last.to.iata;`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
      expect(scan(feature, `if (a.airportCode === b.code) return true;`)).toContain(
        "no-route-threshold-or-airport-equality-duplication",
      );
    });

    it("does not flag optional-chained field-by-field form equality (segment-form's dirty-check)", () => {
      expect(
        scan(feature, `(a.fromAirport?.iata ?? null) === (b.fromAirport?.iata ?? null);`),
      ).toEqual([]);
      expect(
        scan(feature, `(a.toAirport?.iata ?? null) === (b.toAirport?.iata ?? null);`),
      ).toEqual([]);
    });

    it("does not flag a single-sided airport-code read (lookup, display, filter)", () => {
      expect(scan(feature, `const label = \`\${airport.iata}\`;`)).toEqual([]);
      expect(scan(feature, `const match = airport.iata === "LIS";`)).toEqual([]);
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

  it("SPEC-03 AC-63: src/mocks does not exist and nothing imports a mocks directory", () => {
    expect(fs.existsSync(path.join(MOBILE_ROOT, "src", MOCKS_DIR_NAME))).toBe(false);
    expect(mobileFiles.filter((file) => file.split("/").includes(MOCKS_DIR_NAME))).toEqual([]);
    expect(violationsOf("no-mocks-directory")).toEqual([]);
  });

  it("AC-62: no layover-threshold literal or airport-code equality outside shared/ (PLAN-04)", () => {
    expect(violationsOf("no-route-threshold-or-airport-equality-duplication")).toEqual([]);
  });

  it("SPEC-03 AC-64: the system time is read only in src/lib/clock; no fixed-`now` constant exists", () => {
    expect(violationsOf("no-direct-clock-outside-clock")).toEqual([]);
    // The rule is not vacuous: the clock module really reads the system time.
    const clockReaders = files.filter(
      (file) =>
        file.startsWith(CLOCK_DIR) &&
        /\bnew\s+Date\s*\(\s*\)|\bDate\s*\.\s*now\s*\(/.test(maskComments(file, readMobile(file))),
    );
    expect(clockReaders).toContain("src/lib/clock/clock.ts");
  });
});
