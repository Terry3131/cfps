const {
  createMemo,
  getAllMemos,
  getMemoById,
  updateMemoLifecycle,
  updateMemoById
} = require("../services/memoService");

const notificationService = require("../services/notificationService");
const { successResponse, errorResponse } = require("../utils/responses");
const { validateMemoPayload, validateArchive } = require("../utils/validators");
const { logAudit } = require("../utils/audit");
const { isHeavyWorkflow } = require("../utils/workflowDoctrine");
const {
  canValidatorAccessMemo,
  normalizeOrgCode
} = require("../utils/validatorAccess");

function normalizeCode(value) {
  return normalizeOrgCode(value);
}

function isFundsReleased(memo) {
  const releaseStatus = normalizeCode(memo?.fund_release_status);
  const lifecycle = normalizeCode(memo?.lifecycle_stage);
  const totalReleased = Number(memo?.total_released_amount || 0);

  return (
    totalReleased > 0 ||
    ["PARTIALLY_FUNDED", "WAITING_PAYMENT", "PAID"].includes(releaseStatus) ||
    ["FUNDS_RELEASED", "IN_PROGRESS", "VALIDATION_REJECTED", "AWAITING_VALIDATION", "COMPLETED"].includes(lifecycle)
  );
}

function canUserSeeMemo(user, memo) {
  if (!user || !memo) return false;
  if (["SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS", "REGISTRY", "CAB", "CASH_OFFICE", "VIEWER"].includes(user.role)) return true;

  if (user.role === "MONITOR") {
    const assignedUser = memo.assigned_to_user_id && user.id && String(memo.assigned_to_user_id) === String(user.id);
    const assignedBranch = normalizeCode(user.branch_dru) && normalizeCode(user.branch_dru) === normalizeCode(memo.primary_monitor_branch);

    return (
      isHeavyWorkflow(memo.category) &&
      !memo.is_locked &&
      !memo.is_completed &&
      Boolean(assignedUser || assignedBranch)
    );
  }

  if (user.role === "VALIDATOR") {
    return canValidatorAccessMemo(user, memo);
  }

  return false;
}

function filterMemosForUser(memos, user) {
  if (Array.isArray(memos)) {
    return memos.filter((memo) => canUserSeeMemo(user, memo));
  }

  if (Array.isArray(memos?.items)) {
    const items = memos.items.filter((memo) => canUserSeeMemo(user, memo));

    return {
      ...memos,
      items,
      pagination: memos.pagination
        ? {
            ...memos.pagination,
            total: items.length,
            pageCount: 1,
          }
        : memos.pagination,
    };
  }

  return memos;
}

const createMemoHandler = async (req, res, next) => {
  try {
    const errors = validateMemoPayload(req.body);

    if (errors.length > 0) {
      return errorResponse(res, errors.join(", "), 400);
    }

    const memo = await createMemo({
      ...req.body,
      created_by: req.user.id
    });

    await logAudit({
      userId: req.user.id,
      action: "CREATE_MEMO",
      entityType: "MEMO",
      entityId: memo.id,
      metadata: {
        reference_no: memo.reference_no,
        category: memo.category
      }
    });

    await Promise.all([
      notificationService.createRoleNotificationOnce("CAS", {
        memo_id: memo.id,
        type: "MEMO_CREATED",
        title: "Memo Created",
        message: `Memo ${memo.reference_no || memo.heading} has been created.`,
        metadata: {
          reference_no: memo.reference_no,
          business_status: memo.business_status,
        },
      }),
      notificationService.createRoleNotificationOnce("REGISTRY", {
        memo_id: memo.id,
        type: "MEMO_CREATED",
        title: "Memo Created",
        message: `Memo ${memo.reference_no || memo.heading} has been created.`,
        metadata: {
          reference_no: memo.reference_no,
          business_status: memo.business_status,
        },
      }),
    ]);

    return successResponse(res, "Memo created successfully", memo, 201);
  } catch (error) {
    if (error.code === "23505") {
      return errorResponse(res, "reference_no already exists", 400);
    }

    next(error);
  }
};

const updateMemoLifecycleHandler = async (req, res, next) => {
  try {
    const updatedMemo = await updateMemoLifecycle(req.params.id, req.body.status || req.body.business_status);

    if (!updatedMemo) {
      return errorResponse(res, "Memo not found", 404);
    }

    await logAudit({
      userId: req.user.id,
      action: "UPDATE_MEMO_LIFECYCLE",
      entityType: "MEMO",
      entityId: req.params.id,
      metadata: {
        reference_no: updatedMemo.reference_no,
        business_status: updatedMemo.business_status,
        approval_status: updatedMemo.approval_status,
      }
    });

    if (updatedMemo.business_status === "APPROVED") {
      await Promise.all([
        notificationService.createRoleNotificationOnce("CAB", {
          memo_id: updatedMemo.id,
          type: "MEMO_APPROVED",
          title: "Memo Approved",
          message: `Memo ${updatedMemo.reference_no} is approved and ready for CAB review.`,
          metadata: { reference_no: updatedMemo.reference_no },
        }),
        notificationService.createRoleNotificationOnce("CASH_OFFICE", {
          memo_id: updatedMemo.id,
          type: "MEMO_APPROVED",
          title: "Memo Approved",
          message: `Memo ${updatedMemo.reference_no} is approved and ready for fund release.`,
          metadata: { reference_no: updatedMemo.reference_no },
        }),
        notificationService.createRoleNotificationOnce("CAS", {
          memo_id: updatedMemo.id,
          type: "MEMO_APPROVED",
          title: "Memo Approved",
          message: `Memo ${updatedMemo.reference_no} has been approved.`,
          metadata: { reference_no: updatedMemo.reference_no },
        }),
      ]);
    }

    return successResponse(res, "Memo lifecycle updated successfully", updatedMemo);
  } catch (error) {
    next(error);
  }
};

const getAllMemosHandler = async (req, res, next) => {
  try {
    const memos = filterMemosForUser(await getAllMemos(req.query, req.user), req.user);
    return successResponse(res, "Memos fetched successfully", memos);
  } catch (error) {
    next(error);
  }
};

const getMemoByIdHandler = async (req, res, next) => {
  try {
    const memo = await getMemoById(req.params.id);

    if (!memo) {
      return errorResponse(res, "Memo not found", 404);
    }

    if (!canUserSeeMemo(req.user, memo)) {
      return errorResponse(res, "Forbidden: memo is not visible to your role or assigned unit", 403);
    }

    return successResponse(res, "Memo fetched successfully", memo);
  } catch (error) {
    next(error);
  }
};

const updateMemoByIdHandler = async (req, res, next) => {
  try {
    const existingMemo = await getMemoById(req.params.id);

    if (!existingMemo) {
      return errorResponse(res, "Memo not found", 404);
    }

    if (existingMemo.is_locked) {
      return errorResponse(res, "Locked memo cannot be edited", 400);
    }

    const errors = validateMemoPayload(req.body);

    if (errors.length > 0) {
      return errorResponse(res, errors.join(", "), 400);
    }

    const updatedMemo = await updateMemoById(req.params.id, req.body);

    await logAudit({
      userId: req.user.id,
      action: "UPDATE_MEMO",
      entityType: "MEMO",
      entityId: updatedMemo.id,
      metadata: {
        reference_no: updatedMemo.reference_no,
        category: updatedMemo.category
      }
    });

    return successResponse(res, "Memo updated successfully", updatedMemo);
  } catch (error) {
    if (error.code === "23505") {
      return errorResponse(res, "reference_no already exists", 400);
    }

    next(error);
  }
};

const archiveMemoHandler = async (req, res, next) => {
  try {
    const memo = await getMemoById(req.params.id);

    const validationError = validateArchive(memo);

    if (validationError) {
      return errorResponse(
        res,
        validationError,
        validationError === "Memo not found" ? 404 : 400
      );
    }

    const result = await require("../config/db").query(
      `UPDATE memos
       SET business_status = 'ARCHIVED',
           lifecycle_stage = 'COMPLETED',
           is_locked = TRUE,
           is_completed = TRUE,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    const updatedMemo = result.rows[0];

    await logAudit({
      userId: req.user.id,
      action: "ARCHIVE_MEMO",
      entityType: "MEMO",
      entityId: req.params.id,
      metadata: {
        reference_no: updatedMemo.reference_no
      }
    });

    await notificationService.createNotification({
      memo_id: req.params.id,
      target_role: "REGISTRY",
      type: "MEMO_ARCHIVED",
      title: "Memo Archived",
      message: `Memo ${updatedMemo.reference_no} has been archived.`,
      metadata: {
        reference_no: updatedMemo.reference_no,
        business_status: "ARCHIVED"
      }
    });

    return successResponse(res, "Memo archived successfully", updatedMemo);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createMemoHandler,
  getAllMemosHandler,
  getMemoByIdHandler,
  updateMemoByIdHandler,
  updateMemoLifecycleHandler,
  archiveMemoHandler
};
