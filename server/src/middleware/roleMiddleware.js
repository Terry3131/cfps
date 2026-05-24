const { errorResponse } = require("../utils/responses");

const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, "Unauthorized", 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      return errorResponse(res, "Forbidden: insufficient permissions", 403);
    }

    next();
  };
};

module.exports = allowRoles;
