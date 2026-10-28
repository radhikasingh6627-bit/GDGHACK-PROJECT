const { isConfigured, buildDataGovUrl } = require("../config/dataGovApi");
const { normalizeRecord } = require("../utils/normalizeData");
const { calculateTrend, validateTrendParams } = require("./trendService");
const {
  calculateHaversineDistance,
  isValidCoordinates,
} = require("../utils/geoUtils");
const { getMandiCoordinates } = require("../utils/mandiCoordinates");
const historyStorageService = require("./historyStorageService");
const { getMockPrices } = require("./mockDataService");

function recordMatchesFilters(record, filters) {
  if (filters.commodity && typeof filters.commodity === "string" && filters.commodity.trim()) {
    const target = filters.commodity.trim().toLowerCase();
    const actual = (record.commodity || "").toLowerCase();
    const matches = actual === target ||
      actual.startsWith(target + "(") ||
      actual.startsWith(target + " ");
    if (!matches) return false;
  }

  if (filters.district && typeof filters.district === "string" && filters.district.trim()) {
    if ((record.district || "").toLowerCase() !== filters.district.trim().toLowerCase()) {
      return false;
    }
  }

  if (filters.state && typeof filters.state === "string" && filters.state.trim()) {
    if ((record.state || "").toLowerCase() !== filters.state.trim().toLowerCase()) {
      return false;
    }
  }

  return true;
}

async function fetchMandiPrices(filters = {}) {
  if (!isConfigured()) {
    return getMockPrices(filters);
  }

  const allRecords = [];
  let apiTotal = 0;
  let offset = 0;
  const pageSize = 500;
  const maxPages = 20;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    for (let page = 0; page < maxPages; page++) {
      // Fetch by commodity only; apply state/district locally.
      const requestUrl = buildDataGovUrl({
        commodity: filters.commodity,
        limit: pageSize,
        offset,
      });

      const response = await fetch(requestUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        return {
          success: false,
          status: "api_error",
          statusCode: response.status,
          error: `data.gov.in returned HTTP ${response.status}.`,
        };
      }

      const data = await response.json();

      if (!Array.isArray(data.records)) {
        return {
          success: false,
          status: "api_error",
          error: `Unexpected data.gov.in response: ${data.message || "records array missing"}.`,
        };
      }

      const pageRecords = data.records;
      apiTotal =
        typeof data.total === "number" ? data.total : pageRecords.length;

      allRecords.push(...pageRecords);

      if (
        pageRecords.length === 0 ||
        allRecords.length >= apiTotal ||
        pageRecords.length < pageSize
      ) {
        break;
      }

      offset += pageRecords.length;
    }

    const normalized = allRecords
      .map(normalizeRecord)
      .filter(Boolean)
      .filter((record) => recordMatchesFilters(record, filters));

    // Automatically save daily live records into 30-day FIFO rolling storage
    if (normalized.length > 0) {
      try {
        historyStorageService.saveDailyRecords(normalized);
      } catch (err) {
        console.warn("[Storage] Non-critical history save error:", err.message);
      }
    }

    return {
      success: true,
      status: normalized.length ? "success" : "no_data",
      count: normalized.length,
      total: apiTotal,
      commodity: filters.commodity || null,
      district: filters.district || null,
      state: filters.state || null,
      records: normalized,
      message: normalized.length
        ? undefined
        : "No records matched the selected commodity, state and district in the fetched API data.",
    };
  } catch (err) {
    return {
      success: false,
      status: "api_error",
      error:
        err.name === "AbortError"
          ? "data.gov.in request timed out."
          : `Failed to fetch mandi prices: ${err.message}`,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getTodayPrices(params = {}) {
  const result = await fetchMandiPrices({ ...params, forTodayOnly: true });

  // Fallback: If today's prices are not yet updated on data.gov.in (morning, holiday, etc.),
  // provide the latest available verified prices from the 30-day storage.
  if (result.success && result.status === "no_data") {
    try {
      const fallback = historyStorageService.getLatestAvailablePrices(params);
      if (fallback.records && fallback.records.length > 0) {
        return {
          success: true,
          status: "success",
          isFallback: true,
          lastUpdatedDate: fallback.date,
          message: `Today's rates are not yet updated on the Mandi portal. Showing last recorded prices from ${fallback.date}.`,
          count: fallback.records.length,
          total: fallback.records.length,
          commodity: params.commodity || null,
          district: params.district || null,
          state: params.state || null,
          records: fallback.records,
        };
      }
    } catch (err) {
      console.warn("[Fallback] Error retrieving latest stored prices:", err.message);
    }
  }

  return result;
}

async function getPriceTrend(params = {}) {
  const validation = validateTrendParams(params);

  if (!validation.isValid) {
    return {
      success: false,
      status: "invalid_params",
      error: validation.error,
    };
  }

  const { commodity, district, days } = validation;
  const { market, variety, grade, state } = params;

  // 1. Fetch today's records if possible so today's live data is saved to 30-day storage
  try {
    await fetchMandiPrices({
      commodity,
      district,
      state,
      limit: 100,
      forTrend: true,
    });
  } catch (_) {}

  // 2. Retrieve history records from the 30-day rolling storage
  const historyRecords = historyStorageService.getHistoryRecords({
    commodity,
    district,
    state,
    market,
    days,
  });

  if (!historyRecords || historyRecords.length === 0) {
    return {
      success: true,
      status: "no_data",
      message: `No price records found for commodity "${commodity}".`,
      recordsAvailable: 0,
      commodity,
      district,
      history: [],
      calendarSeries: [],
      change: null,
      direction: "unknown",
    };
  }

  // 3. Compute deterministic trend using strict isolation & validation
  const trendResult = calculateTrend(historyRecords, {
    commodity,
    district,
    days,
    market,
    variety,
    grade,
  });

  return {
    success: true,
    ...trendResult,
  };
}

async function compareMandis(params = {}) {
  const { commodity, district, state, lat, lng } = params;

  if (!commodity || !commodity.trim()) {
    return {
      success: false,
      status: "invalid_params",
      error: 'Query parameter "commodity" is required for mandi comparison.',
    };
  }

  const result = await fetchMandiPrices({
    commodity: commodity.trim(),
    district: district ? district.trim() : undefined,
    state: state ? state.trim() : undefined,
    limit: 100,
  });

  if (!result.success) return result;

  if (result.status === "no_data" || result.records.length === 0) {
    // If today has no records, check 30-day storage for recent rates
    const fallback = historyStorageService.getLatestAvailablePrices({ commodity, district, state });
    if (fallback.records && fallback.records.length > 0) {
      result.records = fallback.records;
      result.status = "success";
    } else {
      return {
        success: true,
        status: "no_data",
        commodity,
        mandis: [],
        message: `No price records found for commodity "${commodity}".`,
      };
    }
  }

  const hasUserCoords = isValidCoordinates(lat, lng);

  const compared = result.records
    .filter((record) => record.modalPrice !== null && record.isPriceValid !== false)
    .map((record) => {
      const coords = getMandiCoordinates(record);

      const hasRecordCoords = isValidCoordinates(
        record.latitude,
        record.longitude
      );

      const mandiLat = hasRecordCoords ? record.latitude : coords?.lat;
      const mandiLng = hasRecordCoords ? record.longitude : coords?.lng;

      let distanceKm = null;
      let distanceAvailable = false;

      if (hasUserCoords && isValidCoordinates(mandiLat, mandiLng)) {
        distanceKm = calculateHaversineDistance(
          Number(lat),
          Number(lng),
          Number(mandiLat),
          Number(mandiLng)
        );

        distanceAvailable = Number.isFinite(distanceKm);
        if (!distanceAvailable) distanceKm = null;
      }

      return {
        market: record.market,
        district: record.district,
        state: record.state,
        modalPrice: record.modalPrice,
        minPrice: record.minPrice,
        maxPrice: record.maxPrice,
        arrivalDate: record.date || record.arrivalDate,
        distanceKm,
        distanceAvailable,
      };
    });

  const sorted = [...compared].sort((a, b) => b.modalPrice - a.modalPrice);
  const bestMandi = sorted[0];
  const lowestMandi = sorted[sorted.length - 1];

  const priceDifference = bestMandi
    ? bestMandi.modalPrice - lowestMandi.modalPrice
    : 0;

  return {
    success: true,
    status: "success",
    commodity,
    userCoordinatesProvided: hasUserCoords,
    totalMandis: sorted.length,
    bestMandi: bestMandi
      ? {
          market: bestMandi.market,
          district: bestMandi.district,
          modalPrice: bestMandi.modalPrice,
        }
      : null,
    priceSpread: bestMandi
      ? {
          maxPrice: bestMandi.modalPrice,
          minPrice: lowestMandi.modalPrice,
          difference: Math.round(priceDifference * 100) / 100,
        }
      : null,
    mandis: sorted,
  };
}

module.exports = {
  normalizeRecord,
  recordMatchesFilters,
  fetchMandiPrices,
  getTodayPrices,
  getPriceTrend,
  compareMandis,
};
