const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { notificationPollingRateLimit } = require("../middleware/rateLimitMiddleware");
const {
  createSyncNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

router.get("/", authMiddleware, notificationPollingRateLimit, getNotifications);
router.get("/unread-count", authMiddleware, notificationPollingRateLimit, getUnreadCount);
router.post("/sync-event", authMiddleware, createSyncNotification);
router.patch("/read-all", authMiddleware, markAllAsRead);
router.patch("/:id/read", authMiddleware, markAsRead);

module.exports = router;
