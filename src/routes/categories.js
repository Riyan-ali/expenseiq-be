const express = require("express");
const authMiddleware = require("../middleware/auth");
const {
  getAll,
  create,
  update,
  delete: del,
} = require("../controllers/categoryController");
const router = express.Router();

router.use(authMiddleware);

router.get("/", getAll);
router.post("/", create);
router.put("/:id", update);
router.delete("/:id", del);

module.exports = router;
