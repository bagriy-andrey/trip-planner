// AC-23: the route set is a contract for future deep/universal links. It must equal
// the route map of SPEC-01 exactly — no extra, no missing, no renamed route.

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

const APP_DIR = path.resolve(__dirname, "../app");

// SPEC-01 "Карта маршрутов (контракт)" + `/reset-password` (SPEC-02 S10b) + `/trips/[tripId]/edit` (SPEC-03 S8b) + the two service routes.
const SPEC_ROUTES = [
  "/onboarding",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/legal/terms",
  "/legal/privacy",
  "/trips",
  "/history",
  "/profile",
  "/trips/new",
  "/trips/[tripId]",
  "/trips/[tripId]/edit",
  "/trips/[tripId]/route",
  "/trips/[tripId]/flights/new",
  "/trips/[tripId]/flights/[flightId]",
  "/trips/[tripId]/hotels/new",
  "/trips/[tripId]/cars/new",
];
const SERVICE_ROUTES = ["/", "/+not-found"];
const LAYOUT_FILES = ["(tabs)/_layout.tsx", "_layout.tsx"];
// Route files are thin (mobile-architecture): read params, render a feature screen.
const MAX_ROUTE_LINES = 40;

/** Every file under app/, posix-style, relative to app/. Deliberately no filtering. */
function listFiles(dir: string, prefix = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? listFiles(path.join(dir, entry.name), relative) : [relative];
  });
}

/** `(tabs)/history.tsx` -> `/history`, `trips/[tripId]/index.tsx` -> `/trips/[tripId]`. */
function toRoute(file: string): string {
  const withoutExtension = file.replace(/\.tsx$/, "");
  const segments = withoutExtension
    .split("/")
    .filter((segment) => !/^\(.+\)$/.test(segment)) // route groups add no URL segment
    .filter((segment) => segment !== "index");
  return `/${segments.join("/")}`;
}

const allFiles = listFiles(APP_DIR).sort();
const routeFiles = allFiles.filter((file) => !LAYOUT_FILES.includes(file));

describe("route map contract (AC-23)", () => {
  it("contains only route files and the two layouts (expo-router treats every file in app/ as a route)", () => {
    // A stray helper or test under app/ would be bundled as a route, so anything that
    // is not a `.tsx` route/layout is a failure.
    const notRoutes = allFiles.filter((file) => !file.endsWith(".tsx"));
    expect(notRoutes).toEqual([]);
    const testFiles = allFiles.filter((file) => /__tests__|\.(test|spec)\./.test(file));
    expect(testFiles).toEqual([]);
    for (const layout of LAYOUT_FILES) expect(allFiles).toContain(layout);
  });

  it("maps files to exactly the spec route map plus the service routes", () => {
    const routes = routeFiles.map(toRoute);
    expect([...routes].sort()).toEqual([...SPEC_ROUTES, ...SERVICE_ROUTES].sort());
  });

  it("has no two files resolving to the same route", () => {
    const routes = routeFiles.map(toRoute);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("auth routes have no dynamic segments and no params (SPEC-02 AC-39)", () => {
    // The email between S10 and S10b travels through the flow state, never the URL.
    const authRoutes = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];
    const routes = routeFiles.map(toRoute);
    for (const route of authRoutes) expect(routes).toContain(route);
    expect(authRoutes.filter((route) => /[[\]*]/.test(route))).toEqual([]);
    for (const file of ["sign-in.tsx", "sign-up.tsx", "forgot-password.tsx", "reset-password.tsx"]) {
      const source = fs.readFileSync(path.join(APP_DIR, file), "utf8");
      expect(source).not.toMatch(/useLocalSearchParams|useGlobalSearchParams|searchParams/);
    }
  });

  it("keeps every route file thin (layouts own providers/options and are exempt)", () => {
    const tooLong = routeFiles
      .map((file) => ({
        file,
        lines: fs.readFileSync(path.join(APP_DIR, file), "utf8").split("\n").length,
      }))
      .filter(({ lines }) => lines > MAX_ROUTE_LINES)
      .map(({ file, lines }) => `${file}: ${lines} lines`);
    expect(tooLong).toEqual([]);
  });
});

export {};
