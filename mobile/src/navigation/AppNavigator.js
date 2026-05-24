import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import LoginScreen from "../screens/LoginScreen";
import MemoAlertDetailsScreen from "../screens/MemoAlertDetailsScreen";
import NotificationCenterScreen from "../screens/NotificationCenterScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoadingGate() {
  const theme = useTheme();

  return (
    <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator color={theme.colors.primary} />
      <Text style={[styles.loadingText, { color: theme.colors.text }]}>Restoring secure session</Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "800" },
      }}
    >
      <Tab.Screen name="Notifications" component={NotificationCenterScreen} />
      <Tab.Screen name="Session" component={ProfileScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { loading: settingsLoading } = useSettings();

  if (authLoading || settingsLoading) {
    return <LoadingGate />;
  }

  return (
    <Stack.Navigator>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Home" component={Tabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="MemoAlertDetails"
            component={MemoAlertDetailsScreen}
            options={{ title: "Memo Alert Details" }}
          />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
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
