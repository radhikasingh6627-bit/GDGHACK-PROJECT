const { isConfigured, RESOURCE_ID, BASE_URL } = require('../config/dataGovApi');
const priceService = require('./priceService');

/**
 * Adapter module for backwards compatibility with earlier parts.
 * Delegates fetching and normalization to priceService.js.
 */
function isDataGovConfigured() {
  return isConfigured();
}

function normalizeRecord(raw) {
  return priceService.normalizeRecord(raw);
}

async function fetchMandiRecords(filters = {}) {
  const result = await priceService.fetchMandiPrices(filters);
  if (!result.success) {
    return {
      success: false,
      unconfigured: result.status === 'unconfigured',
      error: result.error
    };
  }

  return {
    success: true,
    records: result.records,
    total: result.total
  };
}

module.exports = {
  isDataGovConfigured,
  normalizeRecord,
  fetchMandiRecords,
  DATA_GOV_RESOURCE_ID: RESOURCE_ID,
  DATA_GOV_BASE_URL: BASE_URL
};
