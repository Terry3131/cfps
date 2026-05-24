import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { formatDateTime, labelize } from "../utils/format";
import {
  getNotificationPriority,
  getRelatedMemoReference,
  normalizeNotificationType,
} from "../utils/notifications";
import Badge from "./Badge";
import Button from "./Button";

const priorityTone = {
  high: "red",
  medium: "amber",
  normal: "slate",
};

export default function AlertCard({ item, marking, onMarkRead, onOpen, role }) {
  const theme = useTheme();
  const isRead = Boolean(item?.is_read ?? item?.isRead);
  const type = normalizeNotificationType(item?.type);
  const priority = getNotificationPriority(item, role);
  const reference = getRelatedMemoReference(item);
  const title = item?.title || labelize(type);
  const message = item?.message || item?.description || "No message supplied.";
  const createdAt = item?.created_at || item?.createdAt;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.dark ? "#0f172a" : "#ffffff",
          borderColor: isRead ? (theme.dark ? "#1e293b" : "#dbe3ef") : "#2563eb",
        },
        !isRead && styles.unread,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.topRow}>
        <Badge tone={isRead ? "slate" : "blue"}>{isRead ? "Read" : "Unread"}</Badge>
        <Badge tone={priorityTone[priority]}>{priority}</Badge>
      </View>

      <View style={styles.body}>
        <Text style={[styles.type, { color: theme.colors.primary }]}>{labelize(type)}</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>{message}</Text>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: theme.colors.text }]}>
          {formatDateTime(createdAt)}
        </Text>
        {reference ? (
          <Text style={[styles.metaText, { color: theme.colors.text }]}>Memo {reference}</Text>
        ) : null}
      </View>

      {!isRead ? (
        <Button tone="secondary" loading={marking} onPress={onMarkRead}>
          Mark Read
        </Button>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 5,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.72,
  },
  meta: {
    gap: 2,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.56,
  },
  pressed: {
    opacity: 0.9,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 21,
  },
  topRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  type: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  unread: {
    borderLeftWidth: 4,
  },
});
