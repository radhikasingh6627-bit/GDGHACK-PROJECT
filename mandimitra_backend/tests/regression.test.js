/**
 * MandiMitra Backend — Automated Regression Test Suite
 * Tests all endpoints, live data.gov upstream filtering, edge cases, error handling, calculations, and AI rules.
 */

const app = require('../app');
const { calculatePriceTrend } = require('../src/utils/trendCalculator');
const { calculateHaversineDistance } = require('../src/utils/geoUtils');
const { heuristicExtractIntent, validateAndSanitizeIntent } = require('../src/services/gemmaService');
const { recordMatchesFilters } = require('../src/services/priceService');

let server;
const PORT = 5097;
const BASE_URL = `http://localhost:${PORT}`;

async function runTests() {
  console.log('========================================================');
  console.log('  MANDIMITRA BACKEND — COMPREHENSIVE REGRESSION TESTS  ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function report(name, condition, details = '') {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${name} ${details}`);
      failed++;
    }
  }

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, resolve);
  });

  try {
    // ----------------------------------------------------
    // TEST 1: GET /api/health
    // ----------------------------------------------------
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    report(
      'GET /api/health returns HTTP 200 with ok status',
      healthRes.status === 200 && healthData.status === 'ok'
    );

    // ----------------------------------------------------
    // TEST 2: GET /api/prices/today?commodity=Wheat&district=Lucknow (Genuinely no data today)
    // ----------------------------------------------------
    const wheatLucknowRes = await fetch(`${BASE_URL}/api/prices/today?commodity=Wheat&district=Lucknow`);
    const wheatLucknowData = await wheatLucknowRes.json();
    report(
      'GET /api/prices/today (Wheat in Lucknow) returns status: "no_data" with count 0 (does NOT return generic records)',
      wheatLucknowRes.status === 200 &&
        wheatLucknowData.status === 'no_data' &&
        wheatLucknowData.count === 0 &&
        Array.isArray(wheatLucknowData.records) &&
        wheatLucknowData.records.length === 0,
      JSON.stringify(wheatLucknowData)
    );

    // ----------------------------------------------------
    // TEST 3: GET /api/prices/today?commodity=Paddy(Common)&district=Lucknow (Has live data today)
    // ----------------------------------------------------
    const paddyLucknowRes = await fetch(`${BASE_URL}/api/prices/today?commodity=Paddy(Common)&district=Lucknow`);
    const paddyLucknowData = await paddyLucknowRes.json();
    const paddyMatches =
      paddyLucknowData.records &&
      paddyLucknowData.records.length > 0 &&
      paddyLucknowData.records.every(
        (r) => r.district.toLowerCase() === 'lucknow' && r.commodity.toLowerCase().includes('paddy')
      );
    report(
      'GET /api/prices/today (Paddy in Lucknow) returns status: "success" and verified matching records',
      paddyLucknowRes.status === 200 &&
        paddyLucknowData.status === 'success' &&
        paddyLucknowData.count > 0 &&
        paddyMatches,
      JSON.stringify(paddyLucknowData)
    );

    // ----------------------------------------------------
    // TEST 4: GET /api/prices/today?commodity=Wheat&state=Uttar+Pradesh (UP state filter)
    // ----------------------------------------------------
    const wheatUpRes = await fetch(`${BASE_URL}/api/prices/today?commodity=Wheat&state=Uttar+Pradesh&limit=10`);
    const wheatUpData = await wheatUpRes.json();
    const wheatMatches =
      wheatUpData.records &&
      wheatUpData.records.length > 0 &&
      wheatUpData.records.every((r) => r.commodity.toLowerCase() === 'wheat');
    report(
      'GET /api/prices/today (Wheat in UP) applies upstream filters and returns verified matching records',
      wheatUpRes.status === 200 && wheatUpData.status === 'success' && wheatMatches
    );

    // ----------------------------------------------------
    // TEST 5: Record filter verification helper
    // ----------------------------------------------------
    const testRec1 = { commodity: 'Wheat', district: 'Lucknow', state: 'Uttar Pradesh' };
    const testRec2 = { commodity: 'Paddy', district: 'Kanpur', state: 'Uttar Pradesh' };
    report(
      'recordMatchesFilters validates case-insensitively and rejects mismatched records',
      recordMatchesFilters(testRec1, { commodity: 'wheat', district: 'lucknow' }) === true &&
        recordMatchesFilters(testRec2, { commodity: 'wheat', district: 'lucknow' }) === false
    );

    // ----------------------------------------------------
    // TEST 6: GET /api/prices/trend missing commodity parameter
    // ----------------------------------------------------
    const trendMissingRes = await fetch(`${BASE_URL}/api/prices/trend`);
    const trendMissingData = await trendMissingRes.json();
    report(
      'GET /api/prices/trend validates missing commodity (HTTP 400)',
      trendMissingRes.status === 400 && trendMissingData.error.code === 'INVALID_PARAMETER'
    );

    // ----------------------------------------------------
    // TEST 7: GET /api/prices/trend invalid days parameter
    // ----------------------------------------------------
    const trendBadDaysRes = await fetch(`${BASE_URL}/api/prices/trend?commodity=Wheat&days=-5`);
    const trendBadDaysData = await trendBadDaysRes.json();
    report(
      'GET /api/prices/trend validates invalid days parameter (HTTP 400)',
      trendBadDaysRes.status === 400 && trendBadDaysData.error.code === 'INVALID_PARAMETER'
    );

    // ----------------------------------------------------
    // TEST 7B: GET /api/prices/trend (Wheat in Lucknow) returns no_data
    // ----------------------------------------------------
    const trendLucknowRes = await fetch(`${BASE_URL}/api/prices/trend?commodity=Wheat&district=Lucknow&days=7`);
    const trendLucknowData = await trendLucknowRes.json();
    report(
      'GET /api/prices/trend (Wheat in Lucknow) returns status: "no_data"',
      trendLucknowRes.status === 200 && trendLucknowData.status === 'no_data'
    );

    // ----------------------------------------------------
    // TEST 8: GET /api/mandis/compare missing commodity parameter
    // ----------------------------------------------------
    const mandiMissingRes = await fetch(`${BASE_URL}/api/mandis/compare`);
    const mandiMissingData = await mandiMissingRes.json();
    report(
      'GET /api/mandis/compare validates missing commodity (HTTP 400)',
      mandiMissingRes.status === 400 && mandiMissingData.error.code === 'MISSING_REQUIRED_PARAMETER'
    );

    // ----------------------------------------------------
    // TEST 9: GET /api/mandis/compare invalid coordinates
    // ----------------------------------------------------
    const mandiCoordsRes = await fetch(`${BASE_URL}/api/mandis/compare?commodity=Wheat&lat=120&lng=200`);
    const mandiCoordsData = await mandiCoordsRes.json();
    report(
      'GET /api/mandis/compare validates invalid coordinates (HTTP 400)',
      mandiCoordsRes.status === 400 && mandiCoordsData.error.code === 'INVALID_COORDINATES'
    );

    // ----------------------------------------------------
    // TEST 10: POST /api/query invalid or empty request body
    // ----------------------------------------------------
    const queryEmptyRes = await fetch(`${BASE_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const queryEmptyData = await queryEmptyRes.json();
    report(
      'POST /api/query rejects empty question body (HTTP 400)',
      queryEmptyRes.status === 400 && queryEmptyData.error.code === 'INVALID_REQUEST'
    );

    // ----------------------------------------------------
    // TEST 11: POST /api/query valid grounded response (and verify no <thought> tags)
    // ----------------------------------------------------
    const queryRes = await fetch(`${BASE_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'Lucknow mein gehun ka bhav badha ya ghata?' })
    });
    const queryData = await queryRes.json();
    if (queryRes.status === 200) {
      report(
        'POST /api/query returns grounded answer without internal <thought> tags',
        queryData.success === true &&
          typeof queryData.answer === 'string' &&
          !queryData.answer.includes('<thought>') &&
          !queryData.answer.includes('</thought>') &&
          !queryData.answer.includes('<think>') &&
          queryData.groundedData !== undefined
      );
    } else {
      report(
        'POST /api/query reports unconfigured Gemma 4 provider (HTTP 503)',
        queryRes.status === 503 &&
          queryData.error &&
          queryData.error.code === 'GEMMA_PROVIDER_UNCONFIGURED'
      );
    }

    // ----------------------------------------------------
    // TEST 12: 404 Route Handler
    // ----------------------------------------------------
    const notFoundRes = await fetch(`${BASE_URL}/api/unknown-route`);
    const notFoundData = await notFoundRes.json();
    report(
      'Undefined route returns 404 JSON',
      notFoundRes.status === 404 && notFoundData.success === false
    );

    // ----------------------------------------------------
    // TEST 13: Trend Calculator — Insufficient History Handling
    // ----------------------------------------------------
    const emptyTrend = calculatePriceTrend([]);
    const singleTrend = calculatePriceTrend([{ price: 2400, date: '2026-10-20' }]);
    report(
      'calculatePriceTrend correctly flags insufficient history (<2 observations)',
      emptyTrend.insufficientHistory === true &&
        singleTrend.insufficientHistory === true &&
        singleTrend.dataPoints === 1
    );

    // ----------------------------------------------------
    // TEST 14: Trend Calculator — Deterministic JavaScript Math
    // ----------------------------------------------------
    const records = [
      { price: 2000, date: '2026-10-15' },
      { price: 2100, date: '2026-10-17' },
      { price: 2200, date: '2026-10-21' }
    ];
    const calcTrend = calculatePriceTrend(records);
    report(
      'calculatePriceTrend correctly calculates priceChange, percentChange, and direction',
      calcTrend.priceChange === 200 &&
        calcTrend.percentChange === 10 &&
        calcTrend.direction === 'badha' &&
        calcTrend.minPrice === 2000 &&
        calcTrend.maxPrice === 2200 &&
        calcTrend.avgPrice === 2100
    );

    // ----------------------------------------------------
    // TEST 15: Geo Utils — Haversine Distance Calculation
    // ----------------------------------------------------
    const dist = calculateHaversineDistance(26.8467, 80.9462, 26.4499, 80.3319);
    const invalidDist = calculateHaversineDistance(null, null, 26.4499, 80.3319);
    report(
      'calculateHaversineDistance computes accurate straight-line km and handles invalid coords',
      dist > 70 && dist < 85 && invalidDist === null
    );

    // ----------------------------------------------------
    // TEST 16: Gemma Service — Intent Extraction & Crop Translation (Hinglish -> English)
    // ----------------------------------------------------
    const extracted = heuristicExtractIntent('Lucknow mein gehun ka bhav badha ya ghata?');
    report(
      'Intent extraction maps Hinglish crop "gehun" -> "Wheat" and identifies "price_trend"',
      extracted.commodity === 'Wheat' &&
        extracted.district === 'Lucknow' &&
        extracted.operation === 'price_trend'
    );

    // ----------------------------------------------------
    // TEST 17: Gemma Service — Untrusted Input Sanitization
    // ----------------------------------------------------
    const maliciousIntent = {
      operation: 'delete_database',
      commodity: 'Wheat',
      days: -100
    };
    const sanitized = validateAndSanitizeIntent(maliciousIntent, extracted);
    report(
      'validateAndSanitizeIntent rejects disallowed operations and invalid numerical ranges',
      sanitized.operation === 'price_trend' && sanitized.days === 7
    );

  } catch (err) {
    console.error('Fatal error during test run:', err);
    failed++;
  } finally {
    server.close();
  }

  console.log('\n========================================================');
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
