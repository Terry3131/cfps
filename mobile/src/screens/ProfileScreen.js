import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import Badge from "../components/Badge";
import Button from "../components/Button";
import Screen from "../components/Screen";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { getRoleLabel, getRoleScope } from "../utils/roles";

function Row({ label, value }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{value || "N/A"}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { logout, user } = useAuth();
  const { apiBaseUrl } = useSettings();

  return (
    <Screen title="Profile / Session" subtitle="Signed-in mobile notification session.">
      <View style={[styles.panel, { backgroundColor: theme.dark ? "#0f172a" : "#ffffff", borderColor: theme.dark ? "#1e293b" : "#dbe3ef" }]}>
        <View style={styles.badges}>
          <Badge tone="blue">{getRoleLabel(user?.role)}</Badge>
          <Badge tone="green">Read Only</Badge>
        </View>

        <Row label="Username" value={user?.username} />
        <Row label="Full Name" value={user?.full_name || user?.fullName} />
        <Row label="Branch / DRU" value={user?.branch_dru || user?.branchDru} />
        <Row label="Role Scope" value={getRoleScope(user?.role)} />
        <Row label="API Base URL" value={apiBaseUrl} />
      </View>

      <View style={styles.actions}>
        <Button tone="danger" onPress={logout}>
          Logout
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    marginTop: 14,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.58,
    textTransform: "uppercase",
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  row: {
    gap: 4,
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
});
