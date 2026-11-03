import { enableLegacyHeaderAppearance, Stack } from "expo-router";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { AppStoreProvider } from "@/store/app-store";

// Restore the classic opaque header on iOS 26+ (content renders below the
// header instead of underneath it). Native-only API.
if (Platform.OS !== "web") {
  enableLegacyHeaderAppearance();
}

export default function RootLayout() {
  return (
    <AppStoreProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: "Leben in Deutschland" }}
        />
        <Stack.Screen name="list" options={{ title: "" }} />
        <Stack.Screen name="question" options={{ title: "" }} />
      </Stack>
    </AppStoreProvider>
  );
}
