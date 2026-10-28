const priceService = require('./priceService');
const alertStorage = require('./alertStorageService');
const whatsappService = require('./whatsappService');
const { isConfigured: isAgmarknetConfigured } = require('../config/dataGovApi');

/**
 * Finds the closest matching record for an alert from a list of records.
 */
function findMatchingRecord(records, alert) {
  if (!Array.isArray(records) || records.length === 0) return null;

  const targetMarket = (alert.market || '').trim().toLowerCase();
  const targetDistrict = (alert.district || '').trim().toLowerCase();
  const targetCommodity = (alert.commodity || '').trim().toLowerCase();

  // 1. Try exact commodity + district + market match
  if (targetMarket) {
    const marketMatch = records.find((r) => {
      const rMarket = (r.market || '').toLowerCase();
      const rDist = (r.district || '').toLowerCase();
      const rComm = (r.commodity || '').toLowerCase();
      return (
        rComm.includes(targetCommodity) &&
        rDist === targetDistrict &&
        (rMarket === targetMarket || rMarket.includes(targetMarket) || targetMarket.includes(rMarket))
      );
    });
    if (marketMatch) return marketMatch;
  }

  // 2. Try commodity + district match
  const districtMatch = records.find((r) => {
    const rDist = (r.district || '').toLowerCase();
    const rComm = (r.commodity || '').toLowerCase();
    return rComm.includes(targetCommodity) && rDist === targetDistrict;
  });
  if (districtMatch) return districtMatch;

  // 3. Fallback to commodity match within district
  return records.find((r) => {
    const rComm = (r.commodity || '').toLowerCase();
    return rComm.includes(targetCommodity);
  }) || null;
}

/**
 * Evaluates a single alert against current reported mandi prices.
 * Strictly avoids triggering from stale, missing, invalid, or mismatched data.
 *
 * @param {string|object} alertOrId The alert object or its ID
 * @param {object} [cachedRecords] Optional pre-fetched records for batch evaluation
 * @returns {Promise<object>}
 */
async function evaluateAlert(alertOrId, cachedRecords = null) {
  const alert = typeof alertOrId === 'string'
    ? alertStorage.getAlertById(alertOrId, true)
    : alertOrId;

  if (!alert) {
    return {
      success: false,
      error: 'Alert not found'
    };
  }

  const now = new Date().toISOString();

  try {
    let records = cachedRecords;
    let isMockData = false;

    if (!records) {
      const priceResult = await priceService.fetchMandiPrices({
        commodity: alert.commodity,
        district: alert.district,
        state: alert.state
      });

      if (!priceResult || !priceResult.success || !Array.isArray(priceResult.records)) {
        alertStorage.updateAlert(alert.id, {
          status: 'data_unavailable',
          lastCheckedAt: now
        });
        return {
          success: true,
          alertId: alert.id,
          status: 'data_unavailable',
          triggered: false,
          reason: 'Unable to fetch official mandi prices from data.gov.in.'
        };
      }

      records = priceResult.records;
      isMockData = Boolean(priceResult.isMockData);
    }

    // Safeguard: In live mode (real WhatsApp credentials configured), NEVER trigger from mock prices
    const isLiveWhatsApp = whatsappService.isWhatsAppConfigured();
    if (isLiveWhatsApp && isMockData) {
      alertStorage.updateAlert(alert.id, {
        status: 'data_unavailable',
        lastCheckedAt: now
      });
      return {
        success: true,
        alertId: alert.id,
        status: 'data_unavailable',
        triggered: false,
        reason: 'Live mode active: cannot trigger real notifications from mock data.'
      };
    }

    const matchedRecord = findMatchingRecord(records, alert);

    // Safeguard: Ensure price record is valid, positive, and officially reported
    if (!matchedRecord || !matchedRecord.isPriceValid || !matchedRecord.modalPrice || matchedRecord.modalPrice <= 0) {
      alertStorage.updateAlert(alert.id, {
        status: 'data_unavailable',
        lastCheckedAt: now
      });
      return {
        success: true,
        alertId: alert.id,
        status: 'data_unavailable',
        triggered: false,
        reason: 'No valid official modal price record reported for this crop and mandi.'
      };
    }

    const modalPrice = Number(matchedRecord.modalPrice);
    const reportDate = matchedRecord.date || matchedRecord.arrivalDate || now.split('T')[0];
    const mandiName = matchedRecord.market || alert.market || alert.district;
    const targetPrice = Number(alert.targetPrice);

    // Safeguard: Check if price meets or exceeds threshold
    const isThresholdMet = modalPrice >= targetPrice;

    if (isThresholdMet) {
      // DUPLICATE SUPPRESSION SAFEGUARD:
      // Prevent duplicate alerts for the same price report date and target price
      if (alert.lastTriggeredReportDate === reportDate) {
        alertStorage.updateAlert(alert.id, {
          status: 'triggered',
          lastCheckedAt: now,
          lastReportedPrice: modalPrice,
          lastReportDate: reportDate
        });
        return {
          success: true,
          alertId: alert.id,
          status: 'triggered',
          triggered: false,
          alreadySentForDate: true,
          reportedPrice: modalPrice,
          targetPrice,
          reportDate,
          mandi: mandiName,
          reason: `Alert already sent for reported date ${reportDate} (rate ₹${modalPrice} >= ₹${targetPrice}).`
        };
      }

      // Explicit Consent Check
      if (!alert.consent) {
        return {
          success: false,
          alertId: alert.id,
          status: 'waiting',
          triggered: false,
          reason: 'Alert recipient has not provided explicit consent.'
        };
      }

      // Dispatch WhatsApp Alert via Service
      const sendResult = await whatsappService.sendWhatsAppAlert({
        recipient: alert.recipientPhone,
        crop: alert.commodity,
        mandi: mandiName,
        reportedPrice: modalPrice,
        targetPrice,
        reportDate,
        source: isMockData ? 'Agmarknet (Demo Simulation)' : 'Agmarknet (data.gov.in) Official Daily Report'
      });

      // Log notification in persistent storage
      const logEntry = alertStorage.logNotification({
        alertId: alert.id,
        type: 'price_threshold_met',
        commodity: alert.commodity,
        mandi: mandiName,
        district: alert.district,
        reportedPrice: modalPrice,
        targetPrice,
        reportDate,
        recipientPhone: alert.recipientPhone,
        source: isMockData ? 'Agmarknet (Demo Simulation)' : 'Agmarknet (data.gov.in)',
        status: sendResult.success ? (sendResult.isSimulated ? 'simulated' : 'delivered') : 'failed',
        isSimulated: Boolean(sendResult.isSimulated),
        metaMessageId: sendResult.messageId || null,
        error: sendResult.error || null
      });

      // Update alert status
      alertStorage.updateAlert(alert.id, {
        status: 'triggered',
        lastCheckedAt: now,
        lastTriggeredAt: now,
        lastTriggeredReportDate: reportDate,
        lastReportedPrice: modalPrice,
        lastReportDate: reportDate
      });

      return {
        success: true,
        alertId: alert.id,
        status: 'triggered',
        triggered: true,
        reportedPrice: modalPrice,
        targetPrice,
        reportDate,
        mandi: mandiName,
        sendResult,
        notificationId: logEntry.id
      };
    } else {
      // Threshold not met: rate is below target
      alertStorage.updateAlert(alert.id, {
        status: 'waiting',
        lastCheckedAt: now,
        lastReportedPrice: modalPrice,
        lastReportDate: reportDate
      });

      return {
        success: true,
        alertId: alert.id,
        status: 'waiting',
        triggered: false,
        reportedPrice: modalPrice,
        targetPrice,
        reportDate,
        mandi: mandiName,
        reason: `Current rate ₹${modalPrice}/quintal is below target ₹${targetPrice}/quintal.`
      };
    }
  } catch (err) {
    console.error(`[AlertEvaluation] Error evaluating alert ${alert.id}:`, err);
    return {
      success: false,
      alertId: alert.id,
      error: `Evaluation failed: ${err.message}`
    };
  }
}

/**
 * Evaluates all registered alerts in a rate-limit aware batch.
 * Groups by commodity to minimize external API calls.
 */
async function evaluateAllAlerts() {
  const alerts = alertStorage.getAllAlerts({ includeRawPhone: true });
  if (!alerts || alerts.length === 0) {
    return {
      evaluatedCount: 0,
      triggeredCount: 0,
      results: []
    };
  }

  // Group alerts by commodity to optimize API calls to data.gov.in
  const commodityCache = {};
  const results = [];
  let triggeredCount = 0;

  for (const alert of alerts) {
    try {
      const cacheKey = `${alert.commodity || ''}_${alert.district || ''}`.toLowerCase();
      let records = null;

      if (!commodityCache[cacheKey]) {
        const fetchRes = await priceService.fetchMandiPrices({
          commodity: alert.commodity,
          district: alert.district,
          state: alert.state
        });
        if (fetchRes && fetchRes.success && Array.isArray(fetchRes.records)) {
          commodityCache[cacheKey] = fetchRes.records;
        } else {
          commodityCache[cacheKey] = [];
        }

        // Polite rate limit pause between unique commodity/district queries
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      records = commodityCache[cacheKey];
      const evalResult = await evaluateAlert(alert, records);
      results.push(evalResult);

      if (evalResult && evalResult.triggered) {
        triggeredCount++;
      }
    } catch (err) {
      results.push({
        alertId: alert.id,
        success: false,
        error: err.message
      });
    }
  }

  return {
    evaluatedCount: alerts.length,
    triggeredCount,
    results,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  findMatchingRecord,
  evaluateAlert,
  evaluateAllAlerts
};

