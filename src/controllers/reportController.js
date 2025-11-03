const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

exports.summary = async (req, res) => {
  const {
    from = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  } = req.query;
  const start = new Date(from);
  const end = new Date(to);
  const match = { userId: req.user._id, date: { $gte: start, $lte: end } };

  const totals = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);

  const byCategory = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { type: "$type", categoryName: "$categoryName" },
        total: { $sum: "$amount" },
      },
    },
  ]);

  const timeSeries = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
        type: { $first: "$type" },
        total: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  res.json({ success: true, totals, byCategory, timeSeries });
};

exports.balance = async (req, res) => {
  const {
    from = new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
  } = req.query;
  const start = new Date(from);
  const end = new Date(to);
  const baseMatch = { userId: req.user._id, date: { $gte: start, $lte: end } };
  try {
    const incomeSeries = await Transaction.aggregate([
      { $match: { ...baseMatch, type: "income" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const expenseSeries = await Transaction.aggregate([
      { $match: { ...baseMatch, type: "expense" } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, incomeSeries, expenseSeries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
