/**
 * Deterministic mathematical calculations for mandi price trends.
 * Rule: All numerical calculations are executed in pure JavaScript and never delegated to an AI model.
 */

/**
 * Calculates price trend statistics from an array of chronological price observations.
 * @param {Array<{ price: number, date: string }>} records Array of sorted records (oldest to newest)
 * @returns {object} Calculated trend metrics
 */
function calculatePriceTrend(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return {
      hasData: false,
      insufficientHistory: true,
      message: 'No price observations available for this commodity.'
    };
  }

  // Filter valid positive numerical prices
  const validRecords = records.filter(
    (r) => typeof r.price === 'number' && !isNaN(r.price) && r.price > 0
  );

  if (validRecords.length < 2) {
    const singlePrice = validRecords.length === 1 ? validRecords[0].price : null;
    const singleDate = validRecords.length === 1 ? validRecords[0].date : null;
    return {
      hasData: validRecords.length === 1,
      insufficientHistory: true,
      dataPoints: validRecords.length,
      currentPrice: singlePrice,
      latestDate: singleDate,
      message: 'Insufficient historical data (at least 2 observations required to establish a trend).'
    };
  }

  const oldest = validRecords[0];
  const latest = validRecords[validRecords.length - 1];

  const priceChange = latest.price - oldest.price;
  const percentChange = (priceChange / oldest.price) * 100;

  // Classify direction (threshold: 0.5% change to avoid micro-jitter)
  let direction = 'sthir'; // stable
  let directionEnglish = 'stable';
  if (percentChange > 0.5) {
    direction = 'badha'; // rising
    directionEnglish = 'rising';
  } else if (percentChange < -0.5) {
    direction = 'ghata'; // falling
    directionEnglish = 'falling';
  }

  const prices = validRecords.map((r) => r.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((acc, val) => acc + val, 0) / prices.length;

  return {
    hasData: true,
    insufficientHistory: false,
    dataPoints: validRecords.length,
    startDate: oldest.date,
    latestDate: latest.date,
    startPrice: oldest.price,
    latestPrice: latest.price,
    priceChange: Math.round(priceChange * 100) / 100,
    percentChange: Math.round(percentChange * 100) / 100,
    direction,
    directionEnglish,
    minPrice: Math.round(minPrice * 100) / 100,
    maxPrice: Math.round(maxPrice * 100) / 100,
    avgPrice: Math.round(avgPrice * 100) / 100
  };
}

module.exports = {
  calculatePriceTrend
};
