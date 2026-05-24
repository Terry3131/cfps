const { findUserByUsername, comparePassword } = require("../services/authService");
const { generateToken } = require("../utils/jwt");
const { successResponse, errorResponse } = require("../utils/responses");

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, "Username and password are required", 400);
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return errorResponse(res, "Invalid username or password", 401);
    }

    if (!user.is_active) {
      return errorResponse(res, "User account is inactive", 403);
    }

    const isPasswordCorrect = await comparePassword(password, user.password_hash);

    if (!isPasswordCorrect) {
      return errorResponse(res, "Invalid username or password", 401);
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      branch_dru: user.branch_dru
    });

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
