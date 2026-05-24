const { isHeavyWorkflow } = require("./workflowDoctrine");

function normalizeOrgCode(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return normalized;
}

function getUserUnitCode(user = {}) {
  return normalizeOrgCode(user.branch_dru || user.unit_code || user.code);
}

function isAssignedValidator(user, memo = {}) {
  if (!user || !memo) return false;

  const assignedValidatorUserId = memo.assigned_validator_user_id || memo.assignedValidatorUserId;

  if (assignedValidatorUserId && user.id && String(assignedValidatorUserId) === String(user.id)) {
    return true;
  }

  const userUnitCode = getUserUnitCode(user);
  const validatorBranch = normalizeOrgCode(memo.validator_branch || memo.validatorBranch);

  return Boolean(userUnitCode && validatorBranch && userUnitCode === validatorBranch);
}

function isValidationReadyMemo(memo = {}) {
  return Boolean(
    isHeavyWorkflow(memo.category) &&
      Number(memo.progress_percent || 0) >= 100 &&
      normalizeOrgCode(memo.lifecycle_stage) === "AWAITING_VALIDATION" &&
      !memo.is_completed &&
      !memo.is_locked
  );
}

function canValidatorAccessMemo(user, memo, options = {}) {
  if (!user || !memo) return false;

  if (options.allowSuperAdmin && user.role === "SUPER_ADMIN") {
    return isValidationReadyMemo(memo);
  }

  if (user.role !== "VALIDATOR") return false;

  return isValidationReadyMemo(memo) && isAssignedValidator(user, memo);
}

module.exports = {
  canValidatorAccessMemo,
  getUserUnitCode,
  isAssignedValidator,
  isValidationReadyMemo,
  normalizeOrgCode,
};
