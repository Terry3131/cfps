import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useTheme } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import AlertCard from "../components/AlertCard";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { useAuth } from "../context/AuthContext";
import { useNotificationPolling } from "../hooks/useNotificationPolling";
import {
  fetchNotifications,
  markNotificationRead,
  markNotificationsReadAll,
} from "../services/notificationService";
import { getApiErrorMessage } from "../api/client";
import { filterNotificationsForRole, groupNotificationsByRole } from "../utils/notifications";

export default function NotificationCenterScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState("");
  const [markingAll, setMarkingAll] = useState(false);
  const initialLoadStartedRef = useRef(false);

  const unreadCount = useMemo(
    () => filterNotificationsForRole(notifications, user?.role)
      .filter((item) => !Boolean(item?.is_read ?? item?.isRead)).length,
    [notifications, user?.role]
  );

  const load = useCallback(async ({ quiet = false, source = "screen" } = {}) => {
    try {
      if (!quiet) setLoading(true);
      const data = await fetchNotifications({ source });
      setNotifications(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load notifications."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || initialLoadStartedRef.current) return;

      initialLoadStartedRef.current = true;
      load({ quiet: false, source: "focus" });
    }, [isAuthenticated, load])
  );

  useEffect(() => {
    if (!isAuthenticated) {
      initialLoadStartedRef.current = false;
    }
  }, [isAuthenticated]);

  useNotificationPolling({
    enabled: isAuthenticated,
    onError: (err) => setError(getApiErrorMessage(err, "Notification polling failed.")),
    onNotifications: setNotifications,
  });

  const refresh = () => {
    setRefreshing(true);
    load({ quiet: true, source: "manual" });
  };

  const markRead = async (item) => {
    try {
      setMarkingId(item.id);
      setError("");
      await markNotificationRead(item.id);
      await load({ quiet: true, source: "mutation" });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark notification as read."));
    } finally {
      setMarkingId("");
    }
  };

  const markAllRead = async () => {
    try {
      setMarkingAll(true);
      setError("");
      await markNotificationsReadAll();
      await load({ quiet: true, source: "mutation" });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark all notifications as read."));
    } finally {
      setMarkingAll(false);
    }
  };

  const grouped = groupNotificationsByRole(notifications, user?.role);
  const rows = grouped.flatMap((group) => [
    { kind: "group", id: `group-${group.label}`, label: group.label },
    ...group.items.map((item) => ({ kind: "item", id: `item-${item.id}`, item })),
  ]);

  const renderItem = ({ item }) => {
    if (item.kind === "group") {
      return <Text style={[styles.groupTitle, { color: theme.colors.text }]}>{item.label}</Text>;
    }

    return (
      <AlertCard
        item={item.item}
        marking={markingId === item.item.id}
        onMarkRead={() => markRead(item.item)}
        onOpen={() => navigation.navigate("MemoAlertDetails", { notification: item.item })}
        role={user?.role}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Notification Center</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            {unreadCount} unread alert{unreadCount === 1 ? "" : "s"}
          </Text>
        </View>

        <Button
          disabled={unreadCount === 0}
          loading={markingAll}
          onPress={markAllRead}
          tone="secondary"
        >
          Mark All Read
        </Button>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={rows}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              title="No notifications"
              message="Operational alerts, memo updates, validation notices, and sync warnings will appear here."
            />
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  error: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
    padding: 10,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
    marginTop: 14,
    opacity: 0.72,
    textTransform: "uppercase",
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  list: {
    gap: 10,
    paddingBottom: 28,
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  subtitle: {
    fontSize: 13,
    opacity: 0.66,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
  },
});
