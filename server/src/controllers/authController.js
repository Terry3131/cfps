const { findUserByUsername, comparePassword } = require("../services/authService");
const { generateToken } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/responses");

const login = async (req, res, next) => {
  const username = req.body?.username;

  try {
    const { password } = req.body;
    const loginUsername = String(username || "").trim();

    if (!loginUsername || !password) {
      return errorResponse(res, "Username and password are required", 400);
    }

    logLoginEvent("attempt", { username: loginUsername });

    let user;

    try {
      user = await findUserByUsername(loginUsername);
    } catch (error) {
      logLoginEvent("database lookup failed", {
        username: loginUsername,
        error: error.message,
      });
      throw error;
    }

    if (!user) {
      logLoginEvent("user not found", { username: loginUsername });
      return errorResponse(res, "Invalid username or password", 401);
    }

    if (!user.is_active) {
      logLoginEvent("inactive account", { username: loginUsername });
      return errorResponse(res, "User account is inactive", 403);
    }

    let isPasswordCorrect;

    try {
      isPasswordCorrect = await comparePassword(password, user.password_hash);
    } catch (error) {
      logLoginEvent("password comparison failed", {
        username: loginUsername,
        error: error.message,
      });
      throw error;
    }

    if (!isPasswordCorrect) {
      logLoginEvent("invalid password", { username: loginUsername });
      return errorResponse(res, "Invalid username or password", 401);
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      branch_dru: user.branch_dru
    });

    logLoginEvent("success", { username: loginUsername });

    return successResponse(res, "Login successful", {
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        branch_dru: user.branch_dru
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    return successResponse(res, "User fetched successfully", {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      branch_dru: req.user.branch_dru
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe
};

function logLoginEvent(event, details = {}) {
  const metadata = {
    username: details.username,
    error: sanitizeLogMessage(details.error),
  };

  Object.keys(metadata).forEach((key) => {
    if (!metadata[key]) {
      delete metadata[key];
    }
  });

  console.info(`Login ${event}`, metadata);
}

function sanitizeLogMessage(message = "") {
  return String(message).replace(
    /postgres(?:ql)?:\/\/\S+/gi,
    "[redacted database url]"
  );
}
