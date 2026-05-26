const { verifyToken } = require("../utils/jwt");
const { errorResponse } = require("../utils/responses");
const pool = require("../config/db");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Access denied. No token provided", 401);
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    const result = await pool.query(
      `SELECT role, branch_dru, is_active, token_version
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user?.is_active) {
      return errorResponse(res, "User account is inactive", 403);
    }

    if (Number(decoded.token_version) !== Number(user.token_version || 0)) {
      return errorResponse(res, "Invalid or expired token", 401);
    }

    req.user = {
      ...decoded,
      role: user.role,
      branch_dru: user.branch_dru,
    };
    next();
  } catch (error) {
    return errorResponse(res, "Invalid or expired token", 401);
  }
};

module.exports = authMiddleware;
