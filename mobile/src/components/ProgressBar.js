import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { formatPercent } from "../utils/format";

export default function ProgressBar({ value }) {
  const theme = useTheme();
  const numeric = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: theme.dark ? "#1e293b" : "#dbeafe" }]}>
        <View style={[styles.fill, { width: `${numeric}%` }]} />
      </View>
      <Text style={[styles.label, { color: theme.colors.text }]}>{formatPercent(numeric)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  fill: {
    backgroundColor: "#2563eb",
    borderRadius: 999,
    height: "100%",
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.72,
  },
  track: {
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
});
