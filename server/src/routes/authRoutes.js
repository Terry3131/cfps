const express = require("express");
const router = express.Router();

const { login, logout, getMe } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const { loginRateLimit } = require("../middleware/rateLimitMiddleware");

router.post("/login", loginRateLimit, login);
router.post("/logout", authMiddleware, logout);
router.get("/me", authMiddleware, getMe);

module.exports = router;
