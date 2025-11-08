const express = require('express');
const router = express.Router();
const PredefinedExpense = require('../models/PredefinedExpense');
const Expense = require('../models/Expense');

// Get all predefined expenses
router.get('/', async (req, res) => {
  try {
    const predefinedExpenses = await PredefinedExpense.find().sort({ createdAt: -1 });
    
    res.json(predefinedExpenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// router.get('/:month', async (req, res) => {
//   try {
//     const { month } = req.params;
//     const { predefinedExpenseIds } = req.query;
//     // Fetch all predefined expenses for that month
//     const predefinedExpenses = await PredefinedExpense.find({ month }).sort({ createdAt: -1 });

//     // Filter those not existing in Expense collection for the same month
//     // const filteredExpenses = [];
//     // for (const predefined of predefinedExpenses) {
//     //   const existingExpense = await Expense.findOne({
//     //     date: { $regex: `^${month}` }, // Match month (e.g. "2025-11")
//     //     title: predefined.title,
//     //     amount: predefined.amount,
//     //     category: predefined.category,
//     //     type: predefined.type,
//     //   });

//     //   if (!existingExpense) {
//     //     filteredExpenses.push(predefined);
//     //   }
//     // }
//     const isApplied = await PredefinedExpense.find({ _id: { $in: predefinedExpenseIds } });

//     res.status(200).json(filteredExpenses);
//   } catch (error) {
//     console.error('Error fetching predefined expenses:', error);
//     res.status(500).json({ message: error.message });
//   }
// });



// Create a new predefined expense
router.post('/', async (req, res) => {
  try {
    const predefinedExpense = new PredefinedExpense(req.body);
    const savedPredefinedExpense = await predefinedExpense.save();
    res.status(201).json(savedPredefinedExpense);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Apply predefined expenses to all months (MUST come before /apply/:month)
router.post('/apply/all', async (req, res) => {
  try {
    const { startMonth, endMonth } = req.body;
    const { predefinedExpenseIds } = req.body;

    let predefinedExpenses;
    if (predefinedExpenseIds && Array.isArray(predefinedExpenseIds)) {
      predefinedExpenses = await PredefinedExpense.find({
        _id: { $in: predefinedExpenseIds },
        isActive: true,
      });
    } else {
      predefinedExpenses = await PredefinedExpense.find({ isActive: true });
    }

    if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) {
      return res.status(400).json({ message: 'Valid startMonth (YYYY-MM) is required' });
    }

    const currentDate = new Date();
    const start = new Date(startMonth + '-01');
    const end = endMonth ? new Date(endMonth + '-01') : null;

    if (start < currentDate) {
      return res.status(400).json({ message: 'Start month cannot be in the past' });
    }

    const months = [];
    let current = new Date(start);

    // Set max end date (2 years from now if no endMonth specified)
    const maxEndDate = end || new Date(currentDate.getFullYear() + 2, currentDate.getMonth());

    while (current <= maxEndDate) {
      const monthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      months.push(monthStr);

      // Move to next month
      current.setMonth(current.getMonth() + 1);
      
      // Safety check to prevent infinite loop
      if (months.length > 24) break; // Max 24 months (2 years)
    }

    const results = {
      totalMonths: months.length,
      monthsProcessed: [],
      totalCreated: 0,
      errors: [],
    };

    for (const month of months) {
      const monthResults = {
        month,
        created: 0,
        skipped: 0,
      };

      for (const predefined of predefinedExpenses) {
        try {
          const day = predefined.dayOfMonth || 1;
          const date = `${month}-${String(day).padStart(2, '0')}`;

          const existingExpense = await Expense.findOne({
            date: date,
            title: predefined.title,
            amount: predefined.amount,
            category: predefined.category,
            type: predefined.type,
          });

          if (!existingExpense) {
            const expense = new Expense({
              title: predefined.title,
              amount: predefined.amount,
              category: predefined.category,
              type: predefined.type,
              date: date,
            });

            await expense.save();
            monthResults.created++;
            results.totalCreated++;
          } else {
            monthResults.skipped++;
          }
        } catch (error) {
          results.errors.push({
            month,
            predefinedExpense: predefined.title,
            message: error.message,
          });
        }
      }

      results.monthsProcessed.push(monthResults);
    }

    res.status(201).json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Apply predefined expenses to a specific month (MUST come before /:id route)
router.post('/apply/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const { predefinedExpenseIds, options = null } = req.body;
    // Validate month format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'Invalid month format. Use YYYY-MM' });
    }

    let predefinedExpenses;
    if (predefinedExpenseIds && Array.isArray(predefinedExpenseIds)) {
      // Apply specific predefined expenses
      predefinedExpenses = await PredefinedExpense.find({
        _id: { $in: predefinedExpenseIds },
        isActive: true,
      });
    } else {
      // Apply all active predefined expenses
      predefinedExpenses = await PredefinedExpense.find({ isActive: true });
    }

    const createdExpenses = [];
    const errors = [];

    for (const predefined of predefinedExpenses) {
      try {
        // Check if expense already exists for this month
        const existingExpense = await Expense.findOne({
          date: { $regex: `^${month}` },
          title: predefined.title,
          amount: predefined.amount,
          category: predefined.category,
          type: predefined.type,
        });

        if (existingExpense) {
          errors.push({
            predefinedExpense: predefined.title,
            message: 'Expense already exists for this month',
          });
          continue;
        }

        // Create the expense for the specified day of month
        const day = predefined.dayOfMonth || 1;
        const date = `${month}-${String(day).padStart(2, '0')}`;

        const expense = new Expense({
          title: predefined.title,
          amount: predefined.amount,
          category: predefined.category,
          type: predefined.type,
          date: date,
        });

        const savedExpense = await expense.save();
        console.log("savedExpense",savedExpense);
        createdExpenses.push(savedExpense);
      } catch (error) {
        errors.push({
          predefinedExpense: predefined.title,
          message: error.message,
        });
      }
    }

    res.status(201).json({
      message: `Applied ${createdExpenses.length} predefined expense(s)`,
      created: createdExpenses,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single predefined expense by ID (MUST come after /apply routes)
router.get('/:id', async (req, res) => {
  try {
    const predefinedExpense = await PredefinedExpense.findById(req.params.id);
    if (!predefinedExpense) {
      return res.status(404).json({ message: 'Predefined expense not found' });
    }
    res.json(predefinedExpense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update a predefined expense
router.put('/:id', async (req, res) => {
  try {
    const predefinedExpense = await PredefinedExpense.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!predefinedExpense) {
      return res.status(404).json({ message: 'Predefined expense not found' });
    }
    res.json(predefinedExpense);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete a predefined expense
router.delete('/:id', async (req, res) => {
  try {
    const predefinedExpense = await PredefinedExpense.findByIdAndDelete(req.params.id);
    if (!predefinedExpense) {
      return res.status(404).json({ message: 'Predefined expense not found' });
    }
    res.json({ message: 'Predefined expense deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

