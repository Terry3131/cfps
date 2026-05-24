import React from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Screen({ children, loading, scroll = true, subtitle, title }) {
  const theme = useTheme();
  const content = (
    <View style={styles.inner}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title ? <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text> : null}
          {subtitle ? <Text style={[styles.subtitle, { color: theme.colors.text }]}>{subtitle}</Text> : null}
        </View>
      )}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        children
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.container}
      >
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            {content}
          </ScrollView>
        ) : (
          content
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    gap: 6,
    marginBottom: 18,
  },
  inner: {
    flex: 1,
    padding: 16,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  scroll: {
    flexGrow: 1,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.68,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
});
