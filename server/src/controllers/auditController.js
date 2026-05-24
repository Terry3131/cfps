const pool = require("../config/db");
const { successResponse } = require("../utils/responses");

const getAuditLogsHandler = async (req, res, next) => {
  try {
    const { action, entity_type, user_id } = req.query;

    let query = `
      SELECT
        a.*,
        u.full_name AS user_name,
        u.username
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const values = [];
    let index = 1;

    if (action) {
      query += ` AND a.action = $${index++}`;
      values.push(action);
    }

    if (entity_type) {
      query += ` AND a.entity_type = $${index++}`;
      values.push(entity_type);
    }

    if (user_id) {
      query += ` AND a.user_id = $${index++}`;
      values.push(user_id);
    }

    query += ` ORDER BY a.created_at DESC`;

    const result = await pool.query(query, values);

    return successResponse(res, "Audit logs fetched successfully", result.rows);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogsHandler
};