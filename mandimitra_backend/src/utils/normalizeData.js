/**
 * Data normalization and validation utilities for MandiMitra.
 * Handles date parsing (DD/MM/YYYY), price bounds checking, and string sanitization.
 */

/**
 * Parses dates formatted as DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD into ISO date string (YYYY-MM-DD).
 * Returns null if the date is invalid or missing.
 * 
 * @param {string|Date} dateInput
 * @returns {string|null} Standardized 'YYYY-MM-DD' or null
 */
function parseStandardDate(dateInput) {
  if (!dateInput) return null;

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    return dateInput.toISOString().split('T')[0];
  }

  if (typeof dateInput !== 'string') return null;
  const trimmed = dateInput.trim();

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);

    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      const mm = String(month).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      return `${year}-${mm}-${dd}`;
    }
    return null;
  }

  // Match YYYY-MM-DD
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    const d = new Date(year, month - 1, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month - 1 &&
      d.getDate() === day
    ) {
      return trimmed;
    }
    return null;
  }

  return null;
}

/**
 * Generates an array of consecutive calendar date strings ['YYYY-MM-DD', ...] for a given window.
 * 
 * @param {string} endDateStr YYYY-MM-DD
 * @param {number} daysCount Number of calendar days ending at endDateStr
 * @returns {string[]}
 */
function generateCalendarDateSeries(endDateStr, daysCount) {
  const dates = [];
  const end = new Date(endDateStr + 'T00:00:00Z');
  if (isNaN(end.getTime())) return [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

/**
 * Validates price bounds and consistency.
 * Rules:
 * - Prices must be positive numbers.
 * - If minPrice and maxPrice exist, minPrice <= maxPrice.
 * - If modalPrice exists, it should fall between minPrice and maxPrice (or equal).
 * - Missing prices are strictly preserved as null; never manufactured.
 * 
 * @param {number|null} min
 * @param {number|null} max
 * @param {number|null} modal
 * @returns {{ minPrice: number|null, maxPrice: number|null, modalPrice: number|null, isValid: boolean, error?: string }}
 */
function validatePriceRecord(min, max, modal) {
  const numMin = min !== null && min !== undefined && !isNaN(Number(min)) && Number(min) > 0 ? Number(min) : null;
  const numMax = max !== null && max !== undefined && !isNaN(Number(max)) && Number(max) > 0 ? Number(max) : null;
  const numModal = modal !== null && modal !== undefined && !isNaN(Number(modal)) && Number(modal) > 0 ? Number(modal) : null;

  // If modal price is completely missing or non-positive
  if (numModal === null) {
    return {
      minPrice: numMin,
      maxPrice: numMax,
      modalPrice: null,
      isValid: false,
      error: 'Missing or non-positive modal price'
    };
  }

  // Check min vs max consistency
  if (numMin !== null && numMax !== null && numMin > numMax) {
    return {
      minPrice: numMin,
      maxPrice: numMax,
      modalPrice: numModal,
      isValid: false,
      error: 'Inconsistent price bounds: minPrice cannot be greater than maxPrice'
    };
  }

  // Check modal consistency with min & max bounds
  if (numMin !== null && numModal < numMin) {
    return {
      minPrice: numMin,
      maxPrice: numMax,
      modalPrice: numModal,
      isValid: false,
      error: 'Inconsistent modal price: modalPrice is lower than reported minPrice'
    };
  }

  if (numMax !== null && numModal > numMax) {
    return {
      minPrice: numMin,
      maxPrice: numMax,
      modalPrice: numModal,
      isValid: false,
      error: 'Inconsistent modal price: modalPrice is higher than reported maxPrice'
    };
  }

  return {
    minPrice: numMin,
    maxPrice: numMax,
    modalPrice: numModal,
    isValid: true
  };
}

/**
 * Normalizes an raw agricultural mandi record.
 * 
 * @param {object} raw
 * @returns {object|null}
 */
function normalizeRecord(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const state = (raw.state || raw.State || '').trim();
  const district = (raw.district || raw.District || '').trim();
  const market = (raw.market || raw.Market || '').trim();
  const commodity = (raw.commodity || raw.Commodity || '').trim();
  const variety = (raw.variety || raw.Variety || 'Standard').trim();
  const grade = (raw.grade || raw.Grade || 'FAQ').trim();

  const rawDate = raw.arrival_date || raw.Arrival_Date || raw.date;
  const date = parseStandardDate(rawDate);

  const priceValidation = validatePriceRecord(
    raw.min_price || raw.minPrice,
    raw.max_price || raw.maxPrice,
    raw.modal_price || raw.modalPrice
  );

  return {
    state: state || 'Unknown',
    district: district || 'Unknown',
    market: market || 'Unknown',
    commodity: commodity || 'Unknown',
    variety: variety || 'Standard',
    grade: grade || 'FAQ',
    date,
    minPrice: priceValidation.minPrice,
    maxPrice: priceValidation.maxPrice,
    modalPrice: priceValidation.modalPrice,
    isPriceValid: priceValidation.isValid,
    priceError: priceValidation.error || null,
    latitude: raw.latitude !== undefined && raw.latitude !== null ? Number(raw.latitude) : null,
    longitude: raw.longitude !== undefined && raw.longitude !== null ? Number(raw.longitude) : null
  };
}

module.exports = {
  parseStandardDate,
  generateCalendarDateSeries,
  validatePriceRecord,
  normalizeRecord
};
