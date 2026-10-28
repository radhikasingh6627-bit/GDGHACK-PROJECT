const fs = require("fs");
const path = require("path");

const databasePath = path.join(__dirname, "../data/mandiCoordinates.json");

// District center coordinates dictionary for instant fallback resolution
const DISTRICT_CENTERS = {
  // Uttar Pradesh
  lucknow: { lat: 26.8467, lng: 80.9462 },
  kanpur: { lat: 26.4499, lng: 80.3319 },
  varanasi: { lat: 25.3176, lng: 82.9739 },
  agra: { lat: 27.1767, lng: 78.0081 },
  prayagraj: { lat: 25.4358, lng: 81.8463 },
  bareilly: { lat: 28.3670, lng: 79.4304 },
  aligarh: { lat: 27.8974, lng: 78.0880 },
  meerut: { lat: 28.9845, lng: 77.7064 },
  gorakhpur: { lat: 26.7606, lng: 83.3732 },
  sitapur: { lat: 27.5684, lng: 80.6829 },
  sambhal: { lat: 28.5833, lng: 78.5667 },
  hardoi: { lat: 27.3949, lng: 80.1311 },
  barabanki: { lat: 26.9274, lng: 81.1834 },
  unnao: { lat: 26.5453, lng: 80.4878 },
  ayodhya: { lat: 26.7922, lng: 82.1998 },
  mathura: { lat: 27.4924, lng: 77.6737 },
  jhansi: { lat: 25.4484, lng: 78.5685 },
  moradabad: { lat: 28.8386, lng: 78.7733 },

  // Madhya Pradesh
  datia: { lat: 25.6653, lng: 78.4608 },
  gwalior: { lat: 26.2183, lng: 78.1828 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  indore: { lat: 22.7196, lng: 75.8577 },
  sehore: { lat: 23.2030, lng: 77.0844 },
  khandwa: { lat: 21.8314, lng: 76.3498 },
  katni: { lat: 23.8343, lng: 80.3957 },
  rewa: { lat: 24.5360, lng: 81.3030 },
  satna: { lat: 24.5800, lng: 80.8300 },
  shehdol: { lat: 23.2900, lng: 81.3500 },
  dindori: { lat: 22.9500, lng: 81.0800 },
  mauganj: { lat: 24.6800, lng: 81.8700 },
  seoni: { lat: 22.0859, lng: 79.5516 },
  mandla: { lat: 22.5986, lng: 80.3712 },
  dhar: { lat: 22.5978, lng: 75.2974 },
  sheopur: { lat: 25.6667, lng: 76.7000 },
  dewas: { lat: 22.9676, lng: 76.0534 },
  ujjain: { lat: 23.1765, lng: 75.7885 },
  jabalpur: { lat: 23.1815, lng: 79.9864 },
  vidisha: { lat: 23.5251, lng: 77.8081 },

  // Rajasthan
  kota: { lat: 25.1800, lng: 75.8300 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  jodhpur: { lat: 26.2389, lng: 73.0243 },
  bikaner: { lat: 28.0229, lng: 73.3119 },
  alwar: { lat: 27.5530, lng: 76.6346 },

  // Punjab & Haryana
  ludhiana: { lat: 30.9010, lng: 75.8573 },
  amritsar: { lat: 31.6340, lng: 74.8723 },
  jalandhar: { lat: 31.3260, lng: 75.5762 },
  patiala: { lat: 30.3398, lng: 76.3869 },
  karnal: { lat: 29.6857, lng: 76.9905 },
  ambala: { lat: 30.3782, lng: 76.7767 },

  // West Bengal
  bankura: { lat: 23.2324, lng: 87.0715 },
  kolkata: { lat: 22.5726, lng: 88.3639 },

  // Maharashtra
  nashik: { lat: 19.9975, lng: 73.7898 },
  pune: { lat: 18.5204, lng: 73.8567 },
  nagpur: { lat: 21.1458, lng: 79.0882 },

  // Bihar
  patna: { lat: 25.5941, lng: 85.1376 }
};

let cachedDb = null;
function getDatabase() {
  if (cachedDb) return cachedDb;
  try {
    cachedDb = JSON.parse(fs.readFileSync(databasePath, "utf8"));
  } catch (_) {
    cachedDb = [];
  }
  return cachedDb;
}

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\b(apmc|mandi|market)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getMandiCoordinates(record) {
  if (!record) return null;

  // 1. Direct record coordinates if provided by source
  if (
    Number.isFinite(Number(record.latitude)) &&
    Number.isFinite(Number(record.longitude)) &&
    Number(record.latitude) >= 6 && Number(record.latitude) <= 38 &&
    Number(record.longitude) >= 68 && Number(record.longitude) <= 98
  ) {
    return {
      lat: Number(record.latitude),
      lng: Number(record.longitude),
      accuracy: "mandi",
      source: "data_source",
      verified: true,
    };
  }

  const database = getDatabase();
  const market = normalize(record.market);
  const district = normalize(record.district);
  const state = normalize(record.state);

  // 2. Exact match in verified mandi database
  let match = database.find(
    (item) =>
      normalize(item.market) === market &&
      normalize(item.district) === district &&
      normalize(item.state) === state
  );

  // 3. Match by market name
  if (!match && market) {
    match = database.find((item) => normalize(item.market) === market);
  }

  // 4. Match by district in database
  if (!match && district) {
    match = database.find((item) => normalize(item.district) === district);
  }

  if (match) {
    const lat = Number(match.lat);
    const lng = Number(match.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        lat,
        lng,
        accuracy: match.accuracy || "mandi",
        source: match.source || "verified_database",
        verified: match.verified === true,
      };
    }
  }

  // 5. Fallback to comprehensive district centers dictionary
  const rawDistrictKey = String(record.district || "").toLowerCase().trim();
  const districtCenter = DISTRICT_CENTERS[rawDistrictKey];
  if (districtCenter) {
    return {
      lat: districtCenter.lat,
      lng: districtCenter.lng,
      accuracy: "district",
      source: "district_geocoder",
      verified: true,
    };
  }

  return null;
}

module.exports = { getMandiCoordinates, DISTRICT_CENTERS };
