import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Badge({ children, tone = "slate" }) {
  const style = tones[tone] || tones.slate;

  return (
    <View style={[styles.badge, { backgroundColor: style.backgroundColor }]}>
      <Text style={[styles.text, { color: style.color }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    maxWidth: "100%",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});

const tones = {
  blue: { backgroundColor: "#dbeafe", color: "#1e40af" },
  green: { backgroundColor: "#dcfce7", color: "#166534" },
  red: { backgroundColor: "#fee2e2", color: "#991b1b" },
  amber: { backgroundColor: "#fef3c7", color: "#92400e" },
  slate: { backgroundColor: "#e2e8f0", color: "#334155" },
};
