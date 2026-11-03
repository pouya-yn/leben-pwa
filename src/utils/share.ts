import { Platform, Share } from "react-native";

/**
 * Share plain text. Native: system share sheet.
 * Web: Web Share API when available (iOS/Android browsers), otherwise
 * falls back to copying to the clipboard.
 */
export async function shareText(text: string): Promise<void> {
  if (Platform.OS !== "web") {
    Share.share({ message: text }).catch(() => {});
    return;
  }
  const nav = navigator as Navigator & {
    share?: (data: { text: string }) => Promise<void>;
  };
  if (nav.share) {
    try {
      await nav.share({ text });
    } catch {
      // user dismissed the share sheet
    }
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    window.alert("In die Zwischenablage kopiert / Copied to clipboard");
  } catch {
    window.alert(text);
  }
}
