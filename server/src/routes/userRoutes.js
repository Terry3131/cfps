const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const {
  createUserHandler,
  listUsersHandler,
  updateUserHandler,
} = require("../controllers/userController");

router.get("/", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"), listUsersHandler);
router.post("/", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"), createUserHandler);
router.patch("/:id", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"), updateUserHandler);

module.exports = router;
