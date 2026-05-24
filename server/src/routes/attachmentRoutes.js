const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { attachmentUploadRateLimit } = require("../middleware/rateLimitMiddleware");
const upload = require("../config/multer");

const {
  uploadAttachment,
  getAttachments,
  deleteAttachment,
} = require("../controllers/attachmentController");

router.post(
  "/:id/attachments",
  authMiddleware,
  attachmentUploadRateLimit,
  allowRoles("SUPER_ADMIN", "REGISTRY", "MONITOR", "VALIDATOR", "CASH_OFFICE"),
  upload.single("file"),
  uploadAttachment
);

router.get("/:id/attachments", authMiddleware, getAttachments);

router.delete(
  "/:id/attachments/:attachmentId",
  authMiddleware,
  allowRoles("SUPER_ADMIN", "REGISTRY", "MONITOR", "VALIDATOR", "CASH_OFFICE"),
  deleteAttachment
);

module.exports = router;
