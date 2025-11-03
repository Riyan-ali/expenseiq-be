const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const slugify = require("../utils/slugify");
const { body, param, query, validationResult } = require("express-validator");
const { default: mongoose } = require("mongoose");

exports.create = [
  body("type").isIn(["income", "expense"]),
  body("amount").isFloat({ min: 0 }),
  body("description").optional().trim(),
  body("categoryId").optional().isMongoId(),
  body("categoryName").optional().notEmpty(),
  body("date").isISO8601(),
  body("priority").optional().isIn(["high", "medium", "low"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    const {
      type,
      amount,
      description,
      categoryId,
      categoryName,
      date,
      priority,
    } = req.body;
    try {
      let category;
      if (categoryId) {
        category = await Category.findById(categoryId);
      } else if (categoryName) {
        let slug = slugify(categoryName);

        let existing = await Category.findOne({ userId: req.user._id, slug });
        let counter = 1;
        while (existing) {
          slug = `${slugify(categoryName)}-${counter}`;
          existing = await Category.findOne({ userId: req.user._id, slug });
          counter++;
        }
        category = await Category.findOne({ userId: req.user._id, slug });
        if (!category) {
          category = new Category({
            userId: req.user._id,
            name: categoryName,
            slug,
            type,
          });
          await category.save();
        }
      }
      if (!category)
        return res
          .status(400)
          .json({ success: false, message: "Category required" });
      const transaction = new Transaction({
        userId: req.user._id,
        type,
        amount,
        description,
        categoryId: category._id,
        categoryName: category.name,
        date: new Date(date),
        priority,
      });
      await transaction.save();
      res.status(201).json({ success: true, transaction });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort = "date:desc",
      type,
      category,
      from,
      to,
      q,
    } = req.query;

    const query = { userId: req.user._id };

    if (type) query.type = type;

    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        query.categoryId = category;
      } else {
        query.categoryName = { $regex: category, $options: "i" };
      }
    }

    if (from || to) {
      query.date = {
        ...(from && { $gte: new Date(from) }),
        ...(to && { $lte: new Date(to + "T23:59:59") }),
      };
    }

    if (q) {
      query.description = { $regex: q, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [sortField, sortOrder] = sort.split(":");
    const sortObj = { [sortField]: sortOrder === "desc" ? -1 : 1 };

    const total = await Transaction.countDocuments(query);

    const transactions = await Transaction.find(query)
      .populate({
        path: "categoryId",
        select: "name type slug",
      })
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: transactions,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching transactions:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Error fetching transactions",
    });
  }
};

exports.update = [
  param("id").isMongoId(),
  body("type").optional().isIn(["income", "expense"]),
  body("amount").optional().isFloat({ min: 0 }),
  body("description").optional().trim(),
  body("categoryId").optional().isMongoId(),
  body("categoryName").optional().notEmpty(),
  body("date").optional().isISO8601(),
  body("priority").optional().isIn(["high", "medium", "low"]),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    const { id } = req.params;
    const updates = req.body;
    try {
      let transaction = await Transaction.findOne({
        _id: id,
        userId: req.user._id,
      });
      if (!transaction)
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      if (updates.categoryId || updates.categoryName) {
        let category;
        if (updates.categoryId) {
          category = await Category.findById(updates.categoryId);
        } else if (updates.categoryName) {
          let slug = slugify(updates.categoryName);
          let existing = await Category.findOne({ userId: req.user._id, slug });
          let counter = 1;
          while (existing) {
            slug = `${slugify(updates.categoryName)}-${counter}`;
            existing = await Category.findOne({ userId: req.user._id, slug });
            counter++;
          }
          category = await Category.findOne({ userId: req.user._id, slug });
          if (!category) {
            category = new Category({
              userId: req.user._id,
              name: updates.categoryName,
              slug,
              type: updates.type || transaction.type,
            });
            await category.save();
          }
        }
        if (!category)
          return res
            .status(400)
            .json({ success: false, message: "Category required" });
        updates.categoryId = category._id;
        updates.categoryName = category.name;
      }
      Object.assign(transaction, updates);
      await transaction.save();
      res.json({ success: true, transaction });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];

exports.delete = [
  param("id").isMongoId(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.mapped(),
      });
    const { id } = req.params;
    try {
      const transaction = await Transaction.findOne({
        _id: id,
        userId: req.user._id,
      });
      if (!transaction)
        return res
          .status(404)
          .json({ success: false, message: "Transaction not found" });
      await transaction.deleteOne();
      res.json({ success: true, message: "Transaction deleted" });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },
];
