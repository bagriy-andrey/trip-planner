// Static checks for the auth forms that no runtime test can prove (SPEC-02 AC-36, AC-39):
// - no system alert / modal in feature code: errors live in the form;
// - no password, new password or recovery code in the arguments of a router call.
// They read the SOURCE with the TypeScript parser, so a comment or a string that merely contains
// the word "password" (like the URL "/forgot-password") is not a false alarm.
import ts from "typescript";

// `@types/node` is not a dependency of this package (tsconfig `types: ["jest"]`), so the few
// Node APIs this test needs are typed locally.
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

const MOBILE_ROOT = path.resolve(__dirname, "../../../..");

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(MOBILE_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const relative = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(relative);
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name) ? [relative] : [];
  });
}

function parse(source: string): ts.SourceFile {
  return ts.createSourceFile("x.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

const FORBIDDEN_UI = new Set(["Alert", "Modal", "ActionSheetIOS", "ToastAndroid"]);

/** Names of system alert / modal APIs that the file imports from `react-native`. */
function systemDialogImports(source: string): string[] {
  const found: string[] = [];
  parse(source).forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== "react-native") return;
    const bindings = node.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const imported = (element.propertyName ?? element.name).text;
        if (FORBIDDEN_UI.has(imported)) found.push(imported);
      }
    }
  });
  return found;
}

const NAVIGATION_METHODS = new Set(["push", "replace", "navigate", "setParams", "dismissTo", "prefetch"]);
const SENSITIVE = /password|passwd|code|token|otp/i;

/**
 * Identifiers and object keys inside the arguments of `<x>.push/replace/navigate(...)`. A string
 * literal is deliberately not inspected: a URL like "/forgot-password" is a route name, not data.
 */
function sensitiveRouterArguments(source: string): string[] {
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      NAVIGATION_METHODS.has(node.expression.name.text)
    ) {
      for (const argument of node.arguments) {
        const inspect = (inner: ts.Node) => {
          if (ts.isIdentifier(inner) && SENSITIVE.test(inner.text)) found.push(inner.text);
          ts.forEachChild(inner, inspect);
        };
        inspect(argument);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(source));
  return found;
}

const featureFiles = sourceFiles("src/features");
const authFiles = featureFiles.filter((file) => file.startsWith("src/features/auth/"));
const read = (file: string) => fs.readFileSync(path.join(MOBILE_ROOT, file), "utf8");

describe("static rules: scanner self-test", () => {
  it("flags a system alert or modal import", () => {
    expect(systemDialogImports(`import { Alert, View } from "react-native";`)).toEqual(["Alert"]);
    expect(systemDialogImports(`import { Modal as M } from "react-native";`)).toEqual(["Modal"]);
    expect(systemDialogImports(`import { View } from "react-native";`)).toEqual([]);
  });

  it("flags credentials in router call arguments but not route names", () => {
    expect(sensitiveRouterArguments(`router.push("/forgot-password");`)).toEqual([]);
    expect(sensitiveRouterArguments(`router.push({ pathname: "/reset-password", params: { code } });`)).toEqual([
      "code",
    ]);
    expect(sensitiveRouterArguments("router.replace(`/reset-password?p=${newPassword}`);")).toEqual([
      "newPassword",
    ]);
    expect(sensitiveRouterArguments(`router.navigate({ pathname: "/x", params: { password: 1 } });`)).toEqual([
      "password",
    ]);
  });
});

describe("static rules: auth feature", () => {
  it("scans the auth screens (guards against an empty glob)", () => {
    for (const screen of ["SignInScreen", "SignUpScreen", "ForgotPasswordScreen", "ResetPasswordScreen"]) {
      expect(authFiles).toContain(`src/features/auth/${screen}.tsx`);
    }
  });

  it("AC-36: no Alert / Modal in any feature code", () => {
    const offenders = featureFiles.flatMap((file) =>
      systemDialogImports(read(file)).map((name) => `${file}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("AC-39: no password, new password or code in router push/replace/navigate arguments", () => {
    const offenders = [...authFiles, "app/reset-password.tsx", "app/forgot-password.tsx"].flatMap((file) =>
      sensitiveRouterArguments(read(file)).map((name) => `${file}: ${name}`),
    );
    expect(offenders).toEqual([]);
  });

  it("AC-39: the credential fields are never written to storage or the console by the screens", () => {
    const offenders = authFiles
      .filter((file) => !file.includes("/api/"))
      .filter((file) => /console\.|AsyncStorage|SecureStore|setItem/.test(read(file)));
    expect(offenders).toEqual([]);
  });
});
