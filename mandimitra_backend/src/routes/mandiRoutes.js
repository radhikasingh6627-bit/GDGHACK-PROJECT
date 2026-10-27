const express = require('express');
const { compareMandis } = require('../controllers/mandiController');

const router = express.Router();

// GET /api/mandis/compare
router.get('/compare', compareMandis);

module.exports = router;
