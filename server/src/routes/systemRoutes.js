const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const {
  SYSTEM_ROLES,
  downloadBackupHandler,
  restoreBackupHandler,
} = require("../controllers/systemController");

router.get("/backup", authMiddleware, allowRoles(...SYSTEM_ROLES), downloadBackupHandler);
router.post("/restore", authMiddleware, allowRoles(...SYSTEM_ROLES), restoreBackupHandler);

module.exports = router;
