const express = require("express");
const router = express.Router();

const {
  getCategories,
  getCurrencies,
  getOrganizationalUnits,
  getBranches,
  getDirectCasOffices,
} = require("../controllers/referenceController");

const authMiddleware = require("../middleware/authMiddleware");

router.get("/categories", authMiddleware, getCategories);
router.get("/organizational-units", authMiddleware, getOrganizationalUnits);
router.get("/branches", authMiddleware, getBranches);
router.get("/direct-cas-offices", authMiddleware, getDirectCasOffices);
router.get("/currencies", authMiddleware, getCurrencies);

module.exports = router;
