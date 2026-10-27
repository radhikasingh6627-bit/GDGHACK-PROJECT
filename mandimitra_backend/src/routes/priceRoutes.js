const express = require('express');
const { getTodayPrices, getPriceTrend } = require('../controllers/priceController');

const router = express.Router();

// GET /api/prices/today
router.get('/today', getTodayPrices);

// GET /api/prices/trend
router.get('/trend', getPriceTrend);

module.exports = router;
