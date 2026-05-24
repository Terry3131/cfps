const db = require("../config/db");
const {
  HEAVY_WORKFLOW_CATEGORIES,
  deriveWorkflowType,
} = require("../utils/workflowDoctrine");

const heavyCategoryList = HEAVY_WORKFLOW_CATEGORIES
  .map((category) => `'${category}'`)
  .join(", ");

function workflowTypeSql(column = "m.category") {
  return `CASE WHEN UPPER(${column}) IN (${heavyCategoryList}) THEN 'HEAVY_WORKFLOW' ELSE 'LIGHT_WORKFLOW' END`;
}

async function getMemoReports(filters = {}) {
  const conditions = [];
  const values = [];

  function addFilter(column, value) {
    if (!value) return;
    values.push(value);
    conditions.push(`${column} = $${values.length}`);
  }

  addFilter("m.category", filters.category);
  addFilter("m.branch_dru", filters.branch_dru);
  addFilter("m.business_status", filters.business_status);
  addFilter("m.approval_status", filters.approval_status);
  addFilter("m.lifecycle_stage", filters.lifecycle_stage);
  addFilter("m.currency", filters.currency);
  addFilter("a.primary_monitor_branch", filters.primary_monitor_branch);
  addFilter("a.validator_branch", filters.final_validator_branch);
  addFilter("lr.decision_type", filters.decision_type);
  addFilter("m.created_by", filters.created_by);

  if (filters.workflow_type) {
    values.push(String(filters.workflow_type).toUpperCase());
    conditions.push(`${workflowTypeSql("m.category")} = $${values.length}`);
  }

  if (filters.is_completed !== undefined) {
    values.push(filters.is_completed === "true");
    conditions.push(`m.is_completed = $${values.length}`);
  }

  if (filters.is_locked !== undefined) {
    values.push(filters.is_locked === "true");
    conditions.push(`m.is_locked = $${values.length}`);
  }

  if (filters.start_date) {
    values.push(filters.start_date);
    conditions.push(`m.created_at >= $${values.length}`);
  }

  if (filters.end_date) {
    values.push(filters.end_date);
    conditions.push(`m.created_at <= $${values.length}`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      m.id,
      m.reference_no,
      m.heading,
      m.category,
      ${workflowTypeSql("m.category")} AS workflow_type,
      m.branch_dru,
      branch_unit.name AS branch_dru_name,
      m.beneficiary_name,
      m.state,
      m.location,
      m.geopolitical_zone,
      m.amount,
      m.currency,
      m.approval_status,
      m.business_status,
      m.lifecycle_stage,
      m.progress_percent,
      a.primary_monitor_branch,
      primary_unit.name AS primary_monitor_branch_name,
      a.validator_branch AS final_validator_branch,
      validator_unit.name AS final_validator_branch_name,
      COALESCE(rel.total_released_amount, 0) AS total_released_amount,
      lr.decision_type AS latest_release_decision,
      lr.next_release_date,
      lr.next_payment_date,
      c.commencement_date,
      lp.status_note AS latest_progress_note,
      lp.report_date AS latest_progress_date,
      v.is_valid AS validation_status,
      v.validated_by,
      COALESCE(att.attachment_count, 0) AS attachment_count,
      u.full_name AS created_by_name,
      m.created_at,
      m.updated_at
    FROM memos m
    LEFT JOIN users u ON m.created_by = u.id
    LEFT JOIN memo_assignments a ON a.memo_id = m.id
    LEFT JOIN organizational_units branch_unit ON branch_unit.code = m.branch_dru
    LEFT JOIN organizational_units primary_unit ON primary_unit.code = a.primary_monitor_branch
    LEFT JOIN organizational_units validator_unit ON validator_unit.code = a.validator_branch
    LEFT JOIN (
      SELECT memo_id, COALESCE(SUM(released_amount), 0) AS total_released_amount
      FROM memo_releases
      WHERE decision_type != 'REJECTED'
      GROUP BY memo_id
    ) rel ON rel.memo_id = m.id
    LEFT JOIN LATERAL (
      SELECT decision_type, next_release_date, next_payment_date
      FROM memo_releases
      WHERE memo_id = m.id
      ORDER BY released_at DESC
      LIMIT 1
    ) lr ON true
    LEFT JOIN LATERAL (
      SELECT commencement_date
      FROM memo_commencements
      WHERE memo_id = m.id
      ORDER BY recorded_at DESC
      LIMIT 1
    ) c ON true
    LEFT JOIN LATERAL (
      SELECT status_note, report_date
      FROM memo_progress_logs
      WHERE memo_id = m.id
      ORDER BY created_at DESC
      LIMIT 1
    ) lp ON true
    LEFT JOIN LATERAL (
      SELECT is_valid, validated_by
      FROM memo_validations
      WHERE memo_id = m.id
      ORDER BY validated_at DESC
      LIMIT 1
    ) v ON true
    LEFT JOIN (
      SELECT memo_id, COUNT(*) AS attachment_count
      FROM memo_attachments
      GROUP BY memo_id
    ) att ON att.memo_id = m.id
    ${whereClause}
    ORDER BY m.created_at DESC
  `;

  const result = await db.query(query, values);
  return result.rows.map((row) => ({
    ...row,
    workflow_type: deriveWorkflowType(row.category),
  }));
}

module.exports = {
  getMemoReports,
};
