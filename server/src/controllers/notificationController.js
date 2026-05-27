const pool = require("../config/db");
const notificationService = require("../services/notificationService");
const { successResponse, errorResponse } = require("../utils/responses");

async function getNotifications(req, res, next) {
  try {
    const data = await notificationService.listVisibleNotificationsForUser(req.user);
    return successResponse(res, "Notifications fetched", data);
  } catch (err) {
    next(err);
  }
}

async function getUnreadCount(req, res, next) {
  try {
    const unreadCount = await notificationService.getUnreadCountForUser(req.user);
    return successResponse(res, "Unread notification count fetched", {
      unread_count: unreadCount,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
}

async function markAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const data = await notificationService.markNotificationAsRead(id, req.user);

    if (!data) {
      return errorResponse(res, "Notification not found", 404);
    }

    return successResponse(res, "Notification marked as read", data);
  } catch (err) {
    next(err);
  }
}

async function markAllAsRead(req, res, next) {
  try {
    const data = await notificationService.markAllAsRead(req.user);
    return successResponse(res, "All notifications marked as read", data);
  } catch (err) {
    next(err);
  }
}

async function createSyncNotification(req, res, next) {
  try {
    const { type, metadata = {}, message } = req.body || {};
    const data = await notificationService.createSyncNotification(type, {
      ...metadata,
      message,
      reported_by: req.user.id,
      reported_by_role: req.user.role,
    });

    return successResponse(res, "Sync notification created", data, 201);
  } catch (err) {
    next(err);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const { id } = req.params;
    const { role, id: userId } = req.user;

    const result = await pool.query(
      `DELETE FROM notifications
       WHERE id = $1
         AND (
           target_user_id = $2
           OR target_role = $3
           OR (target_user_id IS NULL AND target_role IS NULL)
         )
       RETURNING id`,
      [id, userId, role]
    );

    if (!result.rows[0]) {
      return errorResponse(res, "Notification not found", 404);
    }

    return successResponse(res, "Notification deleted", { id });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSyncNotification,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};