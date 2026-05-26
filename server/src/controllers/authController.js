const jwt = require("jsonwebtoken");
const {
  findUserByUsername,
  comparePassword,
} = require("../services/authService");

const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
} = require("../config/env");

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    console.log("Login attempt", { username });

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const user = await findUserByUsername(username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    const passwordMatch = await comparePassword(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      branch_dru: user.branch_dru || null,
      token_version: Number(user.token_version || 0),
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN || "1d",
    });

    console.log("Login success", { username });

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        role: user.role,
        branch_dru: user.branch_dru,
        token_version: Number(user.token_version || 0),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

module.exports = {
  login,
};