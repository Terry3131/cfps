const { getAllowedCategories, isHeavyWorkflow } = require("./workflowDoctrine");

const allowedCategories = getAllowedCategories();

const allowedCurrencies = ["NGN", "USD", "EUR", "GBP", "OTHERS"];

const validateMemoPayload = (payload = {}) => {
  const errors = [];

  if (!payload.reference_no || String(payload.reference_no).trim() === "") {
    errors.push("reference_no is required");
  }

  if (!payload.heading || String(payload.heading).trim() === "") {
    errors.push("heading is required");
  }

  if (!payload.category || String(payload.category).trim() === "") {
    errors.push("category is required");
  } else if (!allowedCategories.includes(payload.category)) {
    errors.push("category is invalid");
  }

  if (!payload.branch_dru || String(payload.branch_dru).trim() === "") {
    errors.push("branch_dru is required");
  }

  if (payload.currency && !allowedCurrencies.includes(payload.currency)) {
    errors.push("currency is invalid");
  }

  if (payload.movement_type && !["LOCAL", "FOREIGN"].includes(payload.movement_type)) {
    errors.push("movement_type must be LOCAL or FOREIGN");
  }

  if (payload.amount !== undefined && payload.amount !== null) {
    const amount = Number(payload.amount);
    if (Number.isNaN(amount) || amount < 0) {
      errors.push("amount must be a valid non-negative number");
    }
  }

  return errors;
};

// ===== COMMON HELPERS =====
const isEmpty = (val) => val === undefined || val === null || String(val).trim() === "";

// ===== APPROVAL VALIDATION =====
const validateApproval = (memo) => {
  if (!memo) return "Memo not found";
  if (memo.is_locked) return "Locked memo cannot be approved";
  if (memo.is_completed) return "Completed memo cannot be approved";
  if (memo.business_status === "APPROVED") return "Memo already approved";
  return null;
};

// ===== ASSIGNMENT VALIDATION =====
const validateAssignment = (memo, body) => {
  if (!memo) return "Memo not found";
  if (memo.is_locked) return "Locked memo cannot be assigned";
  if (memo.is_completed) return "Completed memo cannot be assigned";

  if (isEmpty(body.primary_monitor_branch)) return "primary_monitor_branch is required";
  if (isEmpty(body.validator_branch)) return "validator_branch is required";

  return null;
};

// ===== RELEASE VALIDATION =====
const validateRelease = (memo, body) => {
  if (!memo) return "Memo not found";
  if (memo.is_locked) return "Locked memo cannot be released";
  if (memo.is_completed) return "Completed memo cannot be released";
  if (memo.approval_status !== "APPROVED") return "Memo must be approved before release";

  const { decision_type, released_amount, release_percentage, rejection_reason } = body;
  const nextPaymentDate = body.next_payment_date || body.next_release_date;
  const approvedAmount = Number(memo.amount || 0);
  const totalReleasedAmount = Number(memo.total_released_amount || 0);
  const remainingBalance = Number(
    memo.remaining_balance ?? Math.max(approvedAmount - totalReleasedAmount, 0)
  );
  const releaseAmount = Number(released_amount || 0);

  if (!["FULL", "PARTIAL", "REJECTED"].includes(decision_type)) {
    return "decision_type must be FULL, PARTIAL, or REJECTED";
  }

  if (["FUNDS RELEASED", "COMPLETED"].includes(String(memo.business_status || "").toUpperCase())) {
    return "Memo has already been fully released or completed";
  }

  if (decision_type === "REJECTED") {
    if (isEmpty(rejection_reason)) return "rejection_reason is required";
    return null;
  }

  if (approvedAmount <= 0) {
    return "approved memo amount must be greater than 0";
  }

  if (remainingBalance <= 0) {
    return "Memo has no remaining balance to release";
  }

  if (releaseAmount > remainingBalance) {
    return "released_amount cannot exceed remaining balance";
  }

  if (decision_type === "FULL") {
    if (releaseAmount !== remainingBalance) {
      return "released_amount must equal remaining balance for FULL release";
    }
  }

  if (decision_type === "PARTIAL") {
    if (releaseAmount <= 0) {
      return "released_amount must be greater than 0";
    }
    if (release_percentage !== null && release_percentage !== undefined) {
      const percentage = Number(release_percentage);
      if (Number.isNaN(percentage) || percentage <= 0 || percentage >= 100) {
        return "release_percentage must be between 1 and 99";
      }
    }
    if (releaseAmount < remainingBalance && !nextPaymentDate) {
      return "next_payment_date is required when partial release leaves a balance";
    }
  }

  return null;
};

// ===== PROGRESS VALIDATION =====
const validateProgress = (memo, body) => {
  if (!memo) return "Memo not found";
  if (memo.is_locked) return "Locked memo cannot be updated";
  if (memo.is_completed) return "Completed memo cannot be updated";

  const { progress_percent, report_date } = body;

  if (progress_percent === undefined || progress_percent < 0 || progress_percent > 100) {
    return "progress_percent must be between 0 and 100";
  }

  if (progress_percent < memo.progress_percent) {
    return "progress_percent cannot decrease";
  }

  if (!report_date) return "report_date is required";

  return null;
};

// ===== VALIDATION VALIDATION =====
const validateValidation = (memo, body) => {
  if (!memo) return "Memo not found";
  if (memo.is_locked) return "Locked memo cannot be validated";
  if (memo.is_completed) return "Completed memo cannot be validated";

  if (typeof body.is_valid !== "boolean") {
    return "is_valid must be true or false";
  }

  if (
    isHeavyWorkflow(memo.category) &&
    (
      Number(memo.progress_percent) < 100 ||
      memo.lifecycle_stage !== "AWAITING_VALIDATION"
    )
  ) {
    return "Monitor must report 100% completion before validation";
  }

  return null;
};

// ===== ARCHIVE VALIDATION =====
const validateArchive = (memo) => {
  if (!memo) return "Memo not found";
  if (!memo.is_completed) return "Only completed memos can be archived";
  if (memo.business_status === "ARCHIVED") return "Memo already archived";
  return null;
};

// ===== ATTACHMENT VALIDATION =====
const validateAttachment = (memo, file) => {
  if (!memo) return "Memo not found";
  if (memo.is_locked || memo.is_completed) {
    return "Cannot upload attachment to locked or completed memo";
  }
  if (!file) return "File is required";
  return null;
};

module.exports = {
  allowedCategories,
  allowedCurrencies,
  validateMemoPayload,
  validateApproval,
  validateAssignment,
  validateRelease,
  validateProgress,
  validateValidation,
  validateArchive,
  validateAttachment
};
