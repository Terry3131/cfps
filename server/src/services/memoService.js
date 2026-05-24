const pool = require("../config/db");
const { deriveWorkflowType } = require("../utils/workflowDoctrine");
const { getUserUnitCode } = require("../utils/validatorAccess");

const HEAVY_WORKFLOW_SQL_CATEGORIES = [
  "PROJECTS",
  "PROCUREMENT",
  "OPERATIONS",
  "MAINTENANCE",
  "CONTRACTS",
  "PROJECTS_AND_INFRASTRUCTURE",
  "PROJECT",
  "OPERATION",
  "CONTRACT",
  "WORKS",
];

function attachWorkflowType(memo) {
  if (!memo) return memo;

  return {
    ...memo,
    workflow_type: deriveWorkflowType(memo.category),
  };
}

function isValidUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function getSyncId(payload = {}) {
  const syncId = payload.sync_id || payload.syncId;
  return syncId && isValidUuid(syncId) ? syncId : null;
}

function getSyncConflictError(message) {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
}

function normalizeOrgSql(expression) {
  return `
    CASE
      WHEN UPPER(TRIM(COALESCE(${expression}, ''))) = 'DIRECT_TO_CAS' THEN 'DIRECT_TO_CAS_OFFICE'
      ELSE UPPER(TRIM(COALESCE(${expression}, '')))
    END
  `;
}

function appendUserVisibilityFilter({ query, values, index, user }) {
  if (!user || ["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "REGISTRY", "CAB", "CASH_OFFICE", "VIEWER"].includes(user.role)) {
    return { query, values, index };
  }

  const userBranch = getUserUnitCode(user);

  if (user.role === "MONITOR") {
    const userIdParam = index++;
    const userBranchParam = index++;

    query += `
      AND UPPER(TRIM(COALESCE(m.category, ''))) = ANY($${index++})
      AND COALESCE(m.is_locked, false) = false
      AND COALESCE(m.is_completed, false) = false
      AND (
        (a.assigned_to_user_id IS NOT NULL AND a.assigned_to_user_id::text = $${userIdParam})
        OR (${normalizeOrgSql("a.primary_monitor_branch")} = $${userBranchParam})
      )
    `;
    values.push(String(user.id || ""), userBranch, HEAVY_WORKFLOW_SQL_CATEGORIES);

    return { query, values, index };
  }

  if (user.role === "VALIDATOR") {
    const userIdParam = index++;
    const userBranchParam = index++;

    query += `
      AND UPPER(TRIM(COALESCE(m.category, ''))) = ANY($${index++})
      AND COALESCE(m.is_locked, false) = false
      AND COALESCE(m.is_completed, false) = false
      AND COALESCE(m.progress_percent, 0) >= 100
      AND UPPER(TRIM(COALESCE(m.lifecycle_stage, ''))) = 'AWAITING_VALIDATION'
      AND (
        (a.assigned_validator_user_id IS NOT NULL AND a.assigned_validator_user_id::text = $${userIdParam})
        OR (${normalizeOrgSql("a.validator_branch")} = $${userBranchParam})
      )
    `;
    values.push(String(user.id || ""), userBranch, HEAVY_WORKFLOW_SQL_CATEGORIES);

    return { query, values, index };
  }

  query += " AND 1=0";

  return { query, values, index };
}

async function assertUniqueDescription(description, excludeId = null) {
  const normalized = String(description || "").trim();

  if (!normalized) return;

  const values = [normalized];
  let query = `
    SELECT id
    FROM memos
    WHERE LOWER(TRIM(description)) = LOWER(TRIM($1))
  `;

  if (excludeId) {
    values.push(excludeId);
    query += ` AND id <> $2`;
  }

  query += " LIMIT 1";

  const existing = await pool.query(query, values);

  if (existing.rows[0]) {
    const error = new Error("description already exists");
    error.statusCode = 400;
    throw error;
  }
}

const createMemo = async (payload) => {
  const syncId = getSyncId(payload);
  await assertUniqueDescription(payload.description);

  if (syncId) {
    const existing = await pool.query(
      `SELECT * FROM memos WHERE sync_id = $1 LIMIT 1`,
      [syncId]
    );

    if (existing.rows[0]) {
      return attachWorkflowType(existing.rows[0]);
    }
  }

  const query = `
    INSERT INTO memos (
      reference_no,
      heading,
      description,
      category,
      branch_dru,
      beneficiary_name,
      amount,
      currency,
      state,
      location,
      geopolitical_zone,
      movement_type,
      created_by,
      business_status,
      sync_id,
      sync_status,
      last_modified_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, COALESCE($15::uuid, gen_random_uuid()), 'SYNCED', NOW())
    RETURNING *
  `;

  const values = [
    payload.reference_no,
    payload.heading,
    payload.description || null,
    payload.category,
    payload.branch_dru,
    payload.beneficiary_name || null,
    payload.amount ?? 0,
    payload.currency || "NGN",
    payload.state || null,
    payload.location || null,
    payload.geopolitical_zone || payload.geopoliticalZone || null,
    payload.movement_type || payload.movementType || null,
    payload.created_by,
    payload.business_status || "DRAFT",
    syncId
  ];

  const result = await pool.query(query, values);
  return attachWorkflowType(result.rows[0]);
};

const getAllMemos = async (filters = {}, user = null) => {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(100, Math.max(1, Number(filters.limit || 25)));
  const offset = (page - 1) * limit;
  const paginated = filters.page !== undefined || filters.limit !== undefined;
  const releaseStatusSql = `
    CASE
      WHEN lr.decision_type = 'REJECTED' OR m.business_status = 'FUND RELEASE REJECTED' THEN 'REJECTED'
      WHEN COALESCE(rel.total_released_amount, 0) >= COALESCE(m.amount, 0) AND COALESCE(m.amount, 0) > 0 THEN 'PAID'
      WHEN COALESCE(rel.total_released_amount, 0) > 0
        OR lr.decision_type = 'PARTIAL'
        OR UPPER(COALESCE(m.business_status, '')) IN ('PARTIALLY FUNDED', 'PARTIALLY_FUNDED')
        THEN 'PARTIALLY_FUNDED'
      WHEN lr.next_payment_date IS NOT NULL THEN 'WAITING_PAYMENT'
      WHEN m.approval_status = 'APPROVED' THEN 'AWAITING_FUND_RELEASE'
      ELSE 'NOT_READY'
    END
  `;
  let query = `
    SELECT
      m.*,
      u.full_name AS created_by_name,
      branch_unit.name AS branch_dru_name,
      a.primary_monitor_branch,
      primary_unit.name AS primary_monitor_branch_name,
      a.validator_branch,
      validator_unit.name AS validator_branch_name,
      a.assigned_to_user_id,
      a.assigned_validator_user_id,
      lp.progress_percent AS latest_progress_percent,
      lp.status_note AS latest_progress_note,
      lp.report_date AS latest_progress_date,
      (COALESCE(lp.report_date::date, lr.released_at::date) + INTERVAL '30 days')::date AS next_report_due_date,
      COALESCE(rel.total_released_amount, 0) AS total_released_amount,
      GREATEST(COALESCE(m.amount, 0) - COALESCE(rel.total_released_amount, 0), 0) AS remaining_balance,
      ${releaseStatusSql} AS fund_release_status,
      lr.decision_type AS latest_release_decision,
      lr.released_at AS latest_release_date,
      lr.next_release_date,
      lr.next_payment_date
    FROM memos m
    LEFT JOIN users u ON m.created_by = u.id
    LEFT JOIN organizational_units branch_unit ON branch_unit.code = m.branch_dru
    LEFT JOIN memo_assignments a ON a.memo_id = m.id
    LEFT JOIN organizational_units primary_unit ON primary_unit.code = a.primary_monitor_branch
    LEFT JOIN organizational_units validator_unit ON validator_unit.code = a.validator_branch
    LEFT JOIN (
      SELECT memo_id, COALESCE(SUM(released_amount), 0) AS total_released_amount
      FROM memo_releases
      WHERE decision_type != 'REJECTED'
      GROUP BY memo_id
    ) rel ON rel.memo_id = m.id
    LEFT JOIN LATERAL (
      SELECT decision_type, released_at, next_release_date, next_payment_date
      FROM memo_releases
      WHERE memo_id = m.id
      ORDER BY released_at DESC
      LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
      SELECT progress_percent, status_note, report_date
      FROM memo_progress_logs
      WHERE memo_id = m.id
      ORDER BY report_date DESC, created_at DESC
      LIMIT 1
    ) lp ON true
    WHERE 1=1
  `;

  const values = [];
  let index = 1;

  if (filters.category) {
    query += ` AND m.category = $${index++}`;
    values.push(filters.category);
  }

  if (filters.approval_status) {
    query += ` AND m.approval_status = $${index++}`;
    values.push(filters.approval_status);
  }

  if (filters.lifecycle_stage) {
    query += ` AND m.lifecycle_stage = $${index++}`;
    values.push(filters.lifecycle_stage);
  }

  if (filters.business_status) {
    query += ` AND m.business_status = $${index++}`;
    values.push(filters.business_status);
  }

  if (filters.workflow_type) {
    const workflowType = String(filters.workflow_type || "").trim().toUpperCase();

    if (workflowType === "HEAVY_WORKFLOW") {
      query += ` AND UPPER(TRIM(COALESCE(m.category, ''))) = ANY($${index++})`;
      values.push(HEAVY_WORKFLOW_SQL_CATEGORIES);
    } else if (workflowType === "LIGHT_WORKFLOW") {
      query += ` AND NOT (UPPER(TRIM(COALESCE(m.category, ''))) = ANY($${index++}))`;
      values.push(HEAVY_WORKFLOW_SQL_CATEGORIES);
    }
  }

  if (filters.fund_release_status && filters.fund_release_status !== "ALL") {
    query += ` AND ${releaseStatusSql} = $${index++}`;
    values.push(filters.fund_release_status);
  }

  const createdFrom = filters.created_from || filters.start_date || filters.created_at_from;
  const createdTo = filters.created_to || filters.end_date || filters.created_at_to;

  if (createdFrom) {
    query += ` AND m.created_at >= $${index++}`;
    values.push(`${String(createdFrom).slice(0, 10)}T00:00:00Z`);
  }

  if (createdTo) {
    query += ` AND m.created_at <= $${index++}`;
    values.push(`${String(createdTo).slice(0, 10)}T23:59:59Z`);
  }

  if (filters.branch_dru) {
    query += ` AND m.branch_dru = $${index++}`;
    values.push(filters.branch_dru);
  }

  if (filters.search) {
    query += ` AND (
      m.reference_no ILIKE $${index}
      OR m.heading ILIKE $${index}
      OR COALESCE(m.description, '') ILIKE $${index}
      OR COALESCE(m.beneficiary_name, '') ILIKE $${index}
      OR COALESCE(m.branch_dru, '') ILIKE $${index}
      OR COALESCE(m.category, '') ILIKE $${index}
      OR COALESCE(m.state, '') ILIKE $${index}
      OR COALESCE(m.location, '') ILIKE $${index}
      OR COALESCE(m.geopolitical_zone, '') ILIKE $${index}
    )`;
    values.push(`%${filters.search}%`);
    index++;
  }

  const visibility = appendUserVisibilityFilter({ query, values, index, user });
  query = visibility.query;
  index = visibility.index;

  const countQuery = `SELECT COUNT(*)::int AS total FROM (${query}) memo_count`;

  query += ` ORDER BY
    CASE
      WHEN ${releaseStatusSql} = 'AWAITING_FUND_RELEASE' THEN 1
      WHEN ${releaseStatusSql} = 'PARTIALLY_FUNDED' THEN 2
      WHEN ${releaseStatusSql} = 'WAITING_PAYMENT' THEN 3
      WHEN ${releaseStatusSql} = 'REJECTED' THEN 4
      WHEN ${releaseStatusSql} = 'PAID' THEN 5
      ELSE 6
    END,
    m.created_at DESC`;

  if (paginated) {
    query += ` LIMIT $${index++} OFFSET $${index++}`;
    values.push(limit, offset);
  }

  const [result, countResult] = await Promise.all([
    pool.query(query, values),
    paginated ? pool.query(countQuery, values.slice(0, values.length - 2)) : Promise.resolve({ rows: [{ total: 0 }] }),
  ]);

  const rows = result.rows.map(attachWorkflowType);

  if (!paginated) return rows;

  const total = countResult.rows[0]?.total || 0;

  return {
    items: rows,
    pagination: {
      page,
      limit,
      total,
      pageCount: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const updateMemoLifecycle = async (id, nextStatus) => {
  const status = String(nextStatus || "").toUpperCase();
  const memo = await getMemoById(id);

  if (!memo) return null;
  if (memo.is_locked || memo.is_completed) {
    const error = new Error("Locked or completed memo cannot be changed");
    error.statusCode = 400;
    throw error;
  }

  if (String(memo.business_status || "").toUpperCase() !== "DRAFT") {
    const error = new Error("Only draft memos can be moved to KIV or Approved");
    error.statusCode = 400;
    throw error;
  }

  if (!["KIV", "APPROVED"].includes(status)) {
    const error = new Error("status must be KIV or APPROVED");
    error.statusCode = 400;
    throw error;
  }

  const result = await pool.query(
    `UPDATE memos
     SET business_status = $1,
         approval_status = CASE WHEN $1 = 'APPROVED' THEN 'APPROVED' ELSE approval_status END,
         approved_at = CASE WHEN $1 = 'APPROVED' THEN NOW() ELSE approved_at END,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, id]
  );

  return attachWorkflowType(result.rows[0]);
};

const getMemoById = async (id) => {
  const query = `
    SELECT
      m.*,
      u.full_name AS created_by_name,
      branch_unit.name AS branch_dru_name,
      a.primary_monitor_branch,
      primary_unit.name AS primary_monitor_branch_name,
      a.validator_branch,
      validator_unit.name AS validator_branch_name,
      a.assigned_to_user_id,
      a.assigned_validator_user_id,
      lp.progress_percent AS latest_progress_percent,
      lp.status_note AS latest_progress_note,
      lp.report_date AS latest_progress_date,
      (COALESCE(lp.report_date::date, lr.released_at::date) + INTERVAL '30 days')::date AS next_report_due_date,
      COALESCE(rel.total_released_amount, 0) AS total_released_amount,
      GREATEST(COALESCE(m.amount, 0) - COALESCE(rel.total_released_amount, 0), 0) AS remaining_balance,
      CASE
        WHEN lr.decision_type = 'REJECTED' OR m.business_status = 'FUND RELEASE REJECTED' THEN 'REJECTED'
        WHEN COALESCE(rel.total_released_amount, 0) >= COALESCE(m.amount, 0) AND COALESCE(m.amount, 0) > 0 THEN 'PAID'
        WHEN COALESCE(rel.total_released_amount, 0) > 0
          OR lr.decision_type = 'PARTIAL'
          OR UPPER(COALESCE(m.business_status, '')) IN ('PARTIALLY FUNDED', 'PARTIALLY_FUNDED')
          THEN 'PARTIALLY_FUNDED'
        WHEN lr.next_payment_date IS NOT NULL THEN 'WAITING_PAYMENT'
        WHEN m.approval_status = 'APPROVED' THEN 'AWAITING_FUND_RELEASE'
        ELSE 'NOT_READY'
      END AS fund_release_status,
      lr.decision_type AS latest_release_decision,
      lr.released_at AS latest_release_date,
      lr.next_release_date,
      lr.next_payment_date,
      COALESCE(rh.release_history, '[]'::json) AS release_history
    FROM memos m
    LEFT JOIN users u ON m.created_by = u.id
    LEFT JOIN organizational_units branch_unit ON branch_unit.code = m.branch_dru
    LEFT JOIN memo_assignments a ON a.memo_id = m.id
    LEFT JOIN organizational_units primary_unit ON primary_unit.code = a.primary_monitor_branch
    LEFT JOIN organizational_units validator_unit ON validator_unit.code = a.validator_branch
    LEFT JOIN (
      SELECT memo_id, COALESCE(SUM(released_amount), 0) AS total_released_amount
      FROM memo_releases
      WHERE decision_type != 'REJECTED'
      GROUP BY memo_id
    ) rel ON rel.memo_id = m.id
    LEFT JOIN LATERAL (
      SELECT decision_type, released_at, next_release_date, next_payment_date
      FROM memo_releases
      WHERE memo_id = m.id
      ORDER BY released_at DESC
      LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
      SELECT progress_percent, status_note, report_date
      FROM memo_progress_logs
      WHERE memo_id = m.id
      ORDER BY report_date DESC, created_at DESC
      LIMIT 1
    ) lp ON true
    LEFT JOIN LATERAL (
      SELECT json_agg(row_to_json(history_row) ORDER BY history_row.released_at DESC) AS release_history
      FROM (
        SELECT
          r.id,
          r.memo_id,
          r.released_amount,
          r.decision_type,
          r.next_payment_date,
          r.next_release_date,
          r.remarks,
          r.rejection_reason,
          r.released_by,
          u.full_name AS released_by_name,
          r.created_at,
          r.released_at
        FROM memo_releases r
        LEFT JOIN users u ON u.id = r.released_by
        WHERE r.memo_id = m.id
        ORDER BY r.released_at DESC
      ) history_row
    ) rh ON true
    WHERE m.id = $1
    LIMIT 1
  `;

  const result = await pool.query(query, [id]);
  return attachWorkflowType(result.rows[0]);
};

const updateMemoById = async (id, payload) => {
  const existing = await getMemoById(id);

  if (!existing) {
    return null;
  }

  const syncId = getSyncId(payload);
  await assertUniqueDescription(payload.description, id);

  if (syncId && String(existing.sync_id) !== String(syncId)) {
    throw getSyncConflictError("Memo sync conflict: sync_id does not match server memo");
  }

  const clientVersion = Number(payload.version);

  if (Number.isFinite(clientVersion) && clientVersion <= Number(existing.version || 1)) {
    throw getSyncConflictError("Memo sync conflict: local version is not newer than server version");
  }

  const query = `
    UPDATE memos
    SET
      reference_no = $1,
      heading = $2,
      description = $3,
      category = $4,
      branch_dru = $5,
      beneficiary_name = $6,
      amount = $7,
      currency = $8,
      state = $9,
      location = $10,
      geopolitical_zone = $11,
      movement_type = $12,
      sync_status = 'SYNCED',
      version = version + 1,
      last_modified_at = NOW(),
      updated_at = NOW()
    WHERE id = $13
    RETURNING *
  `;

  const values = [
    payload.reference_no,
    payload.heading,
    payload.description || null,
    payload.category,
    payload.branch_dru,
    payload.beneficiary_name || null,
    payload.amount ?? 0,
    payload.currency || "NGN",
    payload.state || null,
    payload.location || null,
    payload.geopolitical_zone || payload.geopoliticalZone || null,
    payload.movement_type || payload.movementType || null,
    id
  ];

  const result = await pool.query(query, values);
  return attachWorkflowType(result.rows[0]);
};

module.exports = {
  createMemo,
  getAllMemos,
  getMemoById,
  updateMemoLifecycle,
  updateMemoById
};
