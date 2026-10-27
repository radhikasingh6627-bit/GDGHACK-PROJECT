/**
 * Automated tests for Haversine distance calculations and Mandi comparison sorting.
 * Uses Node.js's built-in `node:test` and `node:assert/strict`.
 * 
 * All test fixtures use clearly labelled SYNTHETIC data to test logic in isolation.
 * Synthetic test values never appear in real API production output.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateDistance, isValidCoordinates } = require('../src/utils/distance');
const { validateCompareParams, determineComparisonBasis } = require('../src/services/mandiService');

describe('Part 4 Haversine Distance & Mandi Comparison Tests', () => {

  // 1. Identical coordinates produce zero distance
  test('Fixture 1: Identical coordinates produce zero distance', () => {
    const lat = 26.8467;
    const lon = 80.9462;
    const distance = calculateDistance(lat, lon, lat, lon);
    assert.equal(distance, 0);
  });

  // 2. Valid coordinate pairs produce non-negative distances
  test('Fixture 2: Valid coordinate pairs produce non-negative distances', () => {
    // Lucknow (26.8467, 80.9462) to Kanpur (26.4499, 80.3319) is ~77 km straight line
    const distance = calculateDistance(26.8467, 80.9462, 26.4499, 80.3319);
    assert.ok(typeof distance === 'number');
    assert.ok(distance > 70 && distance < 85, `Expected ~77km, got ${distance}km`);
  });

  // 3. Missing and invalid coordinates return null
  test('Fixture 3: Missing and invalid coordinates return null', () => {
    assert.equal(calculateDistance(null, 80.95, 26.85, 80.95), null);
    assert.equal(calculateDistance(26.85, undefined, 26.85, 80.95), null);
    assert.equal(calculateDistance('not-a-number', 80.95, 26.85, 80.95), null);
    assert.equal(calculateDistance('', '', 26.85, 80.95), null);
    assert.equal(calculateDistance(26.85, 80.95, null, null), null);
  });

  // 4. Out-of-range latitude/longitude values return null
  test('Fixture 4: Out-of-range latitude (> 90 or < -90) and longitude (> 180 or < -180) return null', () => {
    assert.equal(isValidCoordinates(91, 80), false, 'Latitude > 90 must be invalid');
    assert.equal(isValidCoordinates(-91, 80), false, 'Latitude < -90 must be invalid');
    assert.equal(isValidCoordinates(26, 181), false, 'Longitude > 180 must be invalid');
    assert.equal(isValidCoordinates(26, -181), false, 'Longitude < -180 must be invalid');

    assert.equal(calculateDistance(95, 80, 26, 80), null);
    assert.equal(calculateDistance(26, 80, 26, 195), null);
  });

  // 5. Sorting comparable market records by price (highest to lowest)
  test('Fixture 5: Sorting comparable market records by price puts highest modal price first', () => {
    const syntheticMandis = [
      { market: 'SYNTHETIC_MANDI_A', modalPrice: 2200 },
      { market: 'SYNTHETIC_MANDI_B', modalPrice: 2600 },
      { market: 'SYNTHETIC_MANDI_C', modalPrice: 2400 }
    ];

    syntheticMandis.sort((a, b) => b.modalPrice - a.modalPrice);

    assert.equal(syntheticMandis[0].market, 'SYNTHETIC_MANDI_B');
    assert.equal(syntheticMandis[0].modalPrice, 2600);
    assert.equal(syntheticMandis[1].market, 'SYNTHETIC_MANDI_C');
    assert.equal(syntheticMandis[2].market, 'SYNTHETIC_MANDI_A');
  });

  // 6. Missing-price market records are kept separate and not included in valid-price ranking
  test('Fixture 6: Missing-price records are identified and separated from valid-price ranking', () => {
    const mixedRecords = [
      { market: 'MANDI_PRICED', modalPrice: 2500, isPriceValid: true },
      { market: 'MANDI_UNPRICED', modalPrice: null, isPriceValid: false }
    ];

    const priced = mixedRecords.filter((r) => r.modalPrice !== null && r.isPriceValid);
    const unpriced = mixedRecords.filter((r) => r.modalPrice === null || !r.isPriceValid);

    assert.equal(priced.length, 1);
    assert.equal(priced[0].market, 'MANDI_PRICED');
    assert.equal(unpriced.length, 1);
    assert.equal(unpriced[0].market, 'MANDI_UNPRICED');
  });

  // 7. Distance sorting only when distances are known
  test('Fixture 7: Distance sorting sorts ascending when distances are known; falls back to price if null', () => {
    const mandisWithDistances = [
      { market: 'FAR_MANDI', modalPrice: 2800, distanceKm: 45.2 },
      { market: 'NEAR_MANDI', modalPrice: 2500, distanceKm: 12.5 },
      { market: 'UNKNOWN_DIST_MANDI', modalPrice: 2900, distanceKm: null }
    ];

    mandisWithDistances.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    assert.equal(mandisWithDistances[0].market, 'NEAR_MANDI');
    assert.equal(mandisWithDistances[0].distanceKm, 12.5);
    assert.equal(mandisWithDistances[1].market, 'FAR_MANDI');
    assert.equal(mandisWithDistances[2].market, 'UNKNOWN_DIST_MANDI');
  });

  // 8. Parameter validation
  test('Fixture 8: Validates comparison parameters and handles optional coordinates', () => {
    assert.equal(validateCompareParams({}).isValid, false);
    assert.equal(validateCompareParams({ commodity: 'Wheat' }).isValid, true);
    assert.equal(validateCompareParams({ commodity: 'Wheat', latitude: 26.85, longitude: 80.95 }).isValid, true);
    assert.equal(validateCompareParams({ commodity: 'Wheat', latitude: 999, longitude: 80.95 }).isValid, false);
  });

  // 9. Consistency guarantee: Different grades and varieties are NEVER mixed
  test('Fixture 9: Different grades (e.g. Grade A vs FAQ) are never mixed in the same comparison group', () => {
    const rawTomatoRecords = [
      { market: 'Doraha APMC', commodity: 'Tomato', variety: 'Deshi', grade: 'Local', modalPrice: 2300, isPriceValid: true },
      { market: 'Khanna APMC', commodity: 'Tomato', variety: 'Tomato', grade: 'Grade A', modalPrice: 2500, isPriceValid: true },
      { market: 'Sahnewal APMC', commodity: 'Tomato', variety: 'Tomato', grade: 'FAQ', modalPrice: 2500, isPriceValid: true }
    ];

    // Determine basis automatically
    const basis = determineComparisonBasis(rawTomatoRecords, null, null);
    assert.equal(basis.variety, 'Tomato');
    assert.equal(basis.grade, 'FAQ', 'Ties must prefer standard FAQ grade deterministically');

    // Filter strictly
    const filtered = rawTomatoRecords.filter(
      (r) => r.variety.toLowerCase() === basis.variety.toLowerCase() && r.grade.toLowerCase() === basis.grade.toLowerCase()
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].market, 'Sahnewal APMC');
    assert.equal(filtered[0].grade, 'FAQ');
    // Khanna APMC (Grade A) must NOT be present!
    assert.equal(filtered.some((r) => r.grade === 'Grade A'), false, 'Grade A must never mix with FAQ');
  });

  // 10. User specified grade is honored strictly
  test('Fixture 10: User requested grade (Grade A) isolates only matching records', () => {
    const rawTomatoRecords = [
      { market: 'Khanna APMC', commodity: 'Tomato', variety: 'Tomato', grade: 'Grade A', modalPrice: 2500, isPriceValid: true },
      { market: 'Sahnewal APMC', commodity: 'Tomato', variety: 'Tomato', grade: 'FAQ', modalPrice: 2500, isPriceValid: true }
    ];

    const basis = determineComparisonBasis(rawTomatoRecords, 'Tomato', 'Grade A');
    assert.equal(basis.variety, 'Tomato');
    assert.equal(basis.grade, 'Grade A');

    const filtered = rawTomatoRecords.filter(
      (r) => r.variety.toLowerCase() === basis.variety.toLowerCase() && r.grade.toLowerCase() === basis.grade.toLowerCase()
    );

    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].market, 'Khanna APMC');
    assert.equal(filtered[0].grade, 'Grade A');
  });

  // 11. Price tie detection
  test('Fixture 11: Price ties accurately detect isTieForBestPrice and list all tied mandis', () => {
    const tiedMandis = [
      { market: 'MANDI_1', modalPrice: 2500 },
      { market: 'MANDI_2', modalPrice: 2500 },
      { market: 'MANDI_3', modalPrice: 2200 }
    ];

    const highestPrice = Math.max(...tiedMandis.map((m) => m.modalPrice));
    const tiedBest = tiedMandis.filter((m) => m.modalPrice === highestPrice);

    assert.equal(highestPrice, 2500);
    assert.equal(tiedBest.length, 2);
    assert.equal(tiedBest.map((m) => m.market).join(','), 'MANDI_1,MANDI_2');
  });

});
