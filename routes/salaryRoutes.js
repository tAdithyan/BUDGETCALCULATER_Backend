const express = require('express');
const router = express.Router();
const Salary = require('../models/Salary');

// Get all salaries
router.get('/', async (req, res) => {
  try {
    const salaries = await Salary.find().sort({ month: -1 });
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get salary by month
router.get('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    let salary = await Salary.findOne({ month });

    // If no salary found, return 0
    if (!salary) {
      return res.json({ month, amount: 0 });
    }

    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update salary for a month
router.post('/', async (req, res) => {
  try {
    const { month, amount } = req.body;

    if (!month || amount === undefined) {
      return res.status(400).json({ message: 'Month and amount are required' });
    }

    // Use findOneAndUpdate with upsert to create or update
    const salary = await Salary.findOneAndUpdate(
      { month },
      { month, amount: parseFloat(amount) || 0 },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(salary);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update salary for a month
router.put('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const { amount } = req.body;

    if (amount === undefined) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    const salary = await Salary.findOneAndUpdate(
      { month },
      { amount: parseFloat(amount) || 0 },
      { new: true, runValidators: true }
    );

    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this month' });
    }

    res.json(salary);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
});

// Delete salary for a month
router.delete('/:month', async (req, res) => {
  try {
    const { month } = req.params;
    const salary = await Salary.findOneAndDelete({ month });

    if (!salary) {
      return res.status(404).json({ message: 'Salary not found for this month' });
    }

    res.json({ message: 'Salary deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

