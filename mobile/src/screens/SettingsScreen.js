import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import Button from "../components/Button";
import Field from "../components/Field";
import Screen from "../components/Screen";
import { useSettings } from "../context/SettingsContext";

const THEME_OPTIONS = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const { apiBaseUrl, setApiBaseUrl, setThemeMode, themeMode } = useSettings();
  const [draftUrl, setDraftUrl] = useState(apiBaseUrl);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");
      await setApiBaseUrl(draftUrl);
      setMessage("Settings saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title="Settings" subtitle="Network and display preferences for field testing.">
      <View style={[styles.panel, { backgroundColor: theme.dark ? "#0f172a" : "#ffffff", borderColor: theme.dark ? "#1e293b" : "#dbe3ef" }]}>
        <Field label="API Base URL" onChangeText={setDraftUrl} placeholder="https://api.example.mil/api" value={draftUrl} />

        <View style={styles.segment}>
          {THEME_OPTIONS.map((option) => {
            const selected = themeMode === option.value;

            return (
              <Pressable
                accessibilityRole="button"
                key={option.value}
                onPress={() => setThemeMode(option.value)}
                style={[
                  styles.segmentButton,
                  {
                    backgroundColor: selected ? "#1d4ed8" : (theme.dark ? "#111827" : "#f1f5f9"),
                    borderColor: theme.dark ? "#334155" : "#cbd5e1",
                  },
                ]}
              >
                <Text style={[styles.segmentText, { color: selected ? "#ffffff" : theme.colors.text }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Button loading={saving} onPress={save}>
          Save Settings
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 16,
  },
  segment: {
    flexDirection: "row",
    gap: 8,
  },
  segmentButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
