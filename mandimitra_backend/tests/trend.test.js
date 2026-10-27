/**
 * Automated tests for price trend calculations and missing data safeguards.
 * Uses Node.js's built-in `node:test` and `node:assert` modules.
 * 
 * All test fixtures use clearly labelled SYNTHETIC data to test logic in isolation.
 * Synthetic test values never appear in real API production output.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { calculateTrend, validateTrendParams } = require('../src/services/trendService');
const { normalizeRecord, validatePriceRecord, parseStandardDate } = require('../src/utils/normalizeData');

describe('Part 3 Trend Logic — Synthetic Test Fixtures', () => {

  // 1. One observation only
  test('Fixture 1: One observation only returns insufficient_data', () => {
    const syntheticSingleObs = [
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-21',
        minPrice: 2000,
        maxPrice: 2200,
        modalPrice: 2100
      }
    ];

    const result = calculateTrend(syntheticSingleObs, { commodity: 'Wheat', days: 7 });

    assert.equal(result.status, 'insufficient_data');
    assert.equal(result.recordsAvailable, 1);
    assert.equal(result.change, null);
    assert.equal(result.direction, 'unknown');
    assert.match(result.message, /Not enough reported prices/);
  });

  // 2. Two observations with price increase
  test('Fixture 2: Two observations with price increase calculates positive change and direction badha', () => {
    const syntheticIncrease = [
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-18',
        minPrice: 2000,
        maxPrice: 2000,
        modalPrice: 2000
      },
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-21',
        minPrice: 2200,
        maxPrice: 2200,
        modalPrice: 2200
      }
    ];

    const result = calculateTrend(syntheticIncrease, { commodity: 'Wheat', days: 7 });

    assert.equal(result.status, 'success');
    assert.equal(result.recordsAvailable, 2);
    assert.ok(result.change !== null);
    assert.equal(result.change.absolute, 200);
    assert.equal(result.change.percentage, 10);
    assert.equal(result.direction, 'badha');
    assert.equal(result.directionEnglish, 'rising');
    assert.deepEqual(result.observationDates, ['2026-10-18', '2026-10-21']);
  });

  // 3. Two observations with price decrease
  test('Fixture 3: Two observations with price decrease calculates negative change and direction ghata', () => {
    const syntheticDecrease = [
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-18',
        minPrice: 2500,
        maxPrice: 2500,
        modalPrice: 2500
      },
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-21',
        minPrice: 2300,
        maxPrice: 2300,
        modalPrice: 2300
      }
    ];

    const result = calculateTrend(syntheticDecrease, { commodity: 'Wheat', days: 7 });

    assert.equal(result.status, 'success');
    assert.equal(result.change.absolute, -200);
    assert.equal(result.change.percentage, -8);
    assert.equal(result.direction, 'ghata');
    assert.equal(result.directionEnglish, 'falling');
  });

  // 4. Equal prices
  test('Fixture 4: Equal prices calculates 0 change and direction sthir', () => {
    const syntheticEqual = [
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-19',
        minPrice: 2400,
        maxPrice: 2400,
        modalPrice: 2400
      },
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-21',
        minPrice: 2400,
        maxPrice: 2400,
        modalPrice: 2400
      }
    ];

    const result = calculateTrend(syntheticEqual, { commodity: 'Wheat', days: 7 });

    assert.equal(result.status, 'success');
    assert.equal(result.change.absolute, 0);
    assert.equal(result.change.percentage, 0);
    assert.equal(result.direction, 'sthir');
    assert.equal(result.directionEnglish, 'stable');
  });

  // 5. Missing calendar date represented as null without interpolation
  test('Fixture 5: Missing calendar dates are represented as null and never interpolated', () => {
    const syntheticGapped = [
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-19',
        minPrice: 2000,
        maxPrice: 2000,
        modalPrice: 2000
      },
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        date: '2026-10-21',
        minPrice: 2100,
        maxPrice: 2100,
        modalPrice: 2100
      }
    ];

    const result = calculateTrend(syntheticGapped, { commodity: 'Wheat', days: 3 });

    // For days: 3 ending on 2026-10-21, dates are 2026-10-19, 2026-10-20, 2026-10-21
    assert.equal(result.calendarSeries.length, 3);
    const day19 = result.calendarSeries.find((c) => c.date === '2026-10-19');
    const day20 = result.calendarSeries.find((c) => c.date === '2026-10-20');
    const day21 = result.calendarSeries.find((c) => c.date === '2026-10-21');

    assert.equal(day19.price, 2000);
    assert.equal(day20.price, null, 'Unreported date 2026-10-20 must be strictly null, never interpolated');
    assert.equal(day21.price, 2100);
  });

  // 6. Record with missing modal price
  test('Fixture 6: Record with missing modal price preserves null and returns price_unavailable', () => {
    const syntheticMissingPrice = [
      {
        market: 'SYNTHETIC_MARKET_A',
        variety: 'SYNTHETIC_VAR_1',
        grade: 'FAQ',
        arrival_date: '21/10/2026',
        min_price: 2000,
        max_price: 2200,
        modal_price: null // Missing!
      }
    ];

    const result = calculateTrend(syntheticMissingPrice, { commodity: 'Wheat', days: 7 });

    assert.equal(result.status, 'price_unavailable');
    assert.equal(result.change, null);
    assert.equal(result.recordsAvailable, 1);
  });

  // 7. Inconsistent min/max/modal prices
  test('Fixture 7: Inconsistent price bounds (min > max or modal < min) are rejected', () => {
    // minPrice is 3000, but maxPrice is 2000 (inconsistent!)
    const invalidBounds = validatePriceRecord(3000, 2000, 2500);
    assert.equal(invalidBounds.isValid, false);
    assert.match(invalidBounds.error, /Inconsistent price bounds/);

    // modalPrice is 1500, but minPrice is 2000 (inconsistent!)
    const invalidModal = validatePriceRecord(2000, 3000, 1500);
    assert.equal(invalidModal.isValid, false);
    assert.match(invalidModal.error, /modalPrice is lower than reported minPrice/);

    // modalPrice is 3500, but maxPrice is 3000 (inconsistent!)
    const invalidModalHigh = validatePriceRecord(2000, 3000, 3500);
    assert.equal(invalidModalHigh.isValid, false);
    assert.match(invalidModalHigh.error, /modalPrice is higher than reported maxPrice/);
  });

  // 8. Strict isolation of market/variety series
  test('Fixture 8: Different markets and varieties are never mixed into one trend calculation', () => {
    const syntheticMixed = [
      {
        market: 'MARKET_ALPHA',
        variety: 'Dara',
        grade: 'FAQ',
        date: '2026-10-18',
        minPrice: 2000,
        maxPrice: 2000,
        modalPrice: 2000
      },
      {
        market: 'MARKET_BETA', // Different market!
        variety: 'Deshi',      // Different variety!
        grade: 'FAQ',
        date: '2026-10-21',
        minPrice: 3000,
        maxPrice: 3000,
        modalPrice: 3000
      }
    ];

    // Each market/variety only has 1 record, so neither should combine with the other to falsely claim a trend!
    const result = calculateTrend(syntheticMixed, { commodity: 'Wheat', days: 7 });

    assert.equal(result.status, 'insufficient_data');
    assert.equal(result.recordsAvailable, 1, 'Only records for the single chosen series must be counted');
    assert.equal(result.change, null);
  });

  // 9. Date parsing test for DD/MM/YYYY
  test('Fixture 9: Parses Indian DD/MM/YYYY arrival dates safely to YYYY-MM-DD', () => {
    assert.equal(parseStandardDate('21/10/2026'), '2026-10-21');
    assert.equal(parseStandardDate('05-04-2026'), '2026-04-05');
    assert.equal(parseStandardDate('2026-10-21'), '2026-10-21');
    assert.equal(parseStandardDate('invalid-date'), null);
    assert.equal(parseStandardDate(null), null);
  });

  // 10. Parameter validation
  test('Fixture 10: Validates days limit and commodity presence', () => {
    assert.equal(validateTrendParams({ commodity: '' }).isValid, false);
    assert.equal(validateTrendParams({ commodity: 'Wheat', days: 1 }).isValid, false);
    assert.equal(validateTrendParams({ commodity: 'Wheat', days: 100 }).isValid, false);
    assert.equal(validateTrendParams({ commodity: 'Wheat', days: 7 }).isValid, true);
  });

});
