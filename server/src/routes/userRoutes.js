const express = require("express");
const router = express.Router();

const { authenticate: authMiddleware } = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const {
  createUserHandler,
  listUsersHandler,
  savePushTokenHandler,
  updateUserHandler,
} = require("../controllers/userController");

router.get("/", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"), listUsersHandler);
router.post("/", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"), createUserHandler);
router.post("/push-token", authMiddleware, savePushTokenHandler);
router.patch("/:id", authMiddleware, allowRoles("SUPER_ADMIN", "CAS", "AA_CAS", "PASO_CAS"), updateUserHandler);

module.exports = router;
