const express = require("express");
const router = express.Router();

const { authenticate: authMiddleware } = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

const {
  createMemoHandler,
  getAllMemosHandler,
  getMemoByIdHandler,
  updateMemoByIdHandler,
  updateMemoLifecycleHandler,
  archiveMemoHandler
} = require("../controllers/memoController");

const { assignMemoHandler } = require("../controllers/assignmentController");
const { releaseFundsHandler } = require("../controllers/releaseController");
const { commenceMemoHandler } = require("../controllers/commencementController");
const {
  updateProgressHandler,
  getProgressReportsHandler
} = require("../controllers/progressController");
const { validateMemoHandler } = require("../controllers/validationController");
const { approveMemo } = require("../controllers/approvalController");

router.post("/", authMiddleware, allowRoles("SUPER_ADMIN", "REGISTRY"), createMemoHandler);
router.get("/", authMiddleware, getAllMemosHandler);
router.get("/:id", authMiddleware, getMemoByIdHandler);
router.put("/:id", authMiddleware, allowRoles("SUPER_ADMIN", "REGISTRY"), updateMemoByIdHandler);
router.patch("/:id/lifecycle", authMiddleware, allowRoles("SUPER_ADMIN", "REGISTRY"), updateMemoLifecycleHandler);
router.post("/:id/archive", authMiddleware, allowRoles("SUPER_ADMIN", "REGISTRY"), archiveMemoHandler);

router.post("/:id/assign", authMiddleware, allowRoles("SUPER_ADMIN", "REGISTRY"), assignMemoHandler);
router.post("/:id/release", authMiddleware, allowRoles("SUPER_ADMIN", "CAB", "CASH_OFFICE"), releaseFundsHandler);
router.post("/:id/commencement", authMiddleware, allowRoles("SUPER_ADMIN", "MONITOR"), commenceMemoHandler);
router.post("/:id/progress", authMiddleware, allowRoles("SUPER_ADMIN", "MONITOR"), updateProgressHandler);
router.get("/:id/progress-reports", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "MONITOR", "VALIDATOR"), getProgressReportsHandler);
router.post("/:id/validate", authMiddleware, allowRoles("SUPER_ADMIN", "VALIDATOR"), validateMemoHandler);
router.post("/:id/approve", authMiddleware, allowRoles("SUPER_ADMIN", "REGISTRY"), approveMemo);

module.exports = router;
