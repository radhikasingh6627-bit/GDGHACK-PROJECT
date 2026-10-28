const fs = require('fs');
const path = require('path');

const STORAGE_FILE = path.join(__dirname, '../data/priceHistory.json');
const MAX_DAYS = 30; // Rolling window: strictly keeps last 30 days

// In-memory cache for ultra-fast zero-latency reads
let memoryCache = null;

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Compact record helper to keep file size minimal and fast
 */
function toCompactRecord(record) {
  return {
    state: record.state || 'Unknown',
    district: record.district || 'Unknown',
    market: record.market || 'Unknown',
    commodity: record.commodity || 'Unknown',
    variety: record.variety || 'FAQ',
    grade: record.grade || 'FAQ',
    date: record.date || record.arrivalDate || formatDate(new Date()),
    arrivalDate: record.arrivalDate || record.date || formatDate(new Date()),
    minPrice: Number(record.minPrice) || 0,
    maxPrice: Number(record.maxPrice) || 0,
    modalPrice: Number(record.modalPrice) || 0,
    isPriceValid: record.isPriceValid !== false,
    priceError: null,
    latitude: record.latitude || null,
    longitude: record.longitude || null
  };
}

/**
 * Seed realistic baseline history for the last 14 days if storage is empty,
 * ensuring 7-day and 30-day trend charts work smoothly from Day 1.
 */
function generateSeedHistory() {
  const seed = { days: {} };
  const commodities = [
    { commodity: 'Wheat', modal: 2450, min: 2250, max: 2600, variety: 'Dara', state: 'Madhya Pradesh', district: 'Datia', market: 'Datia APMC' },
    { commodity: 'Wheat', modal: 2520, min: 2300, max: 2650, variety: 'Mill Quality', state: 'Madhya Pradesh', district: 'Gwalior', market: 'Lashkar APMC' },
    { commodity: 'Paddy(Common)', modal: 2320, min: 2150, max: 2450, variety: 'Common', state: 'Uttar Pradesh', district: 'Lucknow', market: 'Lucknow (Dubagga)' },
    { commodity: 'Rice', modal: 3100, min: 2850, max: 3350, variety: 'Medium', state: 'Uttar Pradesh', district: 'Kanpur', market: 'Kanpur (Chaubepur)' },
    { commodity: 'Potato', modal: 1350, min: 1150, max: 1550, variety: 'Desi', state: 'Uttar Pradesh', district: 'Agra', market: 'Agra (Fatehabad Road)' },
    { commodity: 'Tomato', modal: 1500, min: 1250, max: 1800, variety: 'Hybrid', state: 'Maharashtra', district: 'Nashik', market: 'Nashik (Lasalgaon APMC)' },
    { commodity: 'Onion', modal: 2200, min: 1850, max: 2500, variety: 'Nasik / Red', state: 'Maharashtra', district: 'Nashik', market: 'Nashik (Lasalgaon APMC)' },
    { commodity: 'Mustard', modal: 5400, min: 5100, max: 5700, variety: 'Black', state: 'Rajasthan', district: 'Jaipur', market: 'Jaipur (Muhana Mandi)' }
  ];

  const today = new Date();
  for (let i = 14; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d);

    seed.days[dateStr] = commodities.map((c) => {
      // Natural slight daily fluctuation (+/- 2%)
      const factor = 1 + (Math.sin(i * 1.5) * 0.02);
      const modal = Math.round(c.modal * factor);
      const min = Math.round(c.min * factor);
      const max = Math.round(c.max * factor);
      return {
        state: c.state,
        district: c.district,
        market: c.market,
        commodity: c.commodity,
        variety: c.variety,
        grade: 'FAQ',
        date: dateStr,
        arrivalDate: dateStr,
        minPrice: min,
        maxPrice: max,
        modalPrice: modal,
        isPriceValid: true,
        priceError: null,
        latitude: null,
        longitude: null
      };
    });
  }

  return seed;
}

/**
 * Load store from disk or return memory cache
 */
function loadStore() {
  if (memoryCache) return memoryCache;

  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed.days === 'object') {
        memoryCache = parsed;
        return memoryCache;
      }
    }
  } catch (err) {
    console.warn('[Storage] Warning reading priceHistory.json:', err.message);
  }

  // Initialize fresh or with seed
  memoryCache = generateSeedHistory();
  saveStoreToDisk(memoryCache);
  return memoryCache;
}

/**
 * Save store safely to disk with atomic write
 */
function saveStoreToDisk(store) {
  try {
    const dir = path.dirname(STORAGE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${STORAGE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORAGE_FILE);
  } catch (err) {
    console.error('[Storage] Error saving priceHistory.json:', err.message);
  }
}

/**
 * Rolling Window Pruning (FIFO):
 * Sorts all stored dates chronologically.
 * If total dates > 30, strictly deletes the oldest dates from the back (FIFO)
 * so that only the last 30 days are ever retained.
 */
function pruneRollingWindow(store) {
  if (!store || !store.days) return;

  const dates = Object.keys(store.days).sort(); // YYYY-MM-DD sorts chronologically
  while (dates.length > MAX_DAYS) {
    const oldestDate = dates.shift(); // FIFO removal: oldest date
    delete store.days[oldestDate];
  }
  store.lastPruned = new Date().toISOString();
  store.totalDays = Object.keys(store.days).length;
}

/**
 * Save daily records fetched from data.gov.in into the 30-day rolling store
 * 
 * @param {Array<object>} records Normalized records from API
 * @param {string} [dateStr] Specific date string (defaults to record.date or today)
 */
function saveDailyRecords(records, dateStr = null) {
  if (!Array.isArray(records) || records.length === 0) return;

  const store = loadStore();
  if (!store.days) store.days = {};

  for (const raw of records) {
    if (!raw || !raw.commodity || !raw.modalPrice) continue;
    const compact = toCompactRecord(raw);
    const day = dateStr || compact.date || formatDate(new Date());

    if (!store.days[day]) {
      store.days[day] = [];
    }

    // Avoid duplicate market entries on same day
    const existingIndex = store.days[day].findIndex(
      (r) =>
        r.market.toLowerCase() === compact.market.toLowerCase() &&
        r.commodity.toLowerCase() === compact.commodity.toLowerCase() &&
        r.variety.toLowerCase() === compact.variety.toLowerCase()
    );

    if (existingIndex >= 0) {
      store.days[day][existingIndex] = compact;
    } else {
      store.days[day].push(compact);
    }
  }

  // Enforce 30-day FIFO rolling window pruning
  pruneRollingWindow(store);

  // Persist to disk
  saveStoreToDisk(store);
}

/**
 * Filter helper matching commodity, district, state
 */
function recordMatches(record, filters = {}) {
  if (filters.commodity && typeof filters.commodity === 'string' && filters.commodity.trim()) {
    const target = filters.commodity.trim().toLowerCase();
    const actual = (record.commodity || '').toLowerCase();
    const matches =
      actual === target ||
      actual.startsWith(target + '(') ||
      actual.startsWith(target + ' ') ||
      target.startsWith(actual + '(') ||
      target.startsWith(actual + ' ');
    if (!matches) return false;
  }

  if (filters.district && typeof filters.district === 'string' && filters.district.trim()) {
    if ((record.district || '').toLowerCase() !== filters.district.trim().toLowerCase()) {
      return false;
    }
  }

  if (filters.state && typeof filters.state === 'string' && filters.state.trim()) {
    if ((record.state || '').toLowerCase() !== filters.state.trim().toLowerCase()) {
      return false;
    }
  }

  if (filters.market && typeof filters.market === 'string' && filters.market.trim()) {
    if ((record.market || '').toLowerCase() !== filters.market.trim().toLowerCase()) {
      return false;
    }
  }

  return true;
}

/**
 * Retrieve multi-day history records for trend calculation (up to `days` count, max 30)
 * 
 * @param {object} params { commodity, district, state, market, days = 7 }
 * @returns {Array<object>} Filtered records sorted chronologically
 */
function getHistoryRecords(params = {}) {
  const store = loadStore();
  const maxDaysRequested = Math.min(Math.max(parseInt(params.days, 10) || 7, 2), MAX_DAYS);

  const dates = Object.keys(store.days || {}).sort();
  // Take the most recent N days
  const targetDates = dates.slice(-maxDaysRequested);

  const result = [];
  for (const dateStr of targetDates) {
    const dayRecords = store.days[dateStr] || [];
    for (const r of dayRecords) {
      if (recordMatches(r, params)) {
        result.push(r);
      }
    }
  }

  return result;
}

/**
 * Retrieve the latest available rates if today's data is not yet updated on the gov site.
 * Fallback feature: returns the most recent date available in the 30-day store.
 * 
 * @param {object} filters { commodity, district, state, limit = 50 }
 * @returns {{ records: Array<object>, date: string | null }}
 */
function getLatestAvailablePrices(filters = {}) {
  const store = loadStore();
  const dates = Object.keys(store.days || {}).sort();

  if (dates.length === 0) {
    return { records: [], date: null };
  }

  // Check from newest date backwards to find matching records
  for (let i = dates.length - 1; i >= 0; i--) {
    const dateStr = dates[i];
    const dayRecords = store.days[dateStr] || [];
    const matched = dayRecords.filter((r) => recordMatches(r, filters));

    if (matched.length > 0) {
      const limit = parseInt(filters.limit, 10) || 50;
      return {
        records: matched.slice(0, limit),
        date: dateStr
      };
    }
  }

  return { records: [], date: null };
}

/**
 * Get total stored days count
 */
function getStoredDaysCount() {
  const store = loadStore();
  return Object.keys(store.days || {}).length;
}

module.exports = {
  saveDailyRecords,
  getHistoryRecords,
  getLatestAvailablePrices,
  getStoredDaysCount,
  pruneRollingWindow,
  MAX_DAYS
};

