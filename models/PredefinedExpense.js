const mongoose = require('mongoose');

const predefinedExpenseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
      trim: true,
      maxlength: [100, 'Title cannot be more than 100 characters'],
    },
    isPredefined: {
      type: Boolean,
      default: false,
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0, 'Amount cannot be negative'],
    },
    category: {
      type: String,
      required: [true, 'Please provide a category'],
      enum: [
        'Food',
        'Transport',
        'Shopping',
        'Bills',
        'Entertainment',
        'Healthcare',
        'Education',
        'Rent',
        'Loan',
        'RD',
        'Emi -Arya',
        'Emi -Amma',
        'Other',
      ],
    },
    type: {
      type: String,
      required: [true, 'Please provide a type'],
      enum: ['expense', 'income'],
      default: 'expense',
    },
    dayOfMonth: {
      type: Number,
      min: [1, 'Day must be between 1 and 31'],
      max: [31, 'Day must be between 1 and 31'],
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PredefinedExpense', predefinedExpenseSchema);

