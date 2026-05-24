const pool = require("../config/db");

const logAudit = async ({ userId, action, entityType, entityId, metadata = {} }) => {
  const query = `
    INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
    VALUES ($1, $2, $3, $4, $5)
  `;

  await pool.query(query, [
    userId || null,
    action,
    entityType,
    entityId,
    JSON.stringify(metadata)
  ]);
};

module.exports = {
  logAudit
};
