import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "./src/context/AuthContext";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { useAppTheme } from "./src/hooks/useAppTheme";

function Root() {
  const { colorScheme } = useAppTheme();
  const { loading, themeMode } = useSettings();
  const isDark = themeMode === "dark" || (themeMode === "system" && colorScheme === "dark");

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: isDark ? "#07111f" : "#f4f7fb",
      card: isDark ? "#0f172a" : "#ffffff",
      text: isDark ? "#e5edf7" : "#0f172a",
      primary: "#2563eb",
      border: isDark ? "#1e293b" : "#dbe3ef",
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {loading ? (
        <View style={[styles.loading, { backgroundColor: navTheme.colors.background }]}>
          <ActivityIndicator color={navTheme.colors.primary} />
          <Text style={[styles.loadingText, { color: navTheme.colors.text }]}>Loading mobile settings</Text>
        </View>
      ) : (
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <Root />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "700",
    opacity: 0.65,
  },
});
