// Android variant of the neutral `Blur` (see blur.ts for the contract).
//
// `expo-blur` on Android only blurs real content when a `blurTarget` (a
// `BlurTargetView` wrapping the content to blur) is supplied; without it the
// `dimezisBlurView*` methods warn and fall back to `none`. The skeleton has no
// such target, so we request `none` explicitly: a translucent view. The glass
// look then comes from the token fill + border that GlassSurface draws on top.
import { BlurView } from "expo-blur";
import { createElement } from "react";
import type { ReactElement } from "react";

import type { BlurProps } from "./blur";

export type { BlurProps, BlurTint } from "./blur";

export function Blur({ intensity = 30, tint = "default", style, children }: BlurProps): ReactElement {
  return createElement(BlurView, { intensity, tint, style, blurMethod: "none" }, children);
}
