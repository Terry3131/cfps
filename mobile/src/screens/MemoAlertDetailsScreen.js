import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRoute, useTheme } from "@react-navigation/native";

import Badge from "../components/Badge";
import EmptyState from "../components/EmptyState";
import ProgressBar from "../components/ProgressBar";
import Screen from "../components/Screen";
import { getApiErrorMessage } from "../api/client";
import { fetchMemoById } from "../services/notificationService";
import { formatDateTime, labelize } from "../utils/format";
import {
  getNotificationPriority,
  getRelatedMemoId,
  getRelatedMemoReference,
  normalizeNotificationType,
} from "../utils/notifications";
import { useAuth } from "../context/AuthContext";

function valueFrom(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "") || "N/A";
}

function DetailRow({ label, value }) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.colors.text }]}>{String(value || "N/A")}</Text>
    </View>
  );
}

export default function MemoAlertDetailsScreen() {
  const route = useRoute();
  const theme = useTheme();
  const { user } = useAuth();
  const notification = route.params?.notification || {};
  const [memo, setMemo] = useState(null);
  const [fetchingMemo, setFetchingMemo] = useState(Boolean(getRelatedMemoId(notification)));
  const [error, setError] = useState("");

  const metadata = notification.metadata || {};
  const memoId = getRelatedMemoId(notification);

  useEffect(() => {
    let mounted = true;

    async function loadMemo() {
      if (!memoId) {
        setFetchingMemo(false);
        return;
      }

      try {
        setFetchingMemo(true);
        setError("");
        const data = await fetchMemoById(memoId);
        if (mounted) setMemo(data);
      } catch (err) {
        if (mounted) setError(getApiErrorMessage(err, "Failed to load memo alert details."));
      } finally {
        if (mounted) setFetchingMemo(false);
      }
    }

    loadMemo();

    return () => {
      mounted = false;
    };
  }, [memoId]);

  const type = normalizeNotificationType(notification.type);
  const priority = getNotificationPriority(notification, user?.role);
  const reference = useMemo(
    () => valueFrom(
      metadata.reference_no,
      metadata.referenceNo,
      getRelatedMemoReference(notification),
      memo?.reference_no
    ),
    [memo, metadata.referenceNo, metadata.reference_no, notification]
  );
  const progress = valueFrom(
    metadata.progress_percent,
    metadata.progressPercent,
    metadata.progress,
    memo?.progress_percent,
    memo?.progress,
    memo?.completion_percent,
    0
  );

  if (!notification?.id && !memoId) {
    return (
      <Screen title="Memo Alert Details">
        <EmptyState title="Alert unavailable" message="This alert could not be opened from local navigation state." />
      </Screen>
    );
  }

  return (
    <Screen
      title="Memo Alert Details"
      subtitle={fetchingMemo ? "Read-only alert context. Syncing memo fields..." : "Read-only alert and memo context."}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={[styles.panel, { backgroundColor: theme.dark ? "#0f172a" : "#ffffff", borderColor: theme.dark ? "#1e293b" : "#dbe3ef" }]}>
        <View style={styles.badges}>
          <Badge tone="blue">{labelize(type)}</Badge>
          <Badge tone={priority === "high" ? "red" : priority === "medium" ? "amber" : "slate"}>{priority}</Badge>
          <Badge tone={notification?.is_read ? "slate" : "green"}>
            {notification?.is_read ? "Read" : "Unread"}
          </Badge>
        </View>

        <Text style={[styles.heading, { color: theme.colors.text }]}>
          {valueFrom(metadata.heading, metadata.title, notification.title, memo?.heading)}
        </Text>
        <Text style={[styles.message, { color: theme.colors.text }]}>
          {valueFrom(notification.message, metadata.message)}
        </Text>
      </View>

      <View style={[styles.panel, { backgroundColor: theme.dark ? "#0f172a" : "#ffffff", borderColor: theme.dark ? "#1e293b" : "#dbe3ef" }]}>
        <DetailRow label="Reference No" value={reference} />
        <DetailRow label="Heading" value={valueFrom(metadata.heading, metadata.title, memo?.heading)} />
        <DetailRow label="Category" value={valueFrom(metadata.category, memo?.category)} />
        <DetailRow label="Workflow Type" value={labelize(valueFrom(metadata.workflow_type, metadata.workflowType, memo?.workflow_type))} />
        <DetailRow label="Branch / DRU" value={valueFrom(metadata.branch_dru, metadata.branchDru, memo?.branch_dru_name, memo?.branch_dru)} />
        <DetailRow label="Beneficiary" value={valueFrom(metadata.beneficiary_name, metadata.beneficiaryName, memo?.beneficiary_name)} />
        <DetailRow label="Release Status" value={labelize(valueFrom(metadata.release_status, metadata.releaseStatus, memo?.fund_release_status, memo?.release_status))} />
        <DetailRow label="Lifecycle Status" value={labelize(valueFrom(metadata.lifecycle_status, metadata.lifecycleStatus, memo?.lifecycle_stage, memo?.business_status))} />
        <DetailRow label="Notification Timestamp" value={formatDateTime(notification.created_at || notification.createdAt)} />

        <View style={styles.progressBlock}>
          <Text style={[styles.label, { color: theme.colors.text }]}>Progress Percent</Text>
          <ProgressBar value={progress} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  error: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    padding: 10,
  },
  heading: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.58,
    textTransform: "uppercase",
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.68,
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    marginBottom: 14,
    padding: 16,
  },
  progressBlock: {
    gap: 8,
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
