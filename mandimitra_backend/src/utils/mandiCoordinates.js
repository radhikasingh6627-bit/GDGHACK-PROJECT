
const fs = require("fs");
const path = require("path");

const databasePath = path.join(
  __dirname,
  "../data/mandiCoordinates.json"
);

function normalize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/\b(apmc|mandi|market)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getMandiCoordinates(record) {
  const database = JSON.parse(
    fs.readFileSync(databasePath, "utf8")
  );

  const market = normalize(record.market);
  const district = normalize(record.district);
  const state = normalize(record.state);

  const match = database.find((item) =>
    normalize(item.market) === market &&
    normalize(item.district) === district &&
    normalize(item.state) === state
  );

  if (!match) return null;

  const lat = Number(match.lat);
  const lng = Number(match.lng);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < 6 || lat > 38 ||
    lng < 68 || lng > 98
  ) {
    return null;
  }

  return {
    lat,
    lng,
    accuracy: match.accuracy || "unverified",
    source: match.source || "unknown",
    verified: match.verified === true
  };
}

module.exports = { getMandiCoordinates };
