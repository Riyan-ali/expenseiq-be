const User = require("../models/User");
const Category = require("../models/Category");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");

exports.register = [
  body("name").trim().isLength({ min: 2 }).escape(),
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 6 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    const { name, email, password } = req.body;
    try {
      let user = await User.findOne({ email });
      if (user)
        return res.status(400).json({ success: false, message: "User exists" });
      user = new User({ name, email, password });
      await user.save();

      const defaults = [
        { name: "Salary", type: "income", slug: "salary" },
        { name: "Groceries", type: "expense", slug: "groceries" },
        { name: "Utilities", type: "expense", slug: "utilities" },
        { name: "Entertainment", type: "expense", slug: "entertainment" },
        { name: "Transport", type: "expense", slug: "transport" },
        { name: "Miscellaneous", type: "expense", slug: "miscellaneous" },
      ];

      for (const def of defaults) {
        let existing = await Category.findOne({
          userId: user._id,
          slug: def.slug,
        });
        if (!existing) {
          const category = new Category({
            userId: user._id,
            name: def.name,
            slug: def.slug,
            type: def.type,
          });
          await category.save();
        }
      }
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
      res
        .status(201)
        .json({ success: true, token, user: { id: user._id, name, email } });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];

exports.login = [
  body("email").isEmail(),
  body("password").exists(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email },
    });
  },
];

exports.me = async (req, res) => {
  res.json({ success: true, user: req.user });
};

exports.changePassword = [
  body("current").notEmpty().withMessage("Current password is required"),
  body("new")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters"),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    }

    try {
      const user = await User.findById(req.user.id).select("+password");
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const isMatch = await user.comparePassword(req.body.current);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Incorrect current password" });
      }

      user.password = req.body.new;
      await user.save();

      res.json({ success: true, message: "Password updated successfully" });
    } catch (err) {
      console.error("Error changing password:", err);
      res.status(500).json({ success: false, message: "Server error" });
    }
  },
];
