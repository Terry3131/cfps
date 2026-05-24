const dashboardService = require("../services/dashboardService");
const { successResponse } = require("../utils/responses");

const getSummaryHandler = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary();
    return successResponse(res, "Dashboard summary fetched", data);
  } catch (err) {
    next(err);
  }
};

const getStatusBreakdownHandler = async (req, res, next) => {
  try {
    const data = await dashboardService.getStatusBreakdown();
    return successResponse(res, "Dashboard status breakdown fetched", data);
  } catch (err) {
    next(err);
  }
};

const getCategoryBreakdownHandler = async (req, res, next) => {
  try {
    const data = await dashboardService.getCategoryBreakdown();
    return successResponse(res, "Dashboard category breakdown fetched", data);
  } catch (err) {
    next(err);
  }
};

const getFundingSummaryHandler = async (req, res, next) => {
  try {
    const data = await dashboardService.getFundingSummary();
    return successResponse(res, "Dashboard funding summary fetched", data);
  } catch (err) {
    next(err);
  }
};

const getRecentActivityHandler = async (req, res, next) => {
  try {
    const data = await dashboardService.getRecentActivity();
    return successResponse(res, "Dashboard recent activity fetched", data);
  } catch (err) {
    next(err);
  }
};

const getPendingActionsHandler = async (req, res, next) => {
  try {
    const data = await dashboardService.getPendingActions();
    return successResponse(res, "Dashboard pending actions fetched", data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSummaryHandler,
  getStatusBreakdownHandler,
  getCategoryBreakdownHandler,
  getFundingSummaryHandler,
  getRecentActivityHandler,
  getPendingActionsHandler
};
