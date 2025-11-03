const Category = require("../models/Category");
const slugify = require("../utils/slugify");
const { body, param, validationResult } = require("express-validator");

exports.getAll = async (req, res) => {
  try {
    const userCategories = await Category.find({ userId: req.user._id });
    const defaultCategories = await Category.find({ userId: null });
    const categories = [...defaultCategories, ...userCategories];
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = [
  body("name").trim().notEmpty(),
  body("type").isIn(["income", "expense"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    }

    const { name, type } = req.body;
    const slug = slugify(name, { lower: true });

    try {
      const existing = await Category.findOne({ userId: req.user._id, slug });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: "Category already exists" });
      }

      const category = new Category({
        userId: req.user._id,
        name,
        slug,
        type,
      });

      await category.save();
      res.status(201).json({ success: true, category });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];

exports.update = [
  param("id").isMongoId(),
  body("name").optional().trim().notEmpty(),
  body("type").optional().isIn(["income", "expense"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    }

    const { id } = req.params;
    const { name, type } = req.body;

    try {
      const category = await Category.findOne({
        _id: id,
        userId: req.user._id,
      });
      if (!category) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      if (name) {
        const newSlug = slugify(name, { lower: true });
        const existing = await Category.findOne({
          userId: req.user._id,
          slug: newSlug,
          _id: { $ne: id },
        });

        if (existing) {
          return res
            .status(400)
            .json({ success: false, message: "Category already exists" });
        }

        category.name = name;
        category.slug = newSlug;
      }

      if (type) category.type = type;

      await category.save();
      res.json({ success: true, category });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];

exports.delete = [
  param("id").isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    }

    const { id } = req.params;

    try {
      const deleted = await Category.findOneAndDelete({
        _id: id,
        userId: req.user._id,
      });

      if (!deleted) {
        return res
          .status(404)
          .json({ success: false, message: "Category not found" });
      }

      res.json({ success: true, message: "Category deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];
