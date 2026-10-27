
const { fetchMandiPrices } = require('./priceService');
const {
  calculateDistance,
  isValidCoordinates,
} = require('../utils/distance');
const { getMandiCoordinates } = require('../utils/mandiCoordinates');
const { getMandiLocation } = require('./mandiLocationService');

/**
 * Validate query parameters for mandi comparison.
 */
function validateCompareParams(params = {}) {
  const {
    commodity,
    district,
    state,
    latitude,
    longitude,
    lat,
    lng,
    sortBy,
  } = params;

  if (!commodity || typeof commodity !== 'string' || !commodity.trim()) {
    return {
      isValid: false,
      code: 'MISSING_REQUIRED_PARAMETER',
      error: 'Query parameter "commodity" is required for mandi comparison.',
    };
  }

  const inputLat = latitude !== undefined ? latitude : lat;
  const inputLon = longitude !== undefined ? longitude : lng;

  let farmerCoords = null;

  if (inputLat !== undefined || inputLon !== undefined) {
    if (!isValidCoordinates(inputLat, inputLon)) {
      return {
        isValid: false,
        code: 'INVALID_COORDINATES',
        error:
          'Provided coordinates (lat, lng) are invalid. Latitude must be between -90 and 90, Longitude between -180 and 180.',
      };
    }

    farmerCoords = {
      lat: Number(inputLat),
      lon: Number(inputLon),
    };
  }

  const requestedSortBy = (sortBy || 'price').toLowerCase().trim();
  const validSortBy = requestedSortBy === 'distance' ? 'distance' : 'price';

  return {
    isValid: true,
    commodity: commodity.trim(),
    district:
      district && typeof district === 'string' && district.trim()
        ? district.trim()
        : null,
    state:
      state && typeof state === 'string' && state.trim()
        ? state.trim()
        : null,
    farmerCoords,
    sortBy: validSortBy,
    requestedSortBy,
  };
}

/**
 * Choose one consistent variety and grade for comparison.
 */
function determineComparisonBasis(records, requestedVariety, requestedGrade) {
  if (requestedVariety && requestedGrade) {
    return {
      variety: requestedVariety.trim(),
      grade: requestedGrade.trim(),
      isAutoSelected: false,
      selectionRule:
        'User specified both variety and grade in query parameters.',
    };
  }

  const groupMap = new Map();

  for (const record of records) {
    const variety = (record.variety || 'Standard').trim();
    const grade = (record.grade || 'FAQ').trim();
    const key = `${variety.toLowerCase()}::${grade.toLowerCase()}`;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        variety,
        grade,
        totalCount: 0,
        validPriceCount: 0,
      });
    }

    const group = groupMap.get(key);
    group.totalCount++;

    if (
      record.modalPrice !== null &&
      !isNaN(record.modalPrice) &&
      record.modalPrice > 0 &&
      record.isPriceValid !== false
    ) {
      group.validPriceCount++;
    }
  }

  if (groupMap.size === 0) {
    return {
      variety: requestedVariety ? requestedVariety.trim() : 'Standard',
      grade: requestedGrade ? requestedGrade.trim() : 'FAQ',
      isAutoSelected: true,
      selectionRule: 'Default fallback (no records available).',
    };
  }

  let candidates = Array.from(groupMap.values());

  if (requestedVariety) {
    const filtered = candidates.filter(
      (group) =>
        group.variety.toLowerCase() === requestedVariety.trim().toLowerCase()
    );

    if (filtered.length > 0) candidates = filtered;
  }

  if (requestedGrade) {
    const filtered = candidates.filter(
      (group) =>
        group.grade.toLowerCase() === requestedGrade.trim().toLowerCase()
    );

    if (filtered.length > 0) candidates = filtered;
  }

  candidates.sort((a, b) => {
    if (b.validPriceCount !== a.validPriceCount) {
      return b.validPriceCount - a.validPriceCount;
    }

    if (b.totalCount !== a.totalCount) {
      return b.totalCount - a.totalCount;
    }

    const aIsFaq = a.grade.toLowerCase() === 'faq';
    const bIsFaq = b.grade.toLowerCase() === 'faq';

    if (aIsFaq && !bIsFaq) return -1;
    if (!aIsFaq && bIsFaq) return 1;

    const varietyComparison = a.variety.localeCompare(b.variety);

    if (varietyComparison !== 0) return varietyComparison;

    return a.grade.localeCompare(b.grade);
  });

  const bestGroup = candidates[0];

  return {
    variety: bestGroup.variety,
    grade: bestGroup.grade,
    isAutoSelected: true,
    selectionRule:
      'Automatically selected the (variety, grade) pair with the most valid reported records. Ties broken by FAQ priority and alphabetical order.',
  };
}

/**
 * Compare mandi prices and calculate distance when coordinates are available.
 */
async function compareMandis(params = {}) {
  const validation = validateCompareParams(params);

  if (!validation.isValid) {
    return {
      success: false,
      status: 'invalid_params',
      code: validation.code,
      error: validation.error,
    };
  }

  const {
    commodity,
    district,
    state,
    farmerCoords,
    requestedSortBy,
  } = validation;

  const { variety, grade } = params;

  const fetchResult = await fetchMandiPrices({
    commodity,
    district,
    state,
    limit: 100,
  });

  if (!fetchResult.success) {
    return {
      success: false,
      status: 'source_unavailable',
      message: 'External price data source is unavailable.',
      error: fetchResult.error,
      mandis: [],
    };
  }

  if (
    fetchResult.status === 'no_data' ||
    !fetchResult.records ||
    fetchResult.records.length === 0
  ) {
    return {
      success: true,
      status: 'no_data',
      commodity,
      district: district || 'All',
      state: state || null,
      message: `No price records found for commodity "${commodity}".`,
      totalMandisCompared: 0,
      distancesAvailable: false,
      mandis: [],
      unpricedMandis: [],
    };
  }

  const allRecords = fetchResult.records;

  const basis = determineComparisonBasis(allRecords, variety, grade);
  const targetVariety = basis.variety.trim().toLowerCase();
  const targetGrade = basis.grade.trim().toLowerCase();

  const matchingRecords = allRecords.filter((record) => {
    const recordVariety = (record.variety || 'Standard').trim().toLowerCase();
    const recordGrade = (record.grade || 'FAQ').trim().toLowerCase();

    return (
      recordVariety === targetVariety &&
      recordGrade === targetGrade
    );
  });

  const pricedMandis = [];
  const unpricedMandis = [];

  for (const record of matchingRecords) {
    // Prefer coordinates provided by the price data source.
    // Otherwise use manually verified coordinates, then try OSM lookup.
    const manualCoords = getMandiCoordinates(record);

    const hasRecordCoords = isValidCoordinates(
      record.latitude,
      record.longitude
    );

   let mandiLat = null;
let mandiLng = null;
let locationAccuracy = null;
let locationVerified = false;

if (hasRecordCoords) {
  mandiLat = Number(record.latitude);
  mandiLng = Number(record.longitude);
  locationAccuracy = "mandi";
  locationVerified = true;
} else if (manualCoords) {
  mandiLat = Number(manualCoords.lat);
  mandiLng = Number(manualCoords.lng);
  locationAccuracy = manualCoords.accuracy;
  locationVerified = manualCoords.verified;
} else {
  try {
    const foundCoords = await getMandiLocation(
      record.market,
      record.district,
      record.state
    );

    if (foundCoords) {
      mandiLat = Number(foundCoords.lat);
      mandiLng = Number(foundCoords.lng);
      locationAccuracy =
        foundCoords.locationAccuracy || "unverified";
    }
  } catch (error) {
    console.error("Mandi location lookup failed:", error.message);
  }
}

    let distanceKm = null;
    let distanceAvailable = false;

    if (
      farmerCoords &&
      isValidCoordinates(mandiLat, mandiLng)
    ) {
      distanceKm = calculateDistance(
        farmerCoords.lat,
        farmerCoords.lon,
        mandiLat,
        mandiLng
      );

      distanceAvailable = Number.isFinite(distanceKm);

      if (!distanceAvailable) {
        distanceKm = null;
      } else {
        distanceKm = Math.round(distanceKm * 100) / 100;
      }
    }

    const item = {
      market: record.market,
      district: record.district,
      state: record.state,
      commodity: record.commodity,
      variety: basis.variety,
      grade: basis.grade,
      arrivalDate: record.date || record.arrivalDate,
      minPrice: record.minPrice,
      maxPrice: record.maxPrice,
      modalPrice: record.modalPrice,
      distanceKm,
      distanceAvailable,
    };

    if (
      record.modalPrice !== null &&
      record.modalPrice !== undefined &&
      record.isPriceValid !== false &&
      !isNaN(record.modalPrice) &&
      Number(record.modalPrice) > 0
    ) {
      pricedMandis.push(item);
    } else {
      unpricedMandis.push({
        ...item,
        priceAvailable: false,
        note: 'Modal price unavailable for this reporting date.',
      });
    }
  }

  const hasDistances = pricedMandis.some(
    (mandi) => mandi.distanceAvailable
  );

  let appliedSortBy = 'price';

  if (
    requestedSortBy === 'distance' &&
    farmerCoords &&
    hasDistances
  ) {
    appliedSortBy = 'distance';

    pricedMandis.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) {
        return b.modalPrice - a.modalPrice;
      }

      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;

      if (a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }

      return b.modalPrice - a.modalPrice;
    });
  } else {
    pricedMandis.sort((a, b) => {
      if (b.modalPrice !== a.modalPrice) {
        return b.modalPrice - a.modalPrice;
      }

      if (
        a.distanceKm !== null &&
        b.distanceKm !== null &&
        a.distanceKm !== b.distanceKm
      ) {
        return a.distanceKm - b.distanceKm;
      }

      return (a.market || '').localeCompare(b.market || '');
    });
  }

  let bestMandi = null;
  let tiedBestMandis = [];
  let isTieForBestPrice = false;
  let priceSpread = null;

  if (pricedMandis.length > 0) {
    const prices = pricedMandis.map((mandi) => Number(mandi.modalPrice));
    const highestPrice = Math.max(...prices);
    const lowestPrice = Math.min(...prices);

    tiedBestMandis = pricedMandis.filter(
      (mandi) => Number(mandi.modalPrice) === highestPrice
    );

    isTieForBestPrice = tiedBestMandis.length > 1;

    const topMandi = pricedMandis[0];

    bestMandi = {
      market: topMandi.market,
      district: topMandi.district,
      modalPrice: topMandi.modalPrice,
      arrivalDate: topMandi.arrivalDate,
      distanceKm: topMandi.distanceKm,
    };

    if (pricedMandis.length >= 2) {
      priceSpread = {
        highestPrice,
        lowestPrice,
        difference: Math.round((highestPrice - lowestPrice) * 100) / 100,
      };
    }
  }

  const hasComparableMarkets = pricedMandis.length >= 2;

  const comparisonMessage = !hasComparableMarkets
    ? pricedMandis.length === 1
      ? `Only 1 mandi found matching variety "${basis.variety}" and grade "${basis.grade}". Insufficient comparable markets in this query for cross-market comparison.`
      : `No mandis with valid modal prices found matching variety "${basis.variety}" and grade "${basis.grade}".`
    : `Compared ${pricedMandis.length} mandis with matching variety "${basis.variety}" and grade "${basis.grade}".`;

  return {
    success: true,
    status: 'success',
    commodity,
    district: district || 'All',
    state: state || null,
    comparisonBasis: {
      variety: basis.variety,
      grade: basis.grade,
      selectionRule: basis.selectionRule,
      note: 'Comparing like with like. Different varieties and grades are never mixed.',
    },
    sortBy: appliedSortBy,
    farmerLocationProvided: Boolean(farmerCoords),
    distancesAvailable: hasDistances,
    totalMandisCompared: pricedMandis.length,
    insufficientComparableMarkets: !hasComparableMarkets,
    comparisonMessage,
    unpricedMandisCount: unpricedMandis.length,
    bestMandi,
    isTieForBestPrice,
    tiedBestMandis: isTieForBestPrice
      ? tiedBestMandis.map((mandi) => ({
          market: mandi.market,
          district: mandi.district,
          modalPrice: mandi.modalPrice,
          arrivalDate: mandi.arrivalDate,
          distanceKm: mandi.distanceKm,
        }))
      : undefined,
    tieBreakingRule: isTieForBestPrice
      ? 'Multiple mandis share the highest price. Primary bestMandi is broken by the selected sorting order.'
      : undefined,
    priceSpread,
    mandis: pricedMandis,
    unpricedMandis,
  };
}

module.exports = {
  validateCompareParams,
  determineComparisonBasis,
  compareMandis,
};
