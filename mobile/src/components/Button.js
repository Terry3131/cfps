import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";

export default function Button({ children, disabled, loading, onPress, tone = "primary" }) {
  const style = toneStyles[tone] || toneStyles.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        style.button,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={style.text.color} />
      ) : (
        <Text style={[styles.text, style.text]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
  },
  text: {
    fontSize: 14,
    fontWeight: "800",
  },
});

const toneStyles = {
  primary: {
    button: { backgroundColor: "#1d4ed8" },
    text: { color: "#ffffff" },
  },
  secondary: {
    button: { backgroundColor: "#dbeafe" },
    text: { color: "#1e3a8a" },
  },
  danger: {
    button: { backgroundColor: "#991b1b" },
    text: { color: "#ffffff" },
  },
  neutral: {
    button: { backgroundColor: "#334155" },
    text: { color: "#ffffff" },
  },
};
