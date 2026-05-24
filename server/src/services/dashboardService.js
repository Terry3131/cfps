const db = require("../config/db");
const { HEAVY_WORKFLOW_CATEGORIES } = require("../utils/workflowDoctrine");

const heavyCategoryList = HEAVY_WORKFLOW_CATEGORIES
  .map((category) => `'${category}'`)
  .join(", ");

function workflowTypeSql(column = "category") {
  return `CASE WHEN UPPER(${column}) IN (${heavyCategoryList}) THEN 'HEAVY_WORKFLOW' ELSE 'LIGHT_WORKFLOW' END`;
}

function createWorkflowTotals() {
  return {
    HEAVY_WORKFLOW: {
      total_memos: 0,
      approved_memos: 0,
      funds_released_memos: 0,
      in_progress_memos: 0,
      awaiting_validation_memos: 0,
      completed_memos: 0,
      total_amount: 0,
      total_released_amount: 0,
    },
    LIGHT_WORKFLOW: {
      total_memos: 0,
      approved_memos: 0,
      funds_released_memos: 0,
      in_progress_memos: 0,
      awaiting_validation_memos: 0,
      completed_memos: 0,
      total_amount: 0,
      total_released_amount: 0,
    },
  };
}

function toNumber(value) {
  return Number(value || 0);
}

async function getSummary() {
  const result = await db.query(`
    SELECT
      COUNT(*) AS total_memos,

      COUNT(*) FILTER (WHERE business_status = 'DRAFT') AS draft_memos,
      COUNT(*) FILTER (WHERE approval_status = 'APPROVED') AS approved_memos,
      COUNT(*) FILTER (WHERE business_status = 'PARTIALLY FUNDED') AS partially_funded_memos,
      COUNT(*) FILTER (WHERE business_status = 'FUNDS RELEASED') AS funds_released_memos,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'IN_PROGRESS') AS ongoing_memos,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'AWAITING_VALIDATION') AS awaiting_validation_memos,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'COMPLETED' OR is_completed = true) AS completed_memos,
      COUNT(*) FILTER (WHERE business_status = 'ARCHIVED') AS archived_memos,

      COALESCE(SUM(amount) FILTER (WHERE approval_status = 'APPROVED'), 0) AS total_approved_amount
    FROM memos
  `);

  const releaseResult = await db.query(`
    SELECT COALESCE(SUM(released_amount), 0) AS total_released_amount
    FROM memo_releases
    WHERE decision_type != 'REJECTED'
  `);

  const workflowResult = await db.query(`
    SELECT
      ${workflowTypeSql("category")} AS workflow_type,
      COUNT(*) AS total_memos,
      COUNT(*) FILTER (WHERE approval_status = 'APPROVED') AS approved_memos,
      COUNT(*) FILTER (WHERE business_status = 'FUNDS RELEASED') AS funds_released_memos,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'IN_PROGRESS') AS in_progress_memos,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'AWAITING_VALIDATION') AS awaiting_validation_memos,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'COMPLETED' OR is_completed = true) AS completed_memos,
      COALESCE(SUM(amount), 0) AS total_amount
    FROM memos
    GROUP BY workflow_type
  `);

  const workflowReleaseResult = await db.query(`
    SELECT
      ${workflowTypeSql("m.category")} AS workflow_type,
      COALESCE(SUM(r.released_amount), 0) AS total_released_amount
    FROM memo_releases r
    JOIN memos m ON m.id = r.memo_id
    WHERE r.decision_type != 'REJECTED'
    GROUP BY workflow_type
  `);

  const workflow_totals = createWorkflowTotals();

  workflowResult.rows.forEach((row) => {
    workflow_totals[row.workflow_type] = {
      ...workflow_totals[row.workflow_type],
      total_memos: toNumber(row.total_memos),
      approved_memos: toNumber(row.approved_memos),
      funds_released_memos: toNumber(row.funds_released_memos),
      in_progress_memos: toNumber(row.in_progress_memos),
      awaiting_validation_memos: toNumber(row.awaiting_validation_memos),
      completed_memos: toNumber(row.completed_memos),
      total_amount: toNumber(row.total_amount),
    };
  });

  workflowReleaseResult.rows.forEach((row) => {
    workflow_totals[row.workflow_type].total_released_amount = toNumber(row.total_released_amount);
  });

  return {
    ...result.rows[0],
    total_released_amount: releaseResult.rows[0].total_released_amount,
    combined_operational_administrative_totals: {
      ...result.rows[0],
      total_released_amount: releaseResult.rows[0].total_released_amount,
    },
    workflow_totals,
    heavy_workflow_memos: workflow_totals.HEAVY_WORKFLOW.total_memos,
    light_workflow_memos: workflow_totals.LIGHT_WORKFLOW.total_memos,
    heavy_funds_released: workflow_totals.HEAVY_WORKFLOW.total_released_amount,
    light_approval_volume: workflow_totals.LIGHT_WORKFLOW.approved_memos,
  };
}

async function getStatusBreakdown() {
  const businessStatus = await db.query(`
    SELECT ${workflowTypeSql("category")} AS workflow_type, business_status, COUNT(*) AS total
    FROM memos
    GROUP BY workflow_type, business_status
    ORDER BY workflow_type, business_status
  `);

  const lifecycleStage = await db.query(`
    SELECT ${workflowTypeSql("category")} AS workflow_type, lifecycle_stage, COUNT(*) AS total
    FROM memos
    GROUP BY workflow_type, lifecycle_stage
    ORDER BY workflow_type, lifecycle_stage
  `);

  const approvalStatus = await db.query(`
    SELECT ${workflowTypeSql("category")} AS workflow_type, approval_status, COUNT(*) AS total
    FROM memos
    GROUP BY workflow_type, approval_status
    ORDER BY workflow_type, approval_status
  `);

  return {
    business_status: businessStatus.rows,
    lifecycle_stage: lifecycleStage.rows,
    approval_status: approvalStatus.rows,
  };
}

async function getCategoryBreakdown() {
  const result = await db.query(`
    SELECT
      category,
      ${workflowTypeSql("category")} AS workflow_type,
      COUNT(*) AS total,
      COALESCE(SUM(amount), 0) AS total_amount,
      COUNT(*) FILTER (WHERE lifecycle_stage = 'COMPLETED' OR is_completed = true) AS completed_count,
      COUNT(*) FILTER (
        WHERE COALESCE(lifecycle_stage, '') NOT IN ('COMPLETED')
          AND COALESCE(is_completed, false) = false
          AND business_status != 'ARCHIVED'
      ) AS ongoing_count,
      COUNT(*) FILTER (WHERE business_status = 'ARCHIVED') AS archived_count
    FROM memos
    GROUP BY category, workflow_type
    ORDER BY workflow_type, category
  `);

  return result.rows;
}

async function getFundingSummary() {
  const memoResult = await db.query(`
    SELECT
      COALESCE(SUM(amount), 0) AS total_memo_amount
    FROM memos
  `);

  const releaseResult = await db.query(`
    SELECT
      COALESCE(SUM(released_amount) FILTER (WHERE decision_type != 'REJECTED'), 0) AS total_released_amount,
      COUNT(*) FILTER (WHERE decision_type = 'PARTIAL') AS partial_release_count,
      COUNT(*) FILTER (WHERE decision_type = 'FULL') AS full_release_count,
      COUNT(*) FILTER (WHERE decision_type = 'REJECTED') AS rejected_release_count
    FROM memo_releases
  `);

  const pendingResult = await db.query(`
    SELECT ${workflowTypeSql("category")} AS workflow_type, COUNT(*) AS pending_release_count
    FROM memos
    WHERE approval_status = 'APPROVED'
      AND business_status = 'APPROVED'
    GROUP BY workflow_type
  `);

  const workflowReleaseResult = await db.query(`
    SELECT
      ${workflowTypeSql("m.category")} AS workflow_type,
      COALESCE(SUM(r.released_amount) FILTER (WHERE r.decision_type != 'REJECTED'), 0) AS total_released_amount,
      COUNT(*) FILTER (WHERE r.decision_type = 'PARTIAL') AS partial_release_count,
      COUNT(*) FILTER (WHERE r.decision_type = 'FULL') AS full_release_count,
      COUNT(*) FILTER (WHERE r.decision_type = 'REJECTED') AS rejected_release_count
    FROM memo_releases r
    JOIN memos m ON m.id = r.memo_id
    GROUP BY workflow_type
  `);

  const workflow_funding = createWorkflowTotals();

  workflowReleaseResult.rows.forEach((row) => {
    workflow_funding[row.workflow_type] = {
      ...workflow_funding[row.workflow_type],
      total_released_amount: toNumber(row.total_released_amount),
      partial_release_count: toNumber(row.partial_release_count),
      full_release_count: toNumber(row.full_release_count),
      rejected_release_count: toNumber(row.rejected_release_count),
    };
  });

  pendingResult.rows.forEach((row) => {
    workflow_funding[row.workflow_type].pending_release_count = toNumber(row.pending_release_count);
  });

  return {
    total_memo_amount: memoResult.rows[0].total_memo_amount,
    total_released_amount: releaseResult.rows[0].total_released_amount,
    partial_release_count: releaseResult.rows[0].partial_release_count,
    full_release_count: releaseResult.rows[0].full_release_count,
    rejected_release_count: releaseResult.rows[0].rejected_release_count,
    pending_release_count: pendingResult.rows.reduce((sum, row) => sum + toNumber(row.pending_release_count), 0),
    workflow_funding,
  };
}

async function getRecentActivity() {
  const result = await db.query(`
    SELECT
      a.id,
      a.user_id,
      u.full_name AS user_name,
      a.action,
      a.entity_type,
      a.entity_id,
      m.reference_no,
      m.heading,
      ${workflowTypeSql("m.category")} AS workflow_type,
      a.metadata,
      a.created_at
    FROM audit_logs a
    LEFT JOIN users u ON a.user_id = u.id
    LEFT JOIN memos m ON a.entity_id = m.id
    ORDER BY a.created_at DESC
    LIMIT 20
  `);

  return result.rows;
}

async function getPendingActions() {
  const approvedNotReleased = await db.query(`
    SELECT id, reference_no, heading, ${workflowTypeSql("category")} AS workflow_type, 'APPROVED_NOT_RELEASED' AS type
    FROM memos
    WHERE approval_status = 'APPROVED'
      AND business_status = 'APPROVED'
  `);

  const partialPending = await db.query(`
    SELECT m.id, m.reference_no, m.heading, ${workflowTypeSql("m.category")} AS workflow_type, r.next_release_date, 'PARTIAL_PENDING_RELEASE' AS type
    FROM memos m
    JOIN memo_releases r ON m.id = r.memo_id
    WHERE r.decision_type = 'PARTIAL'
      AND r.next_release_date IS NOT NULL
  `);

  const awaitingValidation = await db.query(`
    SELECT id, reference_no, heading, ${workflowTypeSql("category")} AS workflow_type, 'AWAITING_VALIDATION' AS type
    FROM memos
    WHERE lifecycle_stage = 'AWAITING_VALIDATION'
      AND ${workflowTypeSql("category")} = 'HEAVY_WORKFLOW'
  `);

  const assignedNotCommenced = await db.query(`
    SELECT m.id, m.reference_no, m.heading, ${workflowTypeSql("m.category")} AS workflow_type, 'ASSIGNED_NOT_COMMENCED' AS type
    FROM memos m
    JOIN memo_assignments a ON m.id = a.memo_id
    WHERE m.lifecycle_stage = 'ASSIGNED'
      AND ${workflowTypeSql("m.category")} = 'HEAVY_WORKFLOW'
  `);

  return [
    ...approvedNotReleased.rows,
    ...partialPending.rows,
    ...awaitingValidation.rows,
    ...assignedNotCommenced.rows
  ];
}

module.exports = {
  getSummary,
  getStatusBreakdown,
  getCategoryBreakdown,
  getFundingSummary,
  getRecentActivity,
  getPendingActions
};

