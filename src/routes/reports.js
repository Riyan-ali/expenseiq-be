const express = require("express");
const authMiddleware = require("../middleware/auth");
const { summary, balance } = require("../controllers/reportController");
const router = express.Router();

router.use(authMiddleware);

router.get("/summary", summary);
router.get("/balance", balance);

module.exports = router;
