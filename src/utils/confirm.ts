import { Alert, Platform } from "react-native";

/**
 * Destructive-action confirmation. Native: Alert dialog.
 * Web: window.confirm (the only synchronous confirm UI browsers offer).
 */
export function confirmDestructive(
  title: string,
  message: string,
  cancelLabel: string,
  destructiveLabel: string,
  onConfirm: () => void
): void {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: destructiveLabel, style: "destructive", onPress: onConfirm },
  ]);
}
