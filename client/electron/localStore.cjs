const { randomUUID } = require("crypto");
const { DEFAULT_SETTINGS, nowIso } = require("./database.cjs");

function parseJson(value, fallback = null) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function validateApiBaseUrl(value) {
  const text = String(value || "").trim();

  if (!text) {
    throw new Error("API Base URL is required.");
  }

  let url;

  try {
    url = new URL(text);
  } catch {
    throw new Error("API Base URL is invalid.");
  }

  const hostname = url.hostname.toLowerCase();

  const isLocalhost =
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  const isPrivateLanIp =
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname);

  const isHttpsDomain =
    url.protocol === "https:" &&
    /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(hostname);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Unsupported API protocol.");
  }

  if (url.protocol === "http:" && !(isLocalhost || isPrivateLanIp)) {
    throw new Error("HTTP API URLs are allowed only for localhost or approved LAN/dev IPs.");
  }

  if (!(isHttpsDomain || isLocalhost || isPrivateLanIp)) {
    throw new Error("API Base URL must be HTTPS domain, localhost, or approved LAN/dev IP.");
  }

  return url.toString().replace(/\/$/, "");
}

async function getSettings(db) {
  const rows = await db.prepare("SELECT key, value_json FROM settings").all();
  const settings = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    settings[row.key] = parseJson(row.value_json, settings[row.key]);
  }

  return settings;
}

async function updateSettings(db, values) {
  const allowedKeys = Object.keys(DEFAULT_SETTINGS);
  const update = db.prepare(`
    INSERT INTO settings (key, value_json, updated_at)
    VALUES (@key, @value_json, @updated_at)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = excluded.updated_at
  `);

  const timestamp = nowIso();

  if (Object.prototype.hasOwnProperty.call(values, "apiBaseUrl")) {
    values.apiBaseUrl = validateApiBaseUrl(values.apiBaseUrl);
  }

  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      await update.run({
        key,
        value_json: JSON.stringify(values[key]),
        updated_at: timestamp,
      });
    }
  }

  return getSettings(db);
}

async function saveAuthSession(db, { token, user, apiBaseUrl, rememberSession }) {
  const timestamp = nowIso();
  const validatedApiBaseUrl = validateApiBaseUrl(apiBaseUrl);

  await db.prepare(`
    INSERT INTO auth_session (
      id,
      token,
      user_json,
      api_base_url,
      remember_session,
      created_at,
      updated_at
    )
    VALUES (1, @token, @user_json, @api_base_url, @remember_session, @created_at, @updated_at)
    ON CONFLICT(id) DO UPDATE SET
      token = excluded.token,
      user_json = excluded.user_json,
      api_base_url = excluded.api_base_url,
      remember_session = excluded.remember_session,
      updated_at = excluded.updated_at
  `).run({
    token,
    user_json: JSON.stringify(user || null),
    api_base_url: validatedApiBaseUrl,
    remember_session: rememberSession ? 1 : 0,
    created_at: timestamp,
    updated_at: timestamp,
  });

  return getAuthSession(db);
}

async function getAuthSession(db) {
  const row = await db.prepare("SELECT * FROM auth_session WHERE id = 1").get();

  if (!row) return null;

  return {
    token: row.token,
    user: parseJson(row.user_json),
    apiBaseUrl: row.api_base_url,
    rememberSession: Boolean(row.remember_session),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getAuthState(db) {
  const session = await getAuthSession(db);

  return {
    authenticated: Boolean(session?.token && session?.user),
    user: session?.user || null,
    apiBaseUrl: session?.apiBaseUrl || null,
    updatedAt: session?.updatedAt || null,
  };
}

async function clearAuthSession(db) {
  await db.prepare("DELETE FROM auth_session WHERE id = 1").run();
}

async function listLocalMemos(db) {
  const rows = await db.prepare(`
    SELECT
      id,
      sync_id AS syncId,
      server_id AS serverId,
      reference_no,
      heading,
      description,
      category,
      branch_dru,
      beneficiary_name,
      movement_type,
      state,
      location,
      geopolitical_zone,
      amount,
      currency,
      payload_json AS payloadJson,
      version,
      sync_status AS syncStatus,
      is_locked AS isLocked,
      is_completed AS isCompleted,
      last_modified_at AS lastModifiedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM local_memos
    ORDER BY updated_at DESC
  `).all();

  return rows.map((memo) => ({
    ...normalizeMemoDraft(memo),
    payload: normalizeMemoDraft(parseJson(memo.payloadJson, {})),
  }));
}

async function getLocalMemo(db, id) {
  const row = await db.prepare(`
    SELECT
      id,
      sync_id AS syncId,
      server_id AS serverId,
      reference_no,
      heading,
      description,
      category,
      branch_dru,
      beneficiary_name,
      movement_type,
      state,
      location,
      geopolitical_zone,
      amount,
      currency,
      payload_json AS payloadJson,
      version,
      sync_status AS syncStatus,
      is_locked AS isLocked,
      is_completed AS isCompleted,
      last_modified_at AS lastModifiedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM local_memos
    WHERE id = ?
  `).get(id);

  if (!row) return null;

  return {
    ...normalizeMemoDraft(row),
    payload: normalizeMemoDraft(parseJson(row.payloadJson, {})),
  };
}

async function getLocalMemoBySyncId(db, syncId) {
  const row = await db.prepare(`
    SELECT
      id,
      sync_id AS syncId,
      server_id AS serverId,
      reference_no,
      heading,
      description,
      category,
      branch_dru,
      beneficiary_name,
      movement_type,
      state,
      location,
      geopolitical_zone,
      amount,
      currency,
      payload_json AS payloadJson,
      version,
      sync_status AS syncStatus,
      is_locked AS isLocked,
      is_completed AS isCompleted,
      last_modified_at AS lastModifiedAt,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM local_memos
    WHERE sync_id = ?
  `).get(syncId);

  if (!row) return null;

  return {
    ...normalizeMemoDraft(row),
    payload: normalizeMemoDraft(parseJson(row.payloadJson, {})),
  };
}

async function saveLocalMemo(db, input) {
  const timestamp = nowIso();
  const normalizedInput = normalizeMemoDraft(input);
  const payload = normalizeMemoInput(normalizedInput);

  if (normalizedInput.id) {
    const existing = await getLocalMemo(db, normalizedInput.id);

    if (!existing) {
      throw new Error("Local memo draft not found.");
    }

    if (existing.isLocked) {
      throw new Error("Locked or archived memos cannot be edited.");
    }

    const nextVersion = existing.version + 1;

    await db.prepare(`
      UPDATE local_memos SET
        reference_no = @reference_no,
        heading = @heading,
        description = @description,
        category = @category,
        branch_dru = @branch_dru,
        beneficiary_name = @beneficiary_name,
        movement_type = @movement_type,
        state = @state,
        location = @location,
        geopolitical_zone = @geopolitical_zone,
        amount = @amount,
        currency = @currency,
        payload_json = @payload_json,
        version = @version,
        sync_status = CASE
          WHEN sync_status IN ('SYNCED', 'FAILED') THEN 'PENDING_SYNC'
          ELSE sync_status
        END,
        last_modified_at = @last_modified_at,
        updated_at = @updated_at
      WHERE id = @id
    `).run({
      id: normalizedInput.id,
      ...payload,
      version: nextVersion,
      last_modified_at: timestamp,
      updated_at: timestamp,
    });

    const memo = await getLocalMemo(db, normalizedInput.id);

    if (memo.syncStatus === "PENDING_SYNC") {
      await upsertQueueItem(db, memo);
    }

    return memo;
  }

  const syncId = randomUUID();

  const result = await db.prepare(`
    INSERT INTO local_memos (
      sync_id,
      server_id,
      reference_no,
      heading,
      description,
      category,
      branch_dru,
      beneficiary_name,
      movement_type,
      state,
      location,
      geopolitical_zone,
      amount,
      currency,
      payload_json,
      version,
      sync_status,
      last_modified_at,
      created_at,
      updated_at
    )
    VALUES (
      @sync_id,
      NULL,
      @reference_no,
      @heading,
      @description,
      @category,
      @branch_dru,
      @beneficiary_name,
      @movement_type,
      @state,
      @location,
      @geopolitical_zone,
      @amount,
      @currency,
      @payload_json,
      1,
      'LOCAL_DRAFT',
      @last_modified_at,
      @created_at,
      @updated_at
    )
  `).run({
    sync_id: syncId,
    ...payload,
    last_modified_at: timestamp,
    created_at: timestamp,
    updated_at: timestamp,
  });

  return getLocalMemo(db, result.lastInsertRowid);
}

async function queueLocalMemo(db, id) {
  const memo = await getLocalMemo(db, id);

  if (!memo) {
    throw new Error("Local memo draft not found.");
  }

  const timestamp = nowIso();

  await db.prepare(`
    UPDATE local_memos SET
      sync_status = 'PENDING_SYNC',
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id,
    updated_at: timestamp,
  });

  const queuedMemo = await getLocalMemo(db, id);
  await upsertQueueItem(db, queuedMemo);

  return queuedMemo;
}

async function upsertQueueItem(db, memo) {
  const timestamp = nowIso();
  const operationType = memo.serverId ? "UPDATE" : "CREATE";
  const payload = JSON.stringify(buildMemoPayload(memo));
  const existing = await db.prepare(`
    SELECT id
    FROM sync_queue
    WHERE sync_id = ?
      AND sync_status IN ('PENDING', 'FAILED')
    ORDER BY id DESC
    LIMIT 1
  `).get(memo.syncId);

  if (existing) {
    await db.prepare(`
      UPDATE sync_queue SET
        entity_local_id = @entity_local_id,
        entity_server_id = @entity_server_id,
        operation_type = @operation_type,
        payload_json = @payload_json,
        sync_status = 'PENDING',
        retry_count = 0,
        requires_manual_retry = 0,
        last_error = NULL,
        updated_at = @updated_at
      WHERE id = @id
    `).run({
      id: existing.id,
      entity_local_id: memo.id,
      entity_server_id: memo.serverId,
      operation_type: operationType,
      payload_json: payload,
      updated_at: timestamp,
    });

    return;
  }

  await db.prepare(`
    INSERT INTO sync_queue (
      sync_id,
      entity_type,
      entity_local_id,
      entity_server_id,
      operation_type,
      payload_json,
      sync_status,
      retry_count,
      requires_manual_retry,
      created_at,
      updated_at
    )
    VALUES (
      @sync_id,
      'MEMO',
      @entity_local_id,
      @entity_server_id,
      @operation_type,
      @payload_json,
      'PENDING',
      0,
      0,
      @created_at,
      @updated_at
    )
  `).run({
    sync_id: memo.syncId,
    entity_local_id: memo.id,
    entity_server_id: memo.serverId,
    operation_type: operationType,
    payload_json: payload,
    created_at: timestamp,
    updated_at: timestamp,
  });
}

async function getPendingQueueSummary(db) {
  const counts = await db.prepare(`
    SELECT sync_status AS syncStatus, COUNT(*) AS count
    FROM sync_queue
    GROUP BY sync_status
  `).all();

  const pending = await db.prepare(`
    SELECT
      id,
      sync_id AS syncId,
      entity_type AS entityType,
      entity_local_id AS entityLocalId,
      entity_server_id AS entityServerId,
      operation_type AS operationType,
      sync_status AS syncStatus,
      retry_count AS retryCount,
      requires_manual_retry AS requiresManualRetry,
      last_error AS lastError,
      created_at AS createdAt,
      updated_at AS updatedAt,
      synced_at AS syncedAt
    FROM sync_queue
    WHERE sync_status IN ('PENDING', 'FAILED', 'SYNCING', 'CONFLICT')
    ORDER BY created_at ASC
  `).all();

  return {
    counts,
    pendingCount: pending.filter((item) => item.syncStatus === "PENDING").length,
    pending,
    message: `Found ${pending.filter((item) => item.syncStatus === "PENDING").length} pending memo queue item${pending.filter((item) => item.syncStatus === "PENDING").length === 1 ? "" : "s"}.`,
  };
}

async function listMemoQueueItemsForSync(db) {
  const rows = await db.prepare(`
    SELECT
      id,
      sync_id AS syncId,
      entity_type AS entityType,
      entity_local_id AS entityLocalId,
      entity_server_id AS entityServerId,
      operation_type AS operationType,
      payload_json AS payloadJson,
      sync_status AS syncStatus,
      retry_count AS retryCount,
      requires_manual_retry AS requiresManualRetry,
      last_error AS lastError,
      created_at AS createdAt,
      updated_at AS updatedAt,
      synced_at AS syncedAt
    FROM sync_queue
    WHERE entity_type = 'MEMO'
      AND operation_type IN ('CREATE', 'UPDATE')
      AND sync_status IN ('PENDING', 'FAILED')
      AND retry_count < 5
      AND requires_manual_retry = 0
    ORDER BY created_at ASC
  `).all();

  return rows.filter(isQueueItemDue).map((item) => ({
    ...item,
    payload: parseJson(item.payloadJson, {}),
  }));
}

async function markQueueItemSyncing(db, item) {
  const timestamp = nowIso();

  await db.prepare(`
    UPDATE sync_queue SET
      sync_status = 'SYNCING',
      last_error = NULL,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.id,
    updated_at: timestamp,
  });

  await db.prepare(`
    UPDATE local_memos SET
      sync_status = 'SYNCING',
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.entityLocalId,
    updated_at: timestamp,
  });
}

async function markQueueItemSucceeded(db, item, serverMemo) {
  const timestamp = nowIso();
  const localMemo = await getLocalMemo(db, item.entityLocalId) || await getLocalMemoBySyncId(db, item.syncId);
  const serverId = extractServerId(serverMemo) ?? item.entityServerId ?? localMemo?.serverId ?? null;
  const syncId = extractSyncId(serverMemo) ?? item.syncId;
  const version = extractVersion(serverMemo) ?? localMemo?.version ?? item.payload?.version ?? 1;
  const lastModifiedAt = extractLastModifiedAt(serverMemo) ?? localMemo?.lastModifiedAt ?? item.payload?.last_modified_at ?? timestamp;
  const syncStatus = "SYNCED";
  const serverUpdatedAt = extractUpdatedAt(serverMemo) ?? timestamp;
  const mirroredMemo = mirrorMemoFromServer(localMemo, serverMemo);

  await db.prepare(`
    UPDATE local_memos SET
      server_id = @server_id,
      reference_no = @reference_no,
      heading = @heading,
      description = @description,
      category = @category,
      branch_dru = @branch_dru,
      beneficiary_name = @beneficiary_name,
      movement_type = @movement_type,
      state = @state,
      location = @location,
      geopolitical_zone = @geopolitical_zone,
      amount = @amount,
      currency = @currency,
      payload_json = @payload_json,
      version = @version,
      sync_status = @sync_status,
      is_locked = @is_locked,
      is_completed = @is_completed,
      last_modified_at = @last_modified_at,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: localMemo.id,
    server_id: serverId,
    reference_no: mirroredMemo.reference_no,
    heading: mirroredMemo.heading,
    description: mirroredMemo.description,
    category: mirroredMemo.category,
    branch_dru: mirroredMemo.branch_dru,
    beneficiary_name: mirroredMemo.beneficiary_name,
    movement_type: mirroredMemo.movement_type,
    state: mirroredMemo.state,
    location: mirroredMemo.location,
    geopolitical_zone: mirroredMemo.geopolitical_zone,
    amount: mirroredMemo.amount,
    currency: mirroredMemo.currency,
    payload_json: JSON.stringify(buildMemoPayload(mirroredMemo)),
    version,
    sync_status: syncStatus,
    is_locked: serverMemo?.is_locked ? 1 : 0,
    is_completed: serverMemo?.is_completed ? 1 : 0,
    last_modified_at: lastModifiedAt,
    updated_at: serverUpdatedAt,
  });

  await db.prepare(`
    UPDATE sync_queue SET
      entity_server_id = @entity_server_id,
      sync_status = 'SUCCESS',
      requires_manual_retry = 0,
      last_error = NULL,
      updated_at = @updated_at,
      synced_at = @synced_at
    WHERE id = @id
  `).run({
    id: item.id,
    entity_server_id: serverId,
    updated_at: timestamp,
    synced_at: timestamp,
  });

  await updateSettings(db, { lastSyncAt: timestamp });

  return {
    serverId,
    syncId,
    version,
    lastModifiedAt,
  };
}

async function markQueueItemFailed(db, item, message, retryable) {
  const timestamp = nowIso();
  const nextRetryCount = item.retryCount + 1;
  const maxRetryCount = item.operationType === "UPDATE" ? 2 : 5;
  const shouldRetry = retryable && nextRetryCount < maxRetryCount;
  const queueStatus = shouldRetry ? "PENDING" : "FAILED";
  const requiresManualRetry = item.operationType === "UPDATE" && !shouldRetry && nextRetryCount >= 2;

  await db.prepare(`
    UPDATE sync_queue SET
      sync_status = @sync_status,
      retry_count = @retry_count,
      requires_manual_retry = @requires_manual_retry,
      last_error = @last_error,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.id,
    sync_status: queueStatus,
    retry_count: nextRetryCount,
    requires_manual_retry: requiresManualRetry ? 1 : 0,
    last_error: message,
    updated_at: timestamp,
  });

  await db.prepare(`
    UPDATE local_memos SET
      sync_status = @sync_status,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.entityLocalId,
    sync_status: shouldRetry ? "PENDING_SYNC" : "FAILED",
    updated_at: timestamp,
  });

  return {
    retryCount: nextRetryCount,
    queueStatus,
    shouldRetry,
    requiresManualRetry,
  };
}

async function markQueueItemPending(db, item, message) {
  const timestamp = nowIso();

  await db.prepare(`
    UPDATE sync_queue SET
      sync_status = 'PENDING',
      requires_manual_retry = 0,
      last_error = @last_error,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.id,
    last_error: message,
    updated_at: timestamp,
  });

  await db.prepare(`
    UPDATE local_memos SET
      sync_status = 'PENDING_SYNC',
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.entityLocalId,
    updated_at: timestamp,
  });
}

async function markQueueItemConflict(db, item, message, remotePayload = null) {
  const timestamp = nowIso();
  const localMemo = await getLocalMemo(db, item.entityLocalId) || await getLocalMemoBySyncId(db, item.syncId);

  await db.prepare(`
    UPDATE sync_queue SET
      sync_status = 'CONFLICT',
      requires_manual_retry = 0,
      last_error = @last_error,
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.id,
    last_error: message,
    updated_at: timestamp,
  });

  await db.prepare(`
    UPDATE local_memos SET
      sync_status = 'CONFLICT',
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: item.entityLocalId,
    updated_at: timestamp,
  });

  await db.prepare(`
    INSERT INTO sync_conflicts (
      sync_id,
      entity_type,
      entity_local_id,
      entity_server_id,
      local_payload_json,
      remote_payload_json,
      conflict_status,
      created_at
    )
    VALUES (
      @sync_id,
      'MEMO',
      @entity_local_id,
      @entity_server_id,
      @local_payload_json,
      @remote_payload_json,
      'OPEN',
      @created_at
    )
  `).run({
    sync_id: item.syncId,
    entity_local_id: item.entityLocalId,
    entity_server_id: item.entityServerId,
    local_payload_json: localMemo?.payloadJson || item.payloadJson || "{}",
    remote_payload_json: remotePayload ? JSON.stringify(remotePayload) : null,
    created_at: timestamp,
  });
}

async function getDesktopInfo(db, app) {
  const localMemoCount = (await db.prepare("SELECT COUNT(*) AS count FROM local_memos").get()).count;
  const pendingQueueCount = (await db.prepare("SELECT COUNT(*) AS count FROM sync_queue WHERE sync_status = 'PENDING'").get()).count;

  return {
    localMemoCount,
    pendingQueueCount,
    backupExportStatus: "Local DB backup/export is available through the Electron folder picker.",
  };
}

async function logLocal(db, level, scope, message, metadata = null) {
  await db.prepare(`
    INSERT INTO local_logs (level, scope, message, metadata_json, created_at)
    VALUES (@level, @scope, @message, @metadata_json, @created_at)
  `).run({
    level,
    scope,
    message,
    metadata_json: metadata ? JSON.stringify(metadata) : null,
    created_at: nowIso(),
  });
}

function getRetryDelayMs(retryCount) {
  const delays = [0, 5000, 15000, 30000, 60000];
  return delays[Math.min(retryCount, delays.length - 1)] || 0;
}

function isQueueItemDue(item) {
  if (item.syncStatus === "PENDING" && item.retryCount === 0) {
    return true;
  }

  const delayMs = getRetryDelayMs(item.retryCount);
  const updatedAt = Date.parse(item.updatedAt || item.createdAt || "");

  if (!Number.isFinite(updatedAt)) {
    return true;
  }

  return Date.now() - updatedAt >= delayMs;
}

function normalizeMemoInput(input) {
  const memoDraft = normalizeMemoDraft(input);
  const heading = String(memoDraft.heading || "").trim();

  if (!heading) {
    throw new Error("Memo heading is required.");
  }

  const amount = memoDraft.amount === "" || memoDraft.amount === null || memoDraft.amount === undefined
    ? null
    : Number(memoDraft.amount);

  const memo = {
    reference_no: nullableText(memoDraft.reference_no),
    heading,
    description: nullableText(memoDraft.description),
    category: nullableText(memoDraft.category),
    branch_dru: nullableText(memoDraft.branch_dru),
    beneficiary_name: nullableText(memoDraft.beneficiary_name),
    movement_type: nullableText(memoDraft.movement_type),
    state: nullableText(memoDraft.state),
    location: nullableText(memoDraft.location),
    geopolitical_zone: nullableText(memoDraft.geopolitical_zone),
    amount: Number.isFinite(amount) ? amount : null,
    currency: nullableText(memoDraft.currency) || "NGN",
  };

  return {
    ...memo,
    payload_json: JSON.stringify(buildMemoPayload(memo)),
  };
}

function normalizeMemoDraft(input = {}) {
  return {
    ...input,
    reference_no: input.reference_no ?? input.reference ?? "",
    heading: input.heading ?? input.title ?? "",
    branch_dru: input.branch_dru ?? input.branchDru ?? "",
    beneficiary_name: input.beneficiary_name ?? input.beneficiaryName ?? "",
    movement_type: input.movement_type ?? input.movementType ?? "",
    state: input.state ?? "",
    location: input.location ?? "",
    geopolitical_zone: input.geopolitical_zone ?? input.geopoliticalZone ?? "",
  };
}

function nullableText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function buildMemoPayload(memo) {
  const normalizedMemo = normalizeMemoDraft(memo);

  return {
    reference_no: normalizedMemo.reference_no || null,
    heading: normalizedMemo.heading,
    description: normalizedMemo.description || null,
    category: normalizedMemo.category || null,
    branch_dru: normalizedMemo.branch_dru || null,
    beneficiary_name: normalizedMemo.beneficiary_name || null,
    movement_type: normalizedMemo.movement_type || null,
    state: normalizedMemo.state || null,
    location: normalizedMemo.location || null,
    geopolitical_zone: normalizedMemo.geopolitical_zone || null,
    amount: normalizedMemo.amount ?? null,
    currency: normalizedMemo.currency || "NGN",
    sync_id: normalizedMemo.syncId || normalizedMemo.sync_id || null,
    version: normalizedMemo.version ?? null,
    last_modified_at: normalizedMemo.lastModifiedAt || normalizedMemo.last_modified_at || null,
  };
}

function mirrorMemoFromServer(localMemo, serverMemo) {
  const normalizedLocalMemo = normalizeMemoDraft(localMemo);

  return {
    reference_no: serverMemo?.reference_no ?? normalizedLocalMemo.reference_no ?? null,
    heading: serverMemo?.heading ?? normalizedLocalMemo.heading,
    description: serverMemo?.description ?? normalizedLocalMemo.description ?? null,
    category: serverMemo?.category ?? normalizedLocalMemo.category ?? null,
    branch_dru: serverMemo?.branch_dru ?? normalizedLocalMemo.branch_dru ?? null,
    beneficiary_name: serverMemo?.beneficiary_name ?? normalizedLocalMemo.beneficiary_name ?? null,
    movement_type: serverMemo?.movement_type ?? normalizedLocalMemo.movement_type ?? null,
    state: serverMemo?.state ?? normalizedLocalMemo.state ?? null,
    location: serverMemo?.location ?? normalizedLocalMemo.location ?? null,
    geopolitical_zone: serverMemo?.geopolitical_zone ?? normalizedLocalMemo.geopolitical_zone ?? null,
    amount: serverMemo?.amount ?? normalizedLocalMemo.amount ?? null,
    currency: serverMemo?.currency ?? normalizedLocalMemo.currency ?? "NGN",
  };
}

function extractServerId(value) {
  return value?.id ?? value?.memo_id ?? value?.memoId ?? value?.server_id ?? value?.serverId ?? null;
}

function extractSyncId(value) {
  return value?.sync_id ?? value?.syncId ?? null;
}

function extractVersion(value) {
  const version = value?.version ?? value?.local_version ?? value?.localVersion;
  const numberValue = Number(version);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function extractLastModifiedAt(value) {
  return value?.last_modified_at ?? value?.lastModifiedAt ?? null;
}

function extractUpdatedAt(value) {
  return value?.updated_at ?? value?.updatedAt ?? null;
}

function extractSyncStatus(value) {
  const status = value?.sync_status ?? value?.syncStatus;
  const allowed = ["LOCAL_DRAFT", "PENDING_SYNC", "SYNCING", "SYNCED", "FAILED", "CONFLICT"];

  return allowed.includes(status) ? status : null;
}

module.exports = {
  clearAuthSession,
  extractLastModifiedAt,
  extractServerId,
  extractSyncId,
  extractSyncStatus,
  extractUpdatedAt,
  extractVersion,
  getAuthSession,
  getAuthState,
  getDesktopInfo,
  getLocalMemo,
  getPendingQueueSummary,
  getSettings,
  listMemoQueueItemsForSync,
  listLocalMemos,
  logLocal,
  markQueueItemConflict,
  markQueueItemFailed,
  markQueueItemPending,
  markQueueItemSucceeded,
  markQueueItemSyncing,
  queueLocalMemo,
  saveAuthSession,
  saveLocalMemo,
  updateSettings,
  validateApiBaseUrl,
};
