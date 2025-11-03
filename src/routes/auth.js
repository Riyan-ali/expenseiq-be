const express = require("express");
const {
  register,
  login,
  changePassword,
  me,
} = require("../controllers/authController");
const authMiddleware = require("../middleware/auth");
const { body } = require("express-validator");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/change-password", authMiddleware, changePassword);
router.get("/me", authMiddleware, me);

module.exports = router;
