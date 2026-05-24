const bcrypt = require("bcrypt");
const pool = require("../config/db");
const { successResponse, errorResponse } = require("../utils/responses");
const { logAudit } = require("../utils/audit");

const ALLOWED_ROLES = [
  "SUPER_ADMIN",
  "CAS",
  "AA_CAS",
  "PASO_CAS",
  "CAB",
  "REGISTRY",
  "CASH_OFFICE",
  "MONITOR",
  "VALIDATOR",
  "VIEWER",
];

async function createUserHandler(req, res, next) {
  try {
    const {
      full_name,
      username,
      password,
      role,
      branch_dru = null,
    } = req.body || {};

    if (!full_name || !username || !password || !role) {
      return errorResponse(res, "full_name, username, password, and role are required", 400);
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return errorResponse(res, "role is invalid", 400);
    }

    if (req.user.role !== "SUPER_ADMIN" && role === "SUPER_ADMIN") {
      return errorResponse(res, "Only SUPER_ADMIN can create SUPER_ADMIN users", 403);
    }

    if (branch_dru) {
      const unitResult = await pool.query(
        `SELECT id
         FROM organizational_units
         WHERE code = $1
           AND unit_type IN ('HQ_BRANCH', 'DIRECT_TO_CAS_OFFICE')
           AND is_active = TRUE
         LIMIT 1`,
        [branch_dru]
      );

      if (!unitResult.rows[0]) {
        return errorResponse(res, "branch_dru must be an active HQ branch or Direct-to-CAS office", 400);
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (full_name, username, password_hash, role, branch_dru, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING id, full_name, username, role, branch_dru, is_active`,
      [full_name, username, passwordHash, role, branch_dru]
    );

    await logAudit({
      userId: req.user.id,
      action: "CREATE_USER",
      entityType: "USER",
      entityId: result.rows[0].id,
      metadata: {
        username,
        role,
        branch_dru,
      },
    });

    return successResponse(res, "User created successfully", result.rows[0], 201);
  } catch (error) {
    if (error.code === "23505") {
      return errorResponse(res, "username already exists", 400);
    }

    next(error);
  }
}

module.exports = {
  createUserHandler,
};
