import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function Field({ autoCapitalize = "none", label, onChangeText, placeholder, secureTextEntry, value }) {
  const theme = useTheme();
  const isDark = theme.dark;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
        secureTextEntry={secureTextEntry}
        style={[
          styles.input,
          {
            backgroundColor: isDark ? "#111827" : "#ffffff",
            borderColor: isDark ? "#334155" : "#cbd5e1",
            color: theme.colors.text,
          },
        ]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.72,
    textTransform: "uppercase",
  },
});
