// Guards plugins/withIosSceneLifecycle.js: iOS 27 crashes at launch unless the generated
// AppDelegate adopts the UIScene life cycle. The plugin patches the SDK 57 prebuild template,
// so it must fail loudly (not silently no-op) when that template changes.
const plugin = require("../plugins/withIosSceneLifecycle") as {
  patchAppDelegate: (contents: string) => string;
  sceneManifest: (existing?: Record<string, unknown>) => Record<string, unknown>;
};

// Trimmed copy of the AppDelegate.swift that the SDK 57 template generates.
const SDK57_APP_DELEGATE = `internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
}
`;

describe("withIosSceneLifecycle", () => {
  describe("patchAppDelegate", () => {
    const patched = plugin.patchAppDelegate(SDK57_APP_DELEGATE);

    it("makes AppDelegate an ExpoReactNativeFactoryProvider", () => {
      expect(patched).toContain(
        "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
      );
    });

    it("no longer creates the window or starts React Native itself", () => {
      expect(patched).not.toContain("UIWindow(frame:");
      expect(patched).not.toContain("startReactNative");
      // The factory the scene delegate reads back is still created here.
      expect(patched).toContain("reactNativeFactory = factory");
      expect(patched).toContain("return super.application(application, didFinishLaunchingWithOptions");
    });

    it("appends exactly one SceneDelegate subclassing ExpoAppSceneDelegate", () => {
      expect(patched.match(/class SceneDelegate: ExpoAppSceneDelegate/g)).toHaveLength(1);
      expect(patched).toContain("@objc(SceneDelegate)");
    });

    it("is idempotent", () => {
      expect(plugin.patchAppDelegate(patched)).toBe(patched);
    });

    it("throws when the template no longer matches instead of silently doing nothing", () => {
      expect(() => plugin.patchAppDelegate("class Something {}")).toThrow(/no longer matches/);
      expect(() =>
        plugin.patchAppDelegate(SDK57_APP_DELEGATE.replace("window = UIWindow", "window = Other")),
      ).toThrow(/no longer matches/);
    });
  });

  describe("sceneManifest", () => {
    it("points the default configuration at SceneDelegate with a single scene", () => {
      const manifest = plugin.sceneManifest();
      expect(manifest.UIApplicationSupportsMultipleScenes).toBe(false);
      expect(JSON.stringify(manifest)).toContain("$(PRODUCT_MODULE_NAME).SceneDelegate");
    });

    it("keeps an existing manifest untouched", () => {
      const existing = { UIApplicationSupportsMultipleScenes: true };
      expect(plugin.sceneManifest(existing)).toBe(existing);
    });
  });
});
