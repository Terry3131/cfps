import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import Button from "../components/Button";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";

export default function LoginScreen() {
  const theme = useTheme();
  const { apiBaseUrl, setApiBaseUrl } = useSettings();
  const { error, loading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [baseUrl, setBaseUrl] = useState(apiBaseUrl);
  const [localError, setLocalError] = useState("");

  const handleLogin = async () => {
    setLocalError("");

    if (!username.trim() || !password) {
      setLocalError("Username and password are required.");
      return;
    }

    await setApiBaseUrl(baseUrl);
    await login(username.trim(), password);
  };

  const isDark = theme.dark;

  return (
    <Screen
      title="CFPS Mobile"
      subtitle="Operational notifications and memo alerts only."
    >
      <View style={[styles.panel, { backgroundColor: isDark ? "#0f172a" : "#ffffff", borderColor: isDark ? "#1e293b" : "#dbe3ef" }]}>
        <View style={styles.stack}>
          <Field label="API Base URL" onChangeText={setBaseUrl} placeholder="http://192.168.43.13:5000" value={baseUrl} />
          <Field label="Username" onChangeText={setUsername} placeholder="Username" value={username} />
          <Field label="Password" onChangeText={setPassword} placeholder="Password" secureTextEntry value={password} />

          {localError || error ? (
            <Text style={styles.error}>{localError || error}</Text>
          ) : null}

          <Button loading={loading} onPress={handleLogin}>
            Sign In
          </Button>
        </View>
      </View>

      <View style={styles.note}>
        <Text style={[styles.noteText, { color: theme.colors.text }]}>
          Use http://192.168.43.13:5000 for this LAN test, or your production HTTPS API gateway with /api when required.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    padding: 10,
  },
  note: {
    marginTop: 16,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.62,
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  stack: {
    gap: 14,
  },
});
