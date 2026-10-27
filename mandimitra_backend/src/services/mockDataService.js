/**
 * Mock Data Service for MandiMitra Backend
 * Provides realistic Agmarknet Mandi records when DATA_GOV_API_KEY is not yet configured.
 * Automatically bypassed when a valid DATA_GOV_API_KEY is configured in .env.
 */

const COMMODITY_BENCHMARKS = {
  Wheat: { min: 2220, max: 2480, modal: 2350, variety: 'Dara', grade: 'FAQ' },
  'Paddy(Common)': { min: 2180, max: 2400, modal: 2300, variety: 'Common', grade: 'FAQ' },
  Rice: { min: 2800, max: 3400, modal: 3100, variety: 'Medium', grade: 'FAQ' },
  Potato: { min: 1100, max: 1550, modal: 1320, variety: 'Desi', grade: 'FAQ' },
  Tomato: { min: 1250, max: 1850, modal: 1500, variety: 'Hybrid', grade: 'FAQ' },
  Onion: { min: 1900, max: 2650, modal: 2250, variety: 'Nasik / Red', grade: 'FAQ' },
  Mustard: { min: 5100, max: 5650, modal: 5400, variety: 'Black Mustard', grade: 'FAQ' },
  Maize: { min: 1850, max: 2250, modal: 2050, variety: 'Yellow', grade: 'FAQ' },
  Gram: { min: 5700, max: 6350, modal: 6050, variety: 'Desi Chana', grade: 'FAQ' },
  'Green Chilli': { min: 2800, max: 3900, modal: 3350, variety: 'Green', grade: 'FAQ' },
  Garlic: { min: 7500, max: 11000, modal: 9200, variety: 'Desi', grade: 'FAQ' },
  'Ginger(Green)': { min: 4200, max: 5800, modal: 4900, variety: 'Green', grade: 'FAQ' },
  Cotton: { min: 6600, max: 7450, modal: 7100, variety: 'Medium Staple', grade: 'FAQ' },
  Apple: { min: 6000, max: 9500, modal: 7800, variety: 'Delicious', grade: 'FAQ' },
  Banana: { min: 1400, max: 2200, modal: 1800, variety: 'Robusta', grade: 'FAQ' }
};

const SAMPLE_MANDIS = [
  { state: 'Uttar Pradesh', district: 'Lucknow', market: 'Lucknow (Dubagga)', lat: 26.8682, lng: 80.8715 },
  { state: 'Uttar Pradesh', district: 'Lucknow', market: 'Lucknow (Sitapur Road)', lat: 26.9150, lng: 80.9380 },
  { state: 'Uttar Pradesh', district: 'Kanpur', market: 'Kanpur (Chaubepur)', lat: 26.6214, lng: 80.1706 },
  { state: 'Uttar Pradesh', district: 'Kanpur', market: 'Kanpur (Govind Nagar)', lat: 26.4420, lng: 80.3120 },
  { state: 'Uttar Pradesh', district: 'Varanasi', market: 'Varanasi (Visheshwarganj)', lat: 25.3260, lng: 83.0130 },
  { state: 'Uttar Pradesh', district: 'Agra', market: 'Agra (Fatehabad Road)', lat: 27.1650, lng: 78.0450 },
  { state: 'Madhya Pradesh', district: 'Bhopal', market: 'Bhopal (Karond Mandi)', lat: 23.3050, lng: 77.4120 },
  { state: 'Madhya Pradesh', district: 'Indore', market: 'Indore (Choithram Mandi)', lat: 22.6850, lng: 75.8450 },
  { state: 'Punjab', district: 'Ludhiana', market: 'Ludhiana (New Grain Market)', lat: 30.9010, lng: 75.8573 },
  { state: 'Punjab', district: 'Amritsar', market: 'Amritsar (Bhagtanwala)', lat: 31.6200, lng: 74.8700 },
  { state: 'Haryana', district: 'Karnal', market: 'Karnal (New Grain Market)', lat: 29.6857, lng: 76.9905 },
  { state: 'Rajasthan', district: 'Jaipur', market: 'Jaipur (Muhana Mandi)', lat: 26.8120, lng: 75.7680 },
  { state: 'Maharashtra', district: 'Nashik', market: 'Nashik (Lasalgaon APMC)', lat: 20.1470, lng: 74.2250 },
  { state: 'Bihar', district: 'Patna', market: 'Patna (Mithapur)', lat: 25.5941, lng: 85.1376 }
];

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function generateMockRecords(filters = {}) {
  const reqCommodity = filters.commodity ? filters.commodity.trim() : 'Wheat';
  const reqDistrict = filters.district ? filters.district.trim() : null;
  const reqState = filters.state ? filters.state.trim() : null;

  let matchedMandis = [];
  if (reqDistrict) {
    matchedMandis = SAMPLE_MANDIS.filter(
      (m) => m.district.toLowerCase() === reqDistrict.toLowerCase()
    );
  }
  if (matchedMandis.length === 0 && reqState) {
    matchedMandis = SAMPLE_MANDIS.filter(
      (m) => m.state.toLowerCase() === reqState.toLowerCase()
    );
  }
  if (matchedMandis.length === 0) {
    // Generate dynamic mandi for requested district/state so any chosen district works
    matchedMandis = [
      {
        state: reqState || 'Uttar Pradesh',
        district: reqDistrict || 'Lucknow',
        market: `${reqDistrict || 'City'} (APMC Mandi)`,
        lat: 26.85,
        lng: 80.94
      }
    ];
  }

  const benchmark = COMMODITY_BENCHMARKS[reqCommodity] || {
    min: 2100,
    max: 2700,
    modal: 2400,
    variety: 'Desi / Hybrid',
    grade: 'FAQ'
  };

  const records = [];
  const today = new Date();
  const daysToGenerate = filters.days ? parseInt(filters.days, 10) : 7;

  matchedMandis.forEach((mandi, mIndex) => {
    const mandiOffset = (mIndex % 3 - 1) * 35;

    for (let dayOffset = 0; dayOffset < daysToGenerate; dayOffset++) {
      const obsDate = new Date(today);
      obsDate.setDate(today.getDate() - dayOffset);

      // Realistic progressive price drift (e.g. rising/fluctuating trend over time)
      const dailyDrift = Math.round(
        (daysToGenerate - dayOffset) * 14 + Math.sin((dayOffset + mIndex) * 1.5) * 25
      );

      const modalPrice = Math.max(100, benchmark.modal + mandiOffset + dailyDrift);
      const minPrice = Math.round(modalPrice * 0.93);
      const maxPrice = Math.round(modalPrice * 1.07);

      records.push({
        state: mandi.state,
        district: mandi.district,
        market: mandi.market,
        commodity: reqCommodity,
        variety: benchmark.variety,
        grade: benchmark.grade,
        date: formatDate(obsDate),
        arrivalDate: formatDate(obsDate),
        minPrice,
        maxPrice,
        modalPrice,
        isPriceValid: true,
        priceError: null,
        latitude: mandi.lat,
        longitude: mandi.lng
      });
    }
  });

  return records;
}

function getMockPrices(filters = {}) {
  const allRecords = generateMockRecords(filters);

  // If requested specifically for today's price table
  if (filters.forTodayOnly) {
    const todayStr = formatDate(new Date());
    let todayRecords = allRecords.filter((r) => r.date === todayStr);
    if (todayRecords.length === 0) {
      todayRecords = allRecords.slice(0, 5);
    }

    return {
      success: true,
      total: todayRecords.length,
      count: todayRecords.length,
      commodity: filters.commodity || null,
      district: filters.district || null,
      state: filters.state || null,
      records: todayRecords,
      isMockData: true
    };
  }

  // Multi-day history for price trends and comparisons
  return {
    success: true,
    total: allRecords.length,
    count: allRecords.length,
    commodity: filters.commodity || null,
    district: filters.district || null,
    state: filters.state || null,
    records: allRecords,
    isMockData: true
  };
}

module.exports = {
  getMockPrices,
  generateMockRecords
};
