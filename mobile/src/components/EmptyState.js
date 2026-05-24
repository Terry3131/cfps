import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

export default function EmptyState({ message, title }) {
  const theme = useTheme();

  return (
    <View style={[styles.container, { borderColor: theme.dark ? "#1e293b" : "#dbe3ef" }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 22,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.65,
    textAlign: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
});
