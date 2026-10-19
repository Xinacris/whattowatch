import { useFonts, Anton_400Regular } from "@expo-google-fonts/anton";
import { IBMPlexMono_400Regular, IBMPlexMono_700Bold } from "@expo-google-fonts/ibm-plex-mono";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PrefsProvider } from "@/lib/prefs";
import { colors } from "@/lib/theme";

export default function RootLayout() {
  const [loaded] = useFonts({ Anton_400Regular, IBMPlexMono_400Regular, IBMPlexMono_700Bold });
  if (!loaded) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.shelf }}>
      <PrefsProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerStyle: { backgroundColor: colors.shelf }, headerTintColor: colors.paper, headerTitleStyle: { fontFamily: "Anton_400Regular" }, contentStyle: { backgroundColor: colors.shelf }, headerShadowVisible: false, title: "" }} />
      </PrefsProvider>
    </GestureHandlerRootView>
  );
}
