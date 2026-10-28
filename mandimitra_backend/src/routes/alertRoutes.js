const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

// Status & diagnostics
router.get('/status', alertController.getStatus);

// Notification delivery history
router.get('/history', alertController.getHistory);

// Send test alert (to verified test recipient only)
router.post('/test-send', alertController.sendTestAlert);

// Run check on all alerts
router.post('/check-all', alertController.checkAll);

// Alert CRUD & single checks
router.get('/', alertController.getAlerts);
router.post('/', alertController.createAlert);
router.post('/:id/check', alertController.checkAlert);
router.delete('/:id', alertController.deleteAlert);

module.exports = router;

