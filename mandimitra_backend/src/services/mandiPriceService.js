const priceService = require('./priceService');
const mandiService = require('./mandiService');
const { isConfigured } = require('../config/dataGovApi');

/**
 * Adapter preserving compatibility across all Parts.
 */
async function getTodayPrices(params = {}) {
  return priceService.getTodayPrices(params);
}

async function getPriceTrend(params = {}) {
  return priceService.getPriceTrend(params);
}

async function compareMandis(params = {}) {
  return mandiService.compareMandis(params);
}

function isDataGovConfigured() {
  return isConfigured();
}

module.exports = {
  getTodayPrices,
  getPriceTrend,
  compareMandis,
  isDataGovConfigured
};
