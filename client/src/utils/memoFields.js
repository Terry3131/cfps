export function getMemoStatus(memo) {
  return (
    memo?.status ||
    memo?.business_status ||
    memo?.approval_status ||
    memo?.lifecycle_stage ||
    "UNKNOWN"
  );
}

export function getMemoReference(memo) {
  return memo?.reference_no || memo?.reference_number || memo?.memo_reference || "N/A";
}

export function getMemoTitle(memo) {
  return memo?.heading || memo?.title || memo?.subject || memo?.description || "N/A";
}

export function getMemoAmount(memo) {
  return (
    memo?.amount ??
    memo?.approved_amount ??
    memo?.total_amount ??
    ""
  );
}

export function getMemoProgress(memo) {
  return (
    memo?.progress_percent ??
    memo?.progress ??
    memo?.completion_percent ??
    0
  );
}

export function normalizeMemoState(memo) {
  return String(getMemoStatus(memo) || "").toUpperCase();
}

export function canShowAssign(memo) {
  const state = normalizeMemoState(memo);
  return isHeavyWorkflow(memo) && ["APPROVED"].includes(state);
}

export function canShowApprove(memo) {
  const state = normalizeMemoState(memo);
  return isHeavyWorkflow(memo) && ["REGISTERED"].includes(state);
}

export function canShowCommence(memo) {
  const state = normalizeMemoState(memo);
  return isHeavyWorkflow(memo) && ["APPROVED", "ASSIGNED"].includes(state);
}

export function canShowProgress(memo) {
  const state = getMemoLifecycleStage(memo);
  return isHeavyWorkflow(memo) && ["COMMENCED", "IN_PROGRESS"].includes(state);
}

export function canShowValidate(memo) {
  const state = getMemoLifecycleStage(memo);
  return isHeavyWorkflow(memo) && ["AWAITING_VALIDATION"].includes(state);
}

export function canShowArchive(memo) {
  const state = normalizeMemoState(memo);
  return ["COMPLETED"].includes(state);
}

export function isMemoLocked(memo) {
  return Boolean(
    memo?.is_locked ??
      memo?.isLocked ??
      memo?.locked ??
      false
  );
}

export function isMemoArchived(memo) {
  const state = normalizeMemoState(memo);

  return (
    state === "ARCHIVED" ||
    memo?.business_status === "ARCHIVED" ||
    memo?.lifecycle_stage === "ARCHIVED"
  );
}

export function isMemoReadOnly(memo) {
  return isMemoLocked(memo) || isMemoArchived(memo);
}

export function getMemoWorkflowType(memo) {
  const workflowType = String(
    memo?.workflow_type ||
      memo?.workflowType ||
      ""
  ).toUpperCase();

  if (workflowType === "HEAVY_WORKFLOW") {
    return "HEAVY_WORKFLOW";
  }

  if (workflowType === "LIGHT_WORKFLOW") {
    return "LIGHT_WORKFLOW";
  }

  return "LIGHT_WORKFLOW";
}

export function isHeavyWorkflow(memo) {
  return getMemoWorkflowType(memo) === "HEAVY_WORKFLOW";
}

export function isLightWorkflow(memo) {
  return getMemoWorkflowType(memo) === "LIGHT_WORKFLOW";
}

export function getMemoLifecycleStage(memo) {
  return String(
    memo?.lifecycle_stage ||
      memo?.lifecycleStage ||
      memo?.business_status ||
      getMemoStatus(memo) ||
      ""
  ).toUpperCase();
}

export function isMonitorSubmitted100(memo) {
  return safeProgressValue(memo) >= 100;
}

export function isAwaitingValidation(memo) {
  return getMemoLifecycleStage(memo) === "AWAITING_VALIDATION";
}

export function canValidateMemo(memo) {
  return (
    isHeavyWorkflow(memo) &&
    isMonitorSubmitted100(memo) &&
    isAwaitingValidation(memo) &&
    !isMemoLocked(memo) &&
    !memo?.is_completed
  );
}

export function canUserValidateMemo(user, memo) {
  if (!user || !memo) return false;

  if (user.role === "SUPER_ADMIN") {
    return canValidateMemo(memo);
  }

  if (user.role !== "VALIDATOR") return false;

  const assignedValidatorUserId = memo?.assigned_validator_user_id || memo?.assignedValidatorUserId;

  if (assignedValidatorUserId && user.id && String(assignedValidatorUserId) === String(user.id)) {
    return canValidateMemo(memo);
  }

  const userUnitCode = normalizeOrgCode(user.branch_dru || user.unit_code || user.code);
  const validatorBranch = normalizeOrgCode(memo.validator_branch || memo.validatorBranch);

  return canValidateMemo(memo) && Boolean(userUnitCode && validatorBranch && userUnitCode === validatorBranch);
}

export function getValidationReadinessMessage(memo) {
  if (!isMonitorSubmitted100(memo)) {
    return "Awaiting monitor 100% completion.";
  }

  if (!isAwaitingValidation(memo)) {
    return "Progress is complete but memo is not yet awaiting validation.";
  }

  return "Ready for validation.";
}

function safeProgressValue(memo) {
  const value =
    memo?.progress_percent ??
    memo?.progress ??
    memo?.completion_percent ??
    0;

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : 0;
}

function normalizeOrgCode(value) {
  const normalized = String(value || "").trim().toUpperCase();

  if (normalized === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return normalized;
}
