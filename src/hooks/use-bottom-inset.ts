import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

let webInsetCache: number | null = null;

function measureWebInset(): number {
  if (webInsetCache !== null) return webInsetCache;
  try {
    const probe = document.createElement("div");
    probe.style.cssText =
      "position:fixed;visibility:hidden;height:0;padding-bottom:env(safe-area-inset-bottom, 0px);";
    document.body.appendChild(probe);
    webInsetCache = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
    document.body.removeChild(probe);
  } catch {
    webInsetCache = 0;
  }
  return webInsetCache;
}

/**
 * Bottom safe-area inset. Native: from safe-area-context.
 * Web (installed PWA with viewport-fit=cover): measured from the CSS
 * env(safe-area-inset-bottom) variable, so the home-indicator area of
 * an installed PWA is respected like on native.
 */
export function useBottomInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === "web") {
    return typeof document !== "undefined" ? measureWebInset() : 0;
  }
  return insets.bottom;
}
