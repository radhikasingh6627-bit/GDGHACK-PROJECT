const express = require('express');
const { getHealth } = require('../controllers/health.controller');

const router = express.Router();

// GET /api/health
router.get('/health', getHealth);

module.exports = router;
