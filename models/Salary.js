const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema(
  {
    month: {
      type: String,
      required: [true, 'Please provide a month'],
      unique: true,
      match: [/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0, 'Amount cannot be negative'],
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Salary', salarySchema);

