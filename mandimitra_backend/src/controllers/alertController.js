const alertStorage = require('../services/alertStorageService');
const { evaluateAlert, evaluateAllAlerts } = require('../services/alertEvaluationService');
const whatsappService = require('../services/whatsappService');
const { getSchedulerStatus } = require('../services/alertScheduler');

/**
 * GET /api/alerts
 * Lists all active price alerts with phone numbers masked.
 */
async function getAlerts(req, res, next) {
  try {
    const alerts = alertStorage.getAllAlerts({ includeRawPhone: false });
    return res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/alerts
 * Creates a new price alert after rigorous input validation and explicit consent verification.
 */
async function createAlert(req, res, next) {
  try {
    const { commodity, district, market, state, targetPrice, recipientPhone, consent } = req.body;

    // 1. Validate Crop/Commodity
    if (!commodity || typeof commodity !== 'string' || !commodity.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COMMODITY',
          message: 'Crop / Commodity name is required.'
        }
      });
    }

    // 2. Validate District / Mandi
    if (!district || typeof district !== 'string' || !district.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DISTRICT',
          message: 'District or Mandi name is required.'
        }
      });
    }

    // 3. Validate Target Price
    const numericTarget = Number(targetPrice);
    if (!targetPrice || isNaN(numericTarget) || numericTarget <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TARGET_PRICE',
          message: 'Target price must be a valid positive number in ₹/quintal.'
        }
      });
    }

    // 4. Validate Indian Mobile Number
    const phoneValidation = whatsappService.normalizeIndianPhone(recipientPhone);
    if (!phoneValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE_NUMBER',
          message: phoneValidation.error
        }
      });
    }

    // 5. Require Explicit Farmer Consent
    if (consent !== true) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: 'Farmer consent is strictly required to receive price alerts on WhatsApp.'
        }
      });
    }

    // Save alert into persistent storage
    const newAlert = alertStorage.createAlert({
      commodity: commodity.trim(),
      district: district.trim(),
      market: market ? market.trim() : null,
      state: state ? state.trim() : null,
      targetPrice: numericTarget,
      recipientPhone: phoneValidation.normalized,
      consent: true
    });

    // Perform immediate check against current mandi rates
    let immediateCheck = null;
    try {
      immediateCheck = await evaluateAlert(newAlert.id);
    } catch (evalErr) {
      console.warn(`[AlertController] Initial evaluation warning for ${newAlert.id}:`, evalErr.message);
    }

    // Retrieve fresh alert state after evaluation
    const refreshedAlert = alertStorage.getAlertById(newAlert.id, false);

    return res.status(201).json({
      success: true,
      message: 'WhatsApp Price Alert registered successfully.',
      alert: refreshedAlert || newAlert,
      initialCheck: immediateCheck
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/alerts/:id
 * Removes an existing price alert.
 */
async function deleteAlert(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = alertStorage.deleteAlert(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: `Alert with ID "${id}" was not found.`
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Alert deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/alerts/:id/check
 * Manually triggers a price evaluation check for a specific alert.
 */
async function checkAlert(req, res, next) {
  try {
    const { id } = req.params;
    const alert = alertStorage.getAlertById(id, true);

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ALERT_NOT_FOUND',
          message: `Alert with ID "${id}" was not found.`
        }
      });
    }

    const evaluation = await evaluateAlert(alert);
    const updated = alertStorage.getAlertById(id, false);

    return res.status(200).json({
      success: true,
      evaluation,
      alert: updated
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/alerts/check-all
 * Manually triggers price evaluation for all registered alerts.
 */
async function checkAll(req, res, next) {
  try {
    const result = await evaluateAllAlerts();
    return res.status(200).json({
      success: true,
      result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/alerts/test-send
 * Dispatches a test alert strictly to the pre-configured verified test recipient.
 * Requires explicit user click from the UI.
 */
async function sendTestAlert(req, res, next) {
  try {
    const result = await whatsappService.sendTestAlert();

    // Log this test action into persistent history
    alertStorage.logNotification({
      alertId: 'test_dispatch',
      type: 'test_alert',
      commodity: 'Wheat (गेहूं)',
      mandi: 'Datia APMC (दतिया मंडी)',
      district: 'Datia',
      reportedPrice: 2780,
      targetPrice: 2700,
      reportDate: new Date().toISOString().split('T')[0],
      recipientPhone: result.recipient || 'Test Recipient',
      source: result.isSimulated ? 'Agmarknet (Demo Simulation)' : 'Agmarknet (data.gov.in) Official Daily Report',
      status: result.success ? (result.isSimulated ? 'simulated' : 'delivered') : 'failed',
      isSimulated: Boolean(result.isSimulated),
      metaMessageId: result.messageId || null,
      error: result.error || null
    });

    if (!result.success) {
      return res.status(result.status === 'credentials_missing' ? 400 : 502).json({
        success: false,
        result
      });
    }

    return res.status(200).json({
      success: true,
      message: result.isSimulated
        ? 'Test simulated successfully [DEMO MODE].'
        : 'Test message sent successfully via Meta WhatsApp Cloud API.',
      result
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/history
 * Returns the latest alert notification delivery logs.
 */
async function getHistory(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 25;
    const history = alertStorage.getNotificationHistory(limit);

    return res.status(200).json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/alerts/status
 * Returns current WhatsApp system configuration and scheduler status.
 */
async function getStatus(req, res, next) {
  try {
    const whatsapp = whatsappService.getWhatsAppStatus();
    const scheduler = getSchedulerStatus();

    return res.status(200).json({
      success: true,
      whatsapp,
      scheduler
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAlerts,
  createAlert,
  deleteAlert,
  checkAlert,
  checkAll,
  sendTestAlert,
  getHistory,
  getStatus
};

