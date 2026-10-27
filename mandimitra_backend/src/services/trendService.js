const { generateCalendarDateSeries, normalizeRecord } = require('../utils/normalizeData');

const MAX_DAYS_LIMIT = 90;
const MIN_DAYS_LIMIT = 2;
const DEFAULT_DAYS = 7;

/**
 * Validates trend query parameters.
 * 
 * @param {object} params
 * @returns {{ isValid: boolean, error?: string, days: number, commodity: string, district?: string }}
 */
function validateTrendParams(params = {}) {
  const { commodity, district, days } = params;

  if (!commodity || typeof commodity !== 'string' || !commodity.trim()) {
    return {
      isValid: false,
      error: 'Query parameter "commodity" is required and must be a non-empty string.'
    };
  }

  let parsedDays = DEFAULT_DAYS;
  if (days !== undefined && days !== null && String(days).trim() !== '') {
    parsedDays = parseInt(days, 10);
    if (isNaN(parsedDays) || parsedDays < MIN_DAYS_LIMIT || parsedDays > MAX_DAYS_LIMIT) {
      return {
        isValid: false,
        error: `Query parameter "days" must be an integer between ${MIN_DAYS_LIMIT} and ${MAX_DAYS_LIMIT}.`
      };
    }
  }

  return {
    isValid: true,
    commodity: commodity.trim(),
    district: district && typeof district === 'string' && district.trim() ? district.trim() : null,
    days: parsedDays
  };
}

/**
 * Computes deterministic price trend from normalized records.
 * 
 * Rules:
 * 1. Consistency: Records are strictly isolated by (market, variety, grade). Never mixed.
 * 2. Missing calendar dates are represented as null in calendarSeries; never interpolated.
 * 3. Requires at least 2 distinct observation dates, otherwise returns 'insufficient_data'.
 * 4. Missing modal prices are preserved as null.
 * 5. Inconsistent min/max/modal prices are marked invalid.
 * 
 * @param {Array<object>} rawRecords Raw or pre-normalized records
 * @param {object} options { commodity, district, days, market, variety, grade }
 * @returns {object} Trend response structure
 */
function calculateTrend(rawRecords, options = {}) {
  const days = options.days || DEFAULT_DAYS;
  const commodity = options.commodity || 'Unknown';
  const district = options.district || null;

  if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
    return {
      status: 'no_data',
      message: 'No price records found for the requested commodity and district.',
      recordsAvailable: 0,
      commodity,
      district,
      history: [],
      calendarSeries: [],
      change: null,
      direction: 'unknown'
    };
  }

  // Normalize all incoming records
  const normalized = rawRecords
    .map((r) => (r.isPriceValid !== undefined ? r : normalizeRecord(r)))
    .filter(Boolean);

  if (normalized.length === 0) {
    return {
      status: 'no_data',
      message: 'No valid records after normalization.',
      recordsAvailable: 0,
      commodity,
      district,
      history: [],
      calendarSeries: [],
      change: null,
      direction: 'unknown'
    };
  }

  // Group by consistent series: Market + Variety + Grade
  // Rule: Do not silently combine different markets or varieties into one trend.
  const seriesGroups = new Map();

  for (const rec of normalized) {
    const key = `${rec.market}::${rec.variety}::${rec.grade}`;
    if (!seriesGroups.has(key)) {
      seriesGroups.set(key, {
        market: rec.market,
        variety: rec.variety,
        grade: rec.grade,
        records: []
      });
    }
    seriesGroups.get(key).records.push(rec);
  }

  // Select target series: match explicit options or pick the series with most valid observations
  let chosenSeries = null;

  if (options.market || options.variety) {
    for (const group of seriesGroups.values()) {
      const matchMarket = !options.market || group.market.toLowerCase() === options.market.toLowerCase();
      const matchVariety = !options.variety || group.variety.toLowerCase() === options.variety.toLowerCase();
      if (matchMarket && matchVariety) {
        chosenSeries = group;
        break;
      }
    }
  }

  if (!chosenSeries) {
    // Choose series with the most valid records
    let maxValid = -1;
    for (const group of seriesGroups.values()) {
      const validCount = group.records.filter((r) => r.isPriceValid && r.date).length;
      if (validCount > maxValid) {
        maxValid = validCount;
        chosenSeries = group;
      }
    }
  }

  const seriesRecords = chosenSeries ? chosenSeries.records : normalized;
  const chosenMarket = chosenSeries ? chosenSeries.market : (seriesRecords[0] ? seriesRecords[0].market : 'Unknown');
  const chosenVariety = chosenSeries ? chosenSeries.variety : (seriesRecords[0] ? seriesRecords[0].variety : 'Standard');
  const chosenGrade = chosenSeries ? chosenSeries.grade : (seriesRecords[0] ? seriesRecords[0].grade : 'FAQ');

  // Check if records exist but all modal prices are missing or invalid
  const validObservationsList = seriesRecords.filter((r) => r.isPriceValid && r.date !== null && r.modalPrice !== null);

  if (validObservationsList.length === 0) {
    return {
      status: 'price_unavailable',
      message: 'Price records were found, but modal prices are unavailable or invalid.',
      recordsAvailable: seriesRecords.length,
      commodity,
      district,
      market: chosenMarket,
      variety: chosenVariety,
      grade: chosenGrade,
      history: [],
      calendarSeries: [],
      change: null,
      direction: 'unknown'
    };
  }

  // Aggregate observations by date (if multiple on same date for same series, take latest valid)
  const dateMap = new Map();
  for (const obs of validObservationsList) {
    dateMap.set(obs.date, {
      date: obs.date,
      price: obs.modalPrice,
      minPrice: obs.minPrice,
      maxPrice: obs.maxPrice,
      market: obs.market,
      variety: obs.variety,
      grade: obs.grade
    });
  }

  // Sort observations chronologically
  const sortedObservations = Array.from(dateMap.values()).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const observationDates = sortedObservations.map((o) => o.date);
  const latestDateStr = observationDates[observationDates.length - 1];

  // Generate calendar-based time series with null for missing calendar dates (Rule 6)
  const calendarDates = generateCalendarDateSeries(latestDateStr, days);
  const calendarSeries = calendarDates.map((dateStr) => {
    const obs = dateMap.get(dateStr);
    return {
      date: dateStr,
      price: obs ? obs.price : null
    };
  });

  // Check data sufficiency: minimum 2 valid distinct date observations required (Rule 7 & 10)
  if (sortedObservations.length < 2) {
    return {
      status: 'insufficient_data',
      message: 'Not enough reported prices to calculate a trend. At least 2 observations on distinct dates are required.',
      recordsAvailable: sortedObservations.length,
      commodity,
      district,
      market: chosenMarket,
      variety: chosenVariety,
      grade: chosenGrade,
      daysRequested: days,
      observationDates,
      calendarSeries,
      history: sortedObservations,
      change: null,
      direction: 'unknown'
    };
  }

  // Calculate changes in pure JavaScript from genuine, validated reported prices (Rule 3)
  const oldest = sortedObservations[0];
  const latest = sortedObservations[sortedObservations.length - 1];

  const absoluteChange = Math.round((latest.price - oldest.price) * 100) / 100;
  const percentChange = Math.round(((latest.price - oldest.price) / oldest.price) * 10000) / 100;

  let direction = 'sthir';
  let directionEnglish = 'stable';

  if (percentChange > 0.5) {
    direction = 'badha';
    directionEnglish = 'rising';
  } else if (percentChange < -0.5) {
    direction = 'ghata';
    directionEnglish = 'falling';
  }

  const allPrices = sortedObservations.map((o) => o.price);
  const minObserved = Math.min(...allPrices);
  const maxObserved = Math.max(...allPrices);
  const avgObserved = Math.round((allPrices.reduce((a, b) => a + b, 0) / allPrices.length) * 100) / 100;

  return {
    status: 'success',
    commodity,
    district,
    market: chosenMarket,
    variety: chosenVariety,
    grade: chosenGrade,
    daysRequested: days,
    recordsAvailable: sortedObservations.length,
    observationDates,
    calendarSeries,
    history: sortedObservations,
    change: {
      absolute: absoluteChange,
      percentage: percentChange,
      startPrice: oldest.price,
      latestPrice: latest.price,
      startDate: oldest.date,
      latestDate: latest.date
    },
    metrics: {
      min: minObserved,
      max: maxObserved,
      average: avgObserved
    },
    direction,
    directionEnglish
  };
}

module.exports = {
  validateTrendParams,
  calculateTrend,
  MAX_DAYS_LIMIT,
  MIN_DAYS_LIMIT,
  DEFAULT_DAYS
};
