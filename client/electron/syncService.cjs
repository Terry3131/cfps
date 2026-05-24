const store = require("./localStore.cjs");

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function syncMemoQueue(db, onProgress = () => {}) {
  const session = await store.getAuthSession(db);

  if (!session?.token || !session?.apiBaseUrl) {
    return {
      ok: false,
      stopped: true,
      authRequired: true,
      processed: 0,
      succeeded: 0,
      failed: 0,
      conflicted: 0,
      retried: 0,
      message: "Desktop session is missing. Please sign in again.",
      queue: await store.getPendingQueueSummary(db),
    };
  }

  const items = await store.listMemoQueueItemsForSync(db);
  const total = items.length;
  const result = {
    ok: true,
    stopped: false,
    authRequired: false,
    processed: 0,
    succeeded: 0,
    failed: 0,
    conflicted: 0,
    retried: 0,
    skipped: 0,
    details: [],
  };

  onProgress({
    phase: "start",
    total,
    currentIndex: 0,
    currentItem: null,
  });

  for (const [index, item] of items.entries()) {
    onProgress({
      phase: "item",
      total,
      currentIndex: index + 1,
      currentItem: {
        id: item.id,
        syncId: item.syncId,
        operationType: item.operationType,
        retryCount: item.retryCount,
      },
      counts: {
        succeeded: result.succeeded,
        failed: result.failed,
        conflicted: result.conflicted,
      },
    });

    const localMemo = await store.getLocalMemo(db, item.entityLocalId);

    if (!localMemo) {
      const message = "Local memo no longer exists.";
      await store.markQueueItemFailed(db, item, message, false);
      await sendSyncNotification(session, "SYNC_FAILED", item, message);
      result.failed += 1;
      result.details.push({
        id: item.id,
        syncId: item.syncId,
        status: "FAILED",
        message,
      });
      continue;
    }

    if (localMemo.syncId !== item.syncId) {
      const message = "Local memo sync_id does not match queue item.";
      await store.markQueueItemConflict(db, item, message, null);
      await sendSyncNotification(session, "SYNC_CONFLICT", item, message);
      result.conflicted += 1;
      result.details.push({
        id: item.id,
        syncId: item.syncId,
        status: "CONFLICT",
        message,
      });
      continue;
    }

    if (item.operationType === "UPDATE" && item.retryCount >= 2) {
      const message = "Update sync stopped after two retry attempts. Manual retry is required.";
      await store.markQueueItemFailed(db, item, message, false);
      await sendSyncNotification(session, "SYNC_FAILED", item, message);
      result.failed += 1;
      result.details.push({
        id: item.id,
        syncId: item.syncId,
        status: "FAILED",
        message,
      });
      continue;
    }

    try {
      await store.markQueueItemSyncing(db, item);
      result.processed += 1;

      const response = await sendMemoRequest(session, item, localMemo);
      const payload = await readJson(response);
      const serverMemo = unwrapMemo(payload);

      if (response.status === 401) {
        const message = "Authentication expired. Please sign in again.";
        await store.markQueueItemPending(db, item, message);
        await store.clearAuthSession(db);
        result.ok = false;
        result.stopped = true;
        result.authRequired = true;
        result.details.push({
          id: item.id,
          syncId: item.syncId,
          status: "AUTH_REQUIRED",
          message,
        });
        break;
      }

      if (response.status === 400) {
        const message = getErrorMessage(payload, "Memo validation failed.");
        await store.markQueueItemFailed(db, item, message, false);
        await sendSyncNotification(session, "SYNC_FAILED", item, message);
        result.failed += 1;
        result.details.push({
          id: item.id,
          syncId: item.syncId,
          status: "FAILED",
          message,
        });
        continue;
      }

      if (response.status === 409) {
        const message = getErrorMessage(
          payload,
          "Server conflict detected. Manual review required."
        );

        await store.markQueueItemConflict(db, item, message, serverMemo);

        result.conflicted += 1;
        result.details.push({
          id: item.id,
          syncId: item.syncId,
          status: "CONFLICT",
          message,
        });

        continue;
      }

      if (response.status >= 500) {
        const message = getErrorMessage(payload, "Server error while syncing memo.");
        const failure = await store.markQueueItemFailed(db, item, message, true);
        if (!failure.shouldRetry) {
          await sendSyncNotification(session, "SYNC_FAILED", item, message);
        }
        result.retried += failure.shouldRetry ? 1 : 0;
        result.failed += failure.shouldRetry ? 0 : 1;
        result.details.push({
          id: item.id,
          syncId: item.syncId,
          status: failure.queueStatus,
          retryCount: failure.retryCount,
          message,
        });
        continue;
      }

      if (!response.ok) {
        const message = getErrorMessage(payload, "Memo sync failed.");
        const failure = await store.markQueueItemFailed(db, item, message, false);
        await sendSyncNotification(session, "SYNC_FAILED", item, message);
        result.failed += 1;
        result.details.push({
          id: item.id,
          syncId: item.syncId,
          status: failure.queueStatus,
          message,
        });
        continue;
      }

      const responseServerId = store.extractServerId(serverMemo);

      if (item.operationType === "CREATE" && !responseServerId) {
        const message = "Server response is missing memo id after create.";
        await store.markQueueItemFailed(db, item, message, false);
        await sendSyncNotification(session, "SYNC_FAILED", item, message);
        result.failed += 1;
        result.details.push({
          id: item.id,
          syncId: item.syncId,
          status: "FAILED",
          message,
        });
        continue;
      }

      const conflictMessage = getConflictMessage(item, localMemo, serverMemo);

      if (conflictMessage) {
        await store.markQueueItemConflict(db, item, conflictMessage, serverMemo);
        await sendSyncNotification(session, "SYNC_CONFLICT", item, conflictMessage);
        result.conflicted += 1;
        result.details.push({
          id: item.id,
          syncId: item.syncId,
          status: "CONFLICT",
          message: conflictMessage,
        });
        continue;
      }

      const success = await store.markQueueItemSucceeded(db, item, serverMemo);
      result.succeeded += 1;
      result.details.push({
        id: item.id,
        syncId: success.syncId,
        serverId: success.serverId,
        status: "SYNCED",
        message: "Memo synced.",
      });
    } catch (err) {
      const message =
        err?.name === "AbortError"
          ? "Network timeout while syncing memo. Will retry later."
          : err?.message || "Network failure while syncing memo.";
      const failure = await store.markQueueItemFailed(db, item, message, true);
      if (!failure.shouldRetry) {
        await sendSyncNotification(session, "SYNC_FAILED", item, message);
      }
      result.retried += failure.shouldRetry ? 1 : 0;
      result.failed += failure.shouldRetry ? 0 : 1;
      result.details.push({
        id: item.id,
        syncId: item.syncId,
        status: failure.queueStatus,
        retryCount: failure.retryCount,
        message,
      });
    }
  }

  const queue = await store.getPendingQueueSummary(db);
  const finalResult = {
    ...result,
    queue,
    message: buildSummaryMessage(result, queue),
  };

  onProgress({
    phase: "complete",
    total,
    currentIndex: total,
    currentItem: null,
    counts: {
      succeeded: result.succeeded,
      failed: result.failed,
      conflicted: result.conflicted,
    },
  });

  return finalResult;
}

async function sendMemoRequest(session, item, localMemo) {
  const apiBaseUrl = session.apiBaseUrl.replace(/\/$/, "");
  const headers = {
    Authorization: `Bearer ${session.token}`,
    "Content-Type": "application/json",
  };

  if (item.operationType === "CREATE") {
    return fetchWithTimeout(`${apiBaseUrl}/memos`, {
      method: "POST",
      headers,
      body: JSON.stringify(buildRequestPayload(localMemo)),
    });
  }

  if (item.operationType === "UPDATE") {
    const serverId = item.entityServerId || localMemo.serverId;

    if (!serverId) {
      throw new Error("Cannot sync memo update without a server id.");
    }

    return fetchWithTimeout(`${apiBaseUrl}/memos/${encodeURIComponent(serverId)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(buildRequestPayload(localMemo)),
    });
  }

  throw new Error(`Unsupported memo sync operation: ${item.operationType}`);
}

async function sendSyncNotification(session, type, item, message) {
  if (!session?.token || !session?.apiBaseUrl) return;

  try {
    await fetch(`${session.apiBaseUrl.replace(/\/$/, "")}/notifications/sync-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type,
        message,
        metadata: {
          sync_id: item.syncId,
          queue_id: item.id,
          operation_type: item.operationType,
          entity_local_id: item.entityLocalId,
          entity_server_id: item.entityServerId,
          retry_count: item.retryCount,
        },
      }),
    });
  } catch {
    // Sync notification reporting must not affect local queue state.
  }
}

function buildRequestPayload(localMemo) {
  return {
    reference_no: localMemo.reference_no,
    heading: localMemo.heading,
    description: localMemo.description,
    category: localMemo.category,
    branch_dru: localMemo.branch_dru,
    beneficiary_name: localMemo.beneficiary_name,
    movement_type: localMemo.movement_type,
    state: localMemo.state,
    location: localMemo.location,
    geopolitical_zone: localMemo.geopolitical_zone,
    amount: localMemo.amount,
    currency: localMemo.currency,
    sync_id: localMemo.syncId,
    version: localMemo.version,
    last_modified_at: localMemo.lastModifiedAt,
  };
}

async function readJson(response) {
  return response.json().catch(() => ({}));
}

function unwrapMemo(payload) {
  return payload?.data?.memo || payload?.data || payload?.memo || payload;
}

function getErrorMessage(payload, fallback) {
  return payload?.message || payload?.error || payload?.details || fallback;
}

function getConflictMessage(item, localMemo, serverMemo) {
  const responseServerId = store.extractServerId(serverMemo);
  const expectedServerId = item.entityServerId || localMemo.serverId;

  if (expectedServerId && responseServerId && String(responseServerId) !== String(expectedServerId)) {
    return "Server response id does not match local memo server id.";
  }

  const responseSyncId = store.extractSyncId(serverMemo);

  if (responseSyncId && String(responseSyncId) !== String(item.syncId)) {
    return "Server response sync_id does not match local memo sync_id.";
  }

  return "";
}

function buildSummaryMessage(result, queue) {
  if (result.authRequired) {
    return "Authentication expired. Unsynced queue was kept intact.";
  }

  return [
    `Processed ${result.processed} memo queue item${result.processed === 1 ? "" : "s"}.`,
    `Synced ${result.succeeded}.`,
    `Failed ${result.failed}.`,
    `Conflicts ${result.conflicted}.`,
    `Pending ${queue.pendingCount}.`,
  ].join(" ");
}

module.exports = {
  fetchWithTimeout,
  syncMemoQueue,
};
