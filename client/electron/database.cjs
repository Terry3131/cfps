const path = require("path");
const fs = require("fs");
const sqlite = require("sqlite-electron");

const DEFAULT_SETTINGS = {
  apiBaseUrl: "https://cfps-backend.onrender.com",
  deviceName: "CFPS Desktop",
  syncIntervalMinutes: 15,
  autoSyncEnabled: false,
  rememberSession: true,
  lastSyncAt: null,
};

let db;

function nowIso() {
  return new Date().toISOString();
}

async function getDb(dbPathOrApp) {
  if (db) return db;

  const dbPath = getDatabasePath(dbPathOrApp);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  db = new SqliteElectronDatabase(dbPath);
  await db.open();
  await db.pragma("journal_mode = WAL");
  await db.pragma("foreign_keys = ON");
  await db.exec(schemaSql);
  await migrateLocalMemoSnakeCase(db);
  await migrateLocalMemoGeoFields(db);
  await migrateLocalMemoMovementType(db);
  await migrateSyncQueuePayloadSnakeCase(db);
  await migrateLocalMemoSyncStatus(db);
  await migrateManualRetryFlag(db);
  await migrateLocalMemoLifecycleFlags(db);
  await recoverInterruptedSync(db);
  await seedSettings(db);

  return db;
}

class SqliteElectronDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.queue = Promise.resolve();
  }

  async open() {
    return this.enqueue(() => sqlite.setdbPath(this.dbPath));
  }

  prepare(sql) {
    return {
      all: (params = {}) => this.all(sql, params),
      get: (params = {}) => this.get(sql, params),
      run: (params = {}) => this.run(sql, params),
    };
  }

  async all(sql, params = {}) {
    return this.enqueue(() => sqlite.fetchAll(sql, normalizeParams(params))).catch((err) => {
      throw enrichSqlError(err, sql);
    });
  }

  async get(sql, params = {}) {
    const rows = await this.enqueue(() => sqlite.fetchAll(sql, normalizeParams(params))).catch((err) => {
      throw enrichSqlError(err, sql);
    });
    return rows[0];
  }

  async run(sql, params = {}) {
    await this.enqueue(() => sqlite.executeQuery(sql, normalizeParams(params))).catch((err) => {
      throw enrichSqlError(err, sql);
    });
    const command = sql.trim().split(/\s+/)[0]?.toUpperCase();

    if (command === "INSERT") {
      const row = await this.get("SELECT last_insert_rowid() AS lastInsertRowid");
      return { lastInsertRowid: row?.lastInsertRowid };
    }

    return { changes: 0 };
  }

  async exec(sql) {
    return this.enqueue(() => sqlite.executeScript(sql)).catch((err) => {
      throw enrichSqlError(err, sql);
    });
  }

  async pragma(sql, options = {}) {
    const normalized = sql.trim().replace(/^PRAGMA\s+/i, "");
    const query = `PRAGMA ${normalized}`;

    if (normalized.includes("=")) {
      await this.run(query);
      return true;
    }

    const rows = await this.all(query);

    if (options.simple) {
      const first = rows[0] || {};
      return first[Object.keys(first)[0]];
    }

    return rows;
  }

  async backup(targetPath) {
    return this.enqueue(() => sqlite.backup(targetPath));
  }

  async close() {
    return true;
  }

  enqueue(task) {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => {});
    return next;
  }
}

function normalizeParams(params) {
  if (!params || Array.isArray(params)) {
    return params || [];
  }

  if (typeof params !== "object") {
    return [params];
  }

  return params;
}

function enrichSqlError(err, sql) {
  const message = err?.message || String(err);
  const compactSql = sql.trim().replace(/\s+/g, " ").slice(0, 180);
  return new Error(`${message} SQL: ${compactSql}`);
}

async function migrateLocalMemoSyncStatus(database) {
  const table = await database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'local_memos'")
    .get();

  if (!table?.sql || table.sql.includes("'SYNCING'")) {
    return;
  }

  await database.exec(`
    PRAGMA foreign_keys = OFF;

    CREATE TABLE local_memos_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_id TEXT NOT NULL UNIQUE,
      server_id TEXT,
      reference_no TEXT,
      heading TEXT NOT NULL,
      description TEXT,
      category TEXT,
      branch_dru TEXT,
      beneficiary_name TEXT,
      movement_type TEXT,
      state TEXT,
      location TEXT,
      geopolitical_zone TEXT,
      amount REAL,
      currency TEXT DEFAULT 'NGN',
      payload_json TEXT NOT NULL DEFAULT '{}',
      version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
      sync_status TEXT NOT NULL DEFAULT 'LOCAL_DRAFT'
        CHECK (sync_status IN ('LOCAL_DRAFT', 'PENDING_SYNC', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
      last_modified_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    INSERT INTO local_memos_new (
      id,
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
    SELECT
      id,
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
    FROM local_memos;

    DROP TABLE local_memos;
    ALTER TABLE local_memos_new RENAME TO local_memos;

    CREATE INDEX IF NOT EXISTS idx_local_memos_sync_status
      ON local_memos(sync_status);

    PRAGMA foreign_keys = ON;
  `);
}

async function migrateLocalMemoSnakeCase(database) {
  const table = await database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'local_memos'")
    .get();

  if (!table?.sql) {
    return;
  }

  const columns = await database.prepare("PRAGMA table_info(local_memos)").all();
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("reference_no")) {
    await database.exec("ALTER TABLE local_memos ADD COLUMN reference_no TEXT;");
    columnNames.add("reference_no");
  }

  if (!columnNames.has("heading")) {
    await database.exec("ALTER TABLE local_memos ADD COLUMN heading TEXT;");
    columnNames.add("heading");
  }

  if (!columnNames.has("branch_dru")) {
    await database.exec("ALTER TABLE local_memos ADD COLUMN branch_dru TEXT;");
    columnNames.add("branch_dru");
  }

  if (!columnNames.has("beneficiary_name")) {
    await database.exec("ALTER TABLE local_memos ADD COLUMN beneficiary_name TEXT;");
    columnNames.add("beneficiary_name");
  }

  if (columnNames.has("reference")) {
    await database.exec(`
      UPDATE local_memos
      SET reference_no = COALESCE(reference_no, reference);
    `);
  }

  if (columnNames.has("title")) {
    await database.exec(`
      UPDATE local_memos
      SET heading = COALESCE(heading, title);
    `);
  }

  if (columnNames.has("branchDru")) {
    await database.exec(`
      UPDATE local_memos
      SET branch_dru = COALESCE(branch_dru, branchDru);
    `);
  }

  if (columnNames.has("beneficiaryName")) {
    await database.exec(`
      UPDATE local_memos
      SET beneficiary_name = COALESCE(beneficiary_name, beneficiaryName);
    `);
  }

  await database.exec(`
    UPDATE local_memos
    SET
      payload_json = json_remove(json_set(
        COALESCE(NULLIF(payload_json, ''), '{}'),
        '$.reference_no',
        COALESCE(reference_no, json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.reference')),
        '$.heading',
        COALESCE(heading, json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.title')),
        '$.branch_dru',
        COALESCE(branch_dru, json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.branchDru')),
        '$.beneficiary_name',
        COALESCE(beneficiary_name, json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.beneficiaryName'))
      ), '$.reference', '$.title', '$.branchDru', '$.beneficiaryName')
    WHERE json_valid(COALESCE(NULLIF(payload_json, ''), '{}'));
  `);
}

async function migrateLocalMemoGeoFields(database) {
  const table = await database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'local_memos'")
    .get();

  if (!table?.sql) {
    return;
  }

  const columns = await database.prepare("PRAGMA table_info(local_memos)").all();
  const columnNames = new Set(columns.map((column) => column.name));

  for (const column of ["state", "location", "geopolitical_zone"]) {
    if (!columnNames.has(column)) {
      await database.exec(`ALTER TABLE local_memos ADD COLUMN ${column} TEXT;`);
      columnNames.add(column);
    }
  }

  await database.exec(`
    UPDATE local_memos
    SET
      payload_json = json_set(
        COALESCE(NULLIF(payload_json, ''), '{}'),
        '$.state',
        COALESCE(state, json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.state')),
        '$.location',
        COALESCE(location, json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.location')),
        '$.geopolitical_zone',
        COALESCE(geopolitical_zone, json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.geopolitical_zone'))
      )
    WHERE json_valid(COALESCE(NULLIF(payload_json, ''), '{}'));
  `);
}

async function migrateLocalMemoMovementType(database) {
  const table = await database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'local_memos'")
    .get();

  if (!table?.sql) return;

  const columns = await database.prepare("PRAGMA table_info(local_memos)").all();
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("movement_type")) {
    await database.exec("ALTER TABLE local_memos ADD COLUMN movement_type TEXT;");
  }
}

async function migrateSyncQueuePayloadSnakeCase(database) {
  const table = await database
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'sync_queue'")
    .get();

  if (!table?.sql) {
    return;
  }

  await database.exec(`
    UPDATE sync_queue
    SET
      payload_json = json_remove(json_set(
        COALESCE(NULLIF(payload_json, ''), '{}'),
        '$.reference_no',
        COALESCE(
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.reference_no'),
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.reference')
        ),
        '$.heading',
        COALESCE(
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.heading'),
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.title')
        ),
        '$.branch_dru',
        COALESCE(
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.branch_dru'),
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.branchDru')
        ),
        '$.beneficiary_name',
        COALESCE(
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.beneficiary_name'),
          json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.beneficiaryName')
        ),
        '$.state',
        json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.state'),
        '$.location',
        json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.location'),
        '$.geopolitical_zone',
        json_extract(COALESCE(NULLIF(payload_json, ''), '{}'), '$.geopolitical_zone')
      ), '$.reference', '$.title', '$.branchDru', '$.beneficiaryName')
    WHERE entity_type = 'MEMO'
      AND json_valid(COALESCE(NULLIF(payload_json, ''), '{}'));
  `);
}

async function recoverInterruptedSync(database) {
  const timestamp = nowIso();

  await database.prepare(`
    UPDATE sync_queue
    SET
      sync_status = 'PENDING',
      last_error = COALESCE(last_error, 'Recovered interrupted sync after app restart.'),
      updated_at = @updated_at
    WHERE sync_status = 'SYNCING'
  `).run({
    updated_at: timestamp,
  });

  await database.prepare(`
    UPDATE local_memos
    SET
      sync_status = 'PENDING_SYNC',
      updated_at = @updated_at
    WHERE sync_status = 'SYNCING'
  `).run({
    updated_at: timestamp,
  });
}

async function migrateManualRetryFlag(database) {
  const columns = await database.prepare("PRAGMA table_info(sync_queue)").all();
  const hasManualRetry = columns.some((column) => column.name === "requires_manual_retry");

  if (!hasManualRetry) {
    await database.exec(`
      ALTER TABLE sync_queue
      ADD COLUMN requires_manual_retry INTEGER NOT NULL DEFAULT 0 CHECK (requires_manual_retry IN (0, 1));
    `);
  }
}

async function migrateLocalMemoLifecycleFlags(database) {
  const columns = await database.prepare("PRAGMA table_info(local_memos)").all();

  const hasLocked = columns.some((column) => column.name === "is_locked");
  const hasCompleted = columns.some((column) => column.name === "is_completed");

  if (!hasLocked) {
    await database.exec(`
      ALTER TABLE local_memos
      ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1));
    `);
  }

  if (!hasCompleted) {
    await database.exec(`
      ALTER TABLE local_memos
      ADD COLUMN is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1));
    `);
  }
}

function getDatabasePath(dbPathOrApp) {
  if (typeof dbPathOrApp === "string") {
    return dbPathOrApp;
  }

  return path.join(dbPathOrApp.getPath("userData"), "cfps-desktop.db");
}

async function seedSettings(database) {
  const insert = database.prepare(`
    INSERT OR IGNORE INTO settings (key, value_json, updated_at)
    VALUES (@key, @value_json, @updated_at)
  `);

  const timestamp = nowIso();

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await insert.run({
      key,
      value_json: JSON.stringify(value),
      updated_at: timestamp,
    });
  }
}

const schemaSql = `
CREATE TABLE IF NOT EXISTS local_memos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_id TEXT NOT NULL UNIQUE,
  server_id TEXT,
  reference_no TEXT,
  heading TEXT NOT NULL,
  description TEXT,
  category TEXT,
  branch_dru TEXT,
      beneficiary_name TEXT,
      movement_type TEXT,
      state TEXT,
      location TEXT,
      geopolitical_zone TEXT,
      amount REAL,
  currency TEXT DEFAULT 'NGN',
  payload_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  sync_status TEXT NOT NULL DEFAULT 'LOCAL_DRAFT'
    CHECK (sync_status IN ('LOCAL_DRAFT', 'PENDING_SYNC', 'SYNCING', 'SYNCED', 'FAILED', 'CONFLICT')),
  is_locked INTEGER NOT NULL DEFAULT 0 CHECK (is_locked IN (0, 1)),
  is_completed INTEGER NOT NULL DEFAULT 0 CHECK (is_completed IN (0, 1)),
  last_modified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_local_memos_sync_status
  ON local_memos(sync_status);

CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('MEMO')),
  entity_local_id INTEGER,
  entity_server_id TEXT,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE')),
  payload_json TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (sync_status IN ('PENDING', 'SYNCING', 'SUCCESS', 'FAILED', 'CONFLICT')),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  requires_manual_retry INTEGER NOT NULL DEFAULT 0 CHECK (requires_manual_retry IN (0, 1)),
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  synced_at TEXT,
  FOREIGN KEY (entity_local_id) REFERENCES local_memos(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status
  ON sync_queue(sync_status);

CREATE TABLE IF NOT EXISTS auth_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  token TEXT,
  user_json TEXT,
  api_base_url TEXT,
  remember_session INTEGER NOT NULL DEFAULT 1 CHECK (remember_session IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('MEMO')),
  entity_local_id INTEGER,
  entity_server_id TEXT,
  local_payload_json TEXT NOT NULL,
  remote_payload_json TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (conflict_status IN ('OPEN', 'RESOLVED', 'IGNORED')),
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  FOREIGN KEY (entity_local_id) REFERENCES local_memos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS local_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR')),
  scope TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
`;

module.exports = {
  DEFAULT_SETTINGS,
  getDb,
  getDatabasePath,
  nowIso,
};
