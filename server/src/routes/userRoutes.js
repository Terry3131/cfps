const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const { createUserHandler } = require("../controllers/userController");

router.post("/", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"), createUserHandler);

module.exports = router;
