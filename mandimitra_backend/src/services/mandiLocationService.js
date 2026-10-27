
const CACHE = new Map();

function normalize(value = "") {
  return value
    .toLowerCase()
    .replace(/\b(apmc|mandi|market|agricultural produce market committee)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let lastRequestAt = 0;

async function searchPlace(query) {
  const delay = Math.max(0, 1100 - (Date.now() - lastRequestAt));
  if (delay > 0) await wait(delay);

  lastRequestAt = Date.now();

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "in");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "MandiDarpan/1.0 (hackathon project)",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Nominatim returned HTTP ${response.status}`);
  }

  return response.json();
}

async function getMandiLocation(market, district, state) {
  const key = `${market}|${district}|${state}`.toLowerCase();

  if (CACHE.has(key)) return CACHE.get(key);

  const marketName = normalize(market);
  const districtName = normalize(district);
  const stateName = normalize(state);

  // Try the official market name first, then a common town-name variant.
const queries = [
  [market, district, state, "India"].filter(Boolean).join(", "),
  ["Bahjoi", district, state, "India"].filter(Boolean).join(", "),
  [market, state, "India"].filter(Boolean).join(", "),
];

  const seenQueries = new Set();
  let lastError = null;

  try {
    for (const query of queries) {
      if (seenQueries.has(query)) continue;
      seenQueries.add(query);

      const results = await searchPlace(query);

      for (const place of results) {
        const address = place.address || {};
        const display = normalize(place.display_name || "");
        const placeName = normalize(place.name || "");
        const districtMatch =
          !districtName ||
          normalize(address.state_district || address.county || "").includes(
            districtName
          ) ||
          display.includes(districtName);

        const stateMatch =
          !stateName ||
          normalize(address.state || "").includes(stateName) ||
          display.includes(stateName);

        if (!districtMatch || !stateMatch) continue;

        const lat = Number(place.lat);
        const lng = Number(place.lon);

        if (
          !Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          lat < 6 ||
          lat > 38 ||
          lng < 68 ||
          lng > 98
        ) {
          continue;
        }

        // Accept an exact market-name match, or a matching town name.
        const nameMatch =
          placeName.includes(marketName) ||
          marketName.includes(placeName) ||
          display.includes(marketName);

        const townName = normalize(
          marketName.replace(/\b(apmc|market|mandi)\b/g, "").trim()
        );

        const townMatch =
          townName.length >= 3 &&
          (placeName.includes(townName) || display.includes(townName));

        if (!nameMatch && !townMatch) continue;

        const location = {
          lat,
          lng,
          displayName: place.display_name,
          source: "OpenStreetMap",
          locationAccuracy:
            place.category === "place" &&
            ["city", "town", "village", "hamlet"].includes(place.type)
              ? "town"
              : "unverified",
        };

        CACHE.set(key, location);
        return location;
      }
    }

    CACHE.set(key, null);
    return null;
  } catch (error) {
    lastError = error;
    console.error("Mandi location lookup failed:", lastError.message);
    return null;
  }
}

module.exports = { getMandiLocation };
