const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { exportRateLimit } = require("../middleware/rateLimitMiddleware");
const { getMemoReportsHandler } = require("../controllers/reportController");

router.get(
  "/memos",
  authMiddleware,
  allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"),
  exportRateLimit,
  getMemoReportsHandler
);

module.exports = router;
