const fs = require('fs');
const path = require('path');
const { maskPhoneNumber } = require('./whatsappService');

const STORAGE_FILE = path.join(__dirname, '../data/alerts.json');
const MAX_NOTIFICATIONS = 100;

let memoryCache = null;

/**
 * Initializes and reads storage from disk.
 * Returns in-memory cache if available.
 */
function readStorage() {
  if (memoryCache) {
    return memoryCache;
  }

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.alerts) && Array.isArray(parsed.notifications)) {
        memoryCache = parsed;
        return memoryCache;
      }
    }
  } catch (err) {
    console.warn('[AlertStorage] Error reading alerts.json, recreating empty store:', err.message);
  }

  // Initial seed with demo-ready data
  memoryCache = {
    alerts: [
      {
        id: 'alert_demo_wheat',
        commodity: 'Wheat',
        district: 'Datia',
        market: 'Datia APMC',
        state: 'Madhya Pradesh',
        targetPrice: 2700,
        recipientPhone: '919876543210',
        maskedPhone: '91******3210',
        consent: true,
        consentGivenAt: '2026-10-28T09:00:00.000Z',
        status: 'waiting',
        lastCheckedAt: null,
        lastTriggeredAt: null,
        lastTriggeredReportDate: null,
        lastReportedPrice: 2450,
        lastReportDate: '2026-10-28',
        createdAt: '2026-10-28T09:00:00.000Z',
        updatedAt: '2026-10-28T09:00:00.000Z'
      }
    ],
    notifications: []
  };

  saveStorage(memoryCache);
  return memoryCache;
}

/**
 * Atomically writes data to disk.
 */
function saveStorage(data) {
  memoryCache = data;
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const payload = JSON.stringify(data, null, 2);
  const tmpFile = `${STORAGE_FILE}.tmp`;

  try {
    fs.writeFileSync(tmpFile, payload, 'utf8');
    fs.renameSync(tmpFile, STORAGE_FILE);
  } catch (_) {
    // Windows atomic rename fallback
    try {
      fs.writeFileSync(STORAGE_FILE, payload, 'utf8');
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    } catch (writeErr) {
      console.error('[AlertStorage] Failed to save storage:', writeErr.message);
    }
  }
}

/**
 * Returns all active alerts with phone numbers masked for UI security.
 */
function getAllAlerts(options = { includeRawPhone: false }) {
  const store = readStorage();
  return store.alerts.map((a) => {
    const copy = { ...a };
    if (!options.includeRawPhone) {
      delete copy.recipientPhone;
    }
    return copy;
  });
}

/**
 * Retrieves a single alert by its ID.
 */
function getAlertById(id, includeRawPhone = false) {
  const store = readStorage();
  const alert = store.alerts.find((a) => a.id === id);
  if (!alert) return null;

  const copy = { ...alert };
  if (!includeRawPhone) {
    delete copy.recipientPhone;
  }
  return copy;
}

/**
 * Creates and persists a new alert.
 */
function createAlert(alertData) {
  const store = readStorage();

  const id = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newAlert = {
    id,
    commodity: String(alertData.commodity || '').trim(),
    district: String(alertData.district || '').trim(),
    market: alertData.market ? String(alertData.market).trim() : null,
    state: alertData.state ? String(alertData.state).trim() : null,
    targetPrice: Number(alertData.targetPrice),
    recipientPhone: String(alertData.recipientPhone || '').trim(),
    maskedPhone: maskPhoneNumber(alertData.recipientPhone),
    consent: alertData.consent === true,
    consentGivenAt: now,
    status: 'waiting', // 'waiting' | 'triggered' | 'data_unavailable'
    lastCheckedAt: null,
    lastTriggeredAt: null,
    lastTriggeredReportDate: null,
    lastReportedPrice: null,
    lastReportDate: null,
    createdAt: now,
    updatedAt: now
  };

  store.alerts.unshift(newAlert);
  saveStorage(store);

  // Return masked copy
  const safeCopy = { ...newAlert };
  delete safeCopy.recipientPhone;
  return safeCopy;
}

/**
 * Updates an existing alert with new fields.
 */
function updateAlert(id, updates) {
  const store = readStorage();
  const index = store.alerts.findIndex((a) => a.id === id);
  if (index === -1) return null;

  const existing = store.alerts[index];
  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  // Re-mask if phone was changed
  if (updates.recipientPhone) {
    updated.maskedPhone = maskPhoneNumber(updates.recipientPhone);
  }

  store.alerts[index] = updated;
  saveStorage(store);

  const safeCopy = { ...updated };
  delete safeCopy.recipientPhone;
  return safeCopy;
}

/**
 * Deletes an alert by ID.
 */
function deleteAlert(id) {
  const store = readStorage();
  const prevCount = store.alerts.length;
  store.alerts = store.alerts.filter((a) => a.id !== id);

  if (store.alerts.length !== prevCount) {
    saveStorage(store);
    return true;
  }
  return false;
}

/**
 * Appends a notification log to history.
 */
function logNotification(entry) {
  const store = readStorage();

  const logItem = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    alertId: entry.alertId || null,
    type: entry.type || 'price_threshold_met',
    commodity: entry.commodity || 'Unknown',
    mandi: entry.mandi || 'Unknown',
    district: entry.district || null,
    reportedPrice: entry.reportedPrice !== undefined ? Number(entry.reportedPrice) : null,
    targetPrice: entry.targetPrice !== undefined ? Number(entry.targetPrice) : null,
    reportDate: entry.reportDate || null,
    recipientPhone: maskPhoneNumber(entry.recipientPhone),
    source: entry.source || 'Agmarknet (data.gov.in)',
    status: entry.status || 'delivered', // 'delivered' | 'simulated' | 'failed'
    isSimulated: entry.isSimulated === true,
    metaMessageId: entry.metaMessageId || null,
    error: entry.error || null,
    timestamp: new Date().toISOString()
  };

  store.notifications.unshift(logItem);

  // Maintain circular buffer of recent notifications
  if (store.notifications.length > MAX_NOTIFICATIONS) {
    store.notifications = store.notifications.slice(0, MAX_NOTIFICATIONS);
  }

  saveStorage(store);
  return logItem;
}

/**
 * Returns recent notification history.
 */
function getNotificationHistory(limit = 20) {
  const store = readStorage();
  const count = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  return store.notifications.slice(0, count);
}

/**
 * Helper to reset storage (used in automated unit tests).
 */
function _resetStorageForTesting(initialState = { alerts: [], notifications: [] }) {
  memoryCache = initialState;
  saveStorage(memoryCache);
}

module.exports = {
  getAllAlerts,
  getAlertById,
  createAlert,
  updateAlert,
  deleteAlert,
  logNotification,
  getNotificationHistory,
  _resetStorageForTesting
};

