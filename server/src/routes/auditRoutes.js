const express = require("express");
const router = express.Router();

const { authenticate: authMiddleware } = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { getAuditLogsHandler } = require("../controllers/auditController");

router.get("/", authMiddleware, allowRoles("SUPER_ADMIN", "AUDITOR", "CAS", "AA_CAS", "PASO_CAS"), getAuditLogsHandler);

module.exports = router;
