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

const ASSIGNABLE_ROLES_BY_MANAGER = {
  SUPER_ADMIN: ALLOWED_ROLES,
  CAS: ["CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"],
  AA_CAS: ["CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"],
  PASO_CAS: ["CAB", "REGISTRY", "CASH_OFFICE", "MONITOR", "VALIDATOR", "VIEWER"],
};

function getAssignableRoles(managerRole) {
  return ASSIGNABLE_ROLES_BY_MANAGER[managerRole] || [];
}

function canAssignRole(managerRole, targetRole) {
  return getAssignableRoles(managerRole).includes(targetRole);
}

function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value.toLowerCase() === "true";

  return Boolean(value);
}

async function validateBranchDru(branchDru) {
  if (!branchDru) return true;

  const unitResult = await pool.query(
    `SELECT id
     FROM organizational_units
     WHERE code = $1
       AND unit_type IN ('HQ_BRANCH', 'DIRECT_TO_CAS_OFFICE')
       AND is_active = TRUE
     LIMIT 1`,
    [branchDru]
  );

  return Boolean(unitResult.rows[0]);
}

async function listUsersHandler(req, res, next) {
  try {
    const assignableRoles = getAssignableRoles(req.user.role);

    if (assignableRoles.length === 0) {
      return errorResponse(res, "Forbidden: insufficient permissions", 403);
    }

    const result = await pool.query(
      `SELECT
         u.id,
         u.full_name,
         u.username,
         u.role,
         u.branch_dru,
         u.is_active,
         u.created_at,
         u.updated_at,
         ou.name AS branch_dru_name,
         ou.unit_type AS branch_dru_type
       FROM users u
       LEFT JOIN organizational_units ou ON ou.code = u.branch_dru
       WHERE u.role = ANY($1::text[])
       ORDER BY u.role, u.username`,
      [assignableRoles]
    );

    return successResponse(res, "Users fetched successfully", {
      users: result.rows,
      assignable_roles: assignableRoles,
    });
  } catch (error) {
    next(error);
  }
}

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

    if (!canAssignRole(req.user.role, role)) {
      return errorResponse(res, "You are not authorized to create this role", 403);
    }

    if (!(await validateBranchDru(branch_dru))) {
      return errorResponse(res, "branch_dru must be an active HQ branch or Direct-to-CAS office", 400);
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

async function updateUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    const {
      full_name,
      password,
      role,
      branch_dru,
      is_active,
    } = req.body || {};

    const existingResult = await pool.query(
      `SELECT id, full_name, username, role, branch_dru, is_active
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    const existing = existingResult.rows[0];

    if (!existing) {
      return errorResponse(res, "User not found", 404);
    }

    if (!canAssignRole(req.user.role, existing.role)) {
      return errorResponse(res, "You are not authorized to manage this user", 403);
    }

    const nextRole = role || existing.role;

    if (!ALLOWED_ROLES.includes(nextRole)) {
      return errorResponse(res, "role is invalid", 400);
    }

    if (!canAssignRole(req.user.role, nextRole)) {
      return errorResponse(res, "You are not authorized to assign this role", 403);
    }

    const hasBranchDru = Object.prototype.hasOwnProperty.call(req.body || {}, "branch_dru");
    const nextBranchDru = hasBranchDru ? (branch_dru || null) : existing.branch_dru;

    if (!(await validateBranchDru(nextBranchDru))) {
      return errorResponse(res, "branch_dru must be an active HQ branch or Direct-to-CAS office", 400);
    }

    const hasFullName = Object.prototype.hasOwnProperty.call(req.body || {}, "full_name");
    const nextFullName = hasFullName ? String(full_name || "").trim() : existing.full_name;

    if (!nextFullName) {
      return errorResponse(res, "full_name cannot be empty", 400);
    }

    const hasIsActive = Object.prototype.hasOwnProperty.call(req.body || {}, "is_active");
    const nextIsActive = hasIsActive ? parseBoolean(is_active) : existing.is_active;

    if (String(existing.id) === String(req.user.id) && (nextRole !== existing.role || nextIsActive === false)) {
      return errorResponse(res, "You cannot change your own role or deactivate your own account", 400);
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const result = await pool.query(
      `UPDATE users
       SET full_name = $1,
           role = $2,
           branch_dru = $3,
           is_active = $4,
           password_hash = COALESCE($5, password_hash),
           token_version = CASE
             WHEN role <> $2
               OR COALESCE(branch_dru, '') <> COALESCE($3, '')
               OR is_active <> $4
               OR $5 IS NOT NULL
             THEN token_version + 1
             ELSE token_version
           END,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, full_name, username, role, branch_dru, is_active, created_at, updated_at`,
      [nextFullName, nextRole, nextBranchDru, nextIsActive, passwordHash, id]
    );

    await logAudit({
      userId: req.user.id,
      action: "UPDATE_USER",
      entityType: "USER",
      entityId: result.rows[0].id,
      metadata: {
        username: existing.username,
        previous_role: existing.role,
        role: nextRole,
        branch_dru: nextBranchDru,
        is_active: nextIsActive,
        password_changed: Boolean(passwordHash),
      },
    });

    return successResponse(res, "User updated successfully", result.rows[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsersHandler,
  createUserHandler,
  updateUserHandler,
};
