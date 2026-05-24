const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/responses");
const { logAudit } = require("../utils/audit");

const SYSTEM_ROLES = ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"];

async function downloadBackupHandler(req, res, next) {
  try {
    const tables = await getPublicTables();
    const data = {};

    for (const table of tables) {
      const result = await pool.query(`SELECT * FROM ${quoteIdent(table)} ORDER BY 1`);
      data[table] = result.rows;
    }

    const payload = {
      version: 1,
      generated_at: new Date().toISOString(),
      generated_by: {
        id: req.user.id,
        username: req.user.username,
        role: req.user.role,
      },
      scope: {
        database: true,
        uploads: false,
      },
      tables: data,
    };

    await logAudit({
      userId: req.user.id,
      action: "SYSTEM_BACKUP_DOWNLOAD",
      entityType: "SYSTEM",
      entityId: null,
      metadata: {
        table_count: tables.length,
      },
    });

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="cfps-backup-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
}

async function restoreBackupHandler(req, res, next) {
  const backup = req.body;

  if (!backup || typeof backup !== "object" || !backup.tables || typeof backup.tables !== "object") {
    return errorResponse(res, "Invalid backup file.", 400);
  }

  const client = await pool.connect();

  try {
    const existingTables = await getPublicTables(client);
    const tableSet = new Set(existingTables);
    const requestedTables = Object.keys(backup.tables).filter((table) => tableSet.has(table));

    if (requestedTables.length === 0) {
      return errorResponse(res, "Backup file contains no restorable tables.", 400);
    }

    for (const table of requestedTables) {
      if (!Array.isArray(backup.tables[table])) {
        return errorResponse(res, `Backup table ${table} is invalid.`, 400);
      }
    }

    const insertOrder = await orderTablesForInsert(client, requestedTables);

    await client.query("BEGIN");
    await client.query(`TRUNCATE ${requestedTables.map(quoteIdent).join(", ")} RESTART IDENTITY CASCADE`);

    for (const table of insertOrder) {
      await insertRows(client, table, backup.tables[table]);
    }

    await client.query("COMMIT");

    await logAudit({
      userId: req.user.id,
      action: "SYSTEM_BACKUP_RESTORE",
      entityType: "SYSTEM",
      entityId: null,
      metadata: {
        table_count: requestedTables.length,
        source_generated_at: backup.generated_at || null,
      },
    });

    return successResponse(res, "Backup restored successfully", {
      restored_tables: requestedTables.length,
      uploads_restored: false,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
}

async function getPublicTables(client = pool) {
  const result = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );

  return result.rows.map((row) => row.table_name);
}

async function orderTablesForInsert(client, tableNames) {
  const tableSet = new Set(tableNames);
  const result = await client.query(
    `SELECT child.relname AS child_table, parent.relname AS parent_table
     FROM pg_constraint constraint_info
     JOIN pg_class child ON child.oid = constraint_info.conrelid
     JOIN pg_class parent ON parent.oid = constraint_info.confrelid
     JOIN pg_namespace namespace ON namespace.oid = child.relnamespace
     WHERE constraint_info.contype = 'f'
       AND namespace.nspname = 'public'`
  );

  const parentsByChild = new Map(tableNames.map((table) => [table, new Set()]));

  for (const row of result.rows) {
    if (tableSet.has(row.child_table) && tableSet.has(row.parent_table)) {
      parentsByChild.get(row.child_table).add(row.parent_table);
    }
  }

  const ordered = [];
  const remaining = new Set(tableNames);

  while (remaining.size > 0) {
    const ready = [...remaining].filter((table) => {
      const parents = parentsByChild.get(table) || new Set();
      return [...parents].every((parent) => !remaining.has(parent));
    });

    if (ready.length === 0) {
      return tableNames;
    }

    ready.sort();
    for (const table of ready) {
      ordered.push(table);
      remaining.delete(table);
    }
  }

  return ordered;
}

async function insertRows(client, table, rows) {
  if (!rows || rows.length === 0) return;

  const columns = Object.keys(rows[0]);

  if (columns.length === 0) return;

  const quotedColumns = columns.map(quoteIdent).join(", ");
  const chunkSize = 100;

  for (let offset = 0; offset < rows.length; offset += chunkSize) {
    const chunk = rows.slice(offset, offset + chunkSize);
    const values = [];
    const placeholders = chunk.map((row, rowIndex) => {
      const rowPlaceholders = columns.map((column, columnIndex) => {
        values.push(row[column] ?? null);
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${rowPlaceholders.join(", ")})`;
    });

    await client.query(
      `INSERT INTO ${quoteIdent(table)} (${quotedColumns}) VALUES ${placeholders.join(", ")}`,
      values
    );
  }
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

module.exports = {
  SYSTEM_ROLES,
  downloadBackupHandler,
  restoreBackupHandler,
};
