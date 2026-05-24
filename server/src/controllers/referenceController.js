const db = require("../config/db");
const { successResponse } = require("../utils/responses");
const { deriveWorkflowType, getAllowedCategories } = require("../utils/workflowDoctrine");

const categories = getAllowedCategories().map((category) => ({
  code: category,
  name: category.replaceAll("_", " "),
  workflow_type: deriveWorkflowType(category),
}));

const currencies = [
  { code: "NGN", name: "Naira", symbol: "₦" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "Pounds Sterling", symbol: "£" },
  { code: "OTH", name: "Others", symbol: "" },
];

function normalizeOrganizationalUnitType(type) {
  if (!type) return "";

  const value = String(type).toUpperCase();

  if (value === "DIRECT_TO_CAS") return "DIRECT_TO_CAS_OFFICE";

  return value;
}

function getCategories(req, res) {
  return successResponse(res, "Categories fetched successfully", categories);
}

async function getOrganizationalUnits(req, res, next) {
  try {
    const { type } = req.query;
    const values = [];
    let typeFilter = "";

    if (type) {
      values.push(normalizeOrganizationalUnitType(type));
      typeFilter = `AND unit_type = $${values.length}`;
    }

    const result = await db.query(`
      SELECT id, code, name, unit_type, is_active
      FROM organizational_units
      WHERE is_active = TRUE
        ${typeFilter}
      ORDER BY unit_type, code
    `, values);

    return successResponse(res, "Organizational units fetched successfully", result.rows);
  } catch (error) {
    next(error);
  }
}

async function getBranches(req, res, next) {
  try {
    const result = await db.query(`
      SELECT id, code, name, unit_type, is_active
      FROM organizational_units
      WHERE unit_type = 'HQ_BRANCH'
        AND is_active = TRUE
      ORDER BY code
    `);

    return successResponse(res, "Branches fetched successfully", result.rows);
  } catch (error) {
    next(error);
  }
}

async function getDirectCasOffices(req, res, next) {
  try {
    const result = await db.query(`
      SELECT id, code, name, unit_type, is_active
      FROM organizational_units
      WHERE unit_type = 'DIRECT_TO_CAS_OFFICE'
        AND is_active = TRUE
      ORDER BY code
    `);

    return successResponse(res, "Direct-to-CAS offices fetched successfully", result.rows);
  } catch (error) {
    next(error);
  }
}

function getCurrencies(req, res) {
  return successResponse(res, "Currencies fetched successfully", currencies);
}

module.exports = {
  getCategories,
  getOrganizationalUnits,
  getBranches,
  getDirectCasOffices,
  getCurrencies,
};
