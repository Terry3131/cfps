const lifecycleService = require("../services/lifecycleService");
const { successResponse } = require("../utils/responses");

async function approveMemo(req, res, next) {
  try {
    const { id } = req.params;
    const approvedBy = req.user?.id || null;

    const result = await lifecycleService.approveMemo(id, approvedBy);

    return successResponse(res, "Memo approved successfully", result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  approveMemo,
};