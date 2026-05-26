const express = require("express");
const router = express.Router();

const { authenticate: authMiddleware } = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { analyticsRateLimit } = require("../middleware/rateLimitMiddleware");
const {
  getSummaryHandler,
  getStatusBreakdownHandler,
  getCategoryBreakdownHandler,
  getFundingSummaryHandler,
  getRecentActivityHandler,
  getPendingActionsHandler
} = require("../controllers/dashboardController");

const allowDashboardRoles = allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "CAB", "CASH_OFFICE", "MONITOR");

router.get("/summary", authMiddleware, allowDashboardRoles, getSummaryHandler);
router.get("/status-breakdown", authMiddleware, allowDashboardRoles, analyticsRateLimit, getStatusBreakdownHandler);
router.get("/category-breakdown", authMiddleware, allowDashboardRoles, analyticsRateLimit, getCategoryBreakdownHandler);
router.get("/funding-summary", authMiddleware, allowDashboardRoles, analyticsRateLimit, getFundingSummaryHandler);
router.get("/recent-activity", authMiddleware, allowDashboardRoles, analyticsRateLimit, getRecentActivityHandler);
router.get("/pending-actions", authMiddleware, allowDashboardRoles, analyticsRateLimit, getPendingActionsHandler);

module.exports = router;
