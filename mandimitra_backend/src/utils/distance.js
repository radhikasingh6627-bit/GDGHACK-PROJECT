/**
 * Haversine Distance Utility for MandiMitra.
 * 
 * IMPORTANT LIMITATION NOTE:
 * This calculates straight-line great-circle distance ("as the crow flies")
 * using Earth's spherical approximation (radius = 6,371 km).
 * It does NOT calculate driving road distance, road conditions, bridge crossings,
 * or traffic time. Actual travel distance by road will be longer.
 * No external proprietary map APIs are used.
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Validates whether latitude and longitude are within acceptable physical geographic bounds.
 * Latitude must be between -90 and 90 degrees.
 * Longitude must be between -180 and 180 degrees.
 * 
 * @param {number|string|null|undefined} lat 
 * @param {number|string|null|undefined} lon 
 * @returns {boolean}
 */
function isValidCoordinates(lat, lon) {
  if (lat === null || lat === undefined || lon === null || lon === undefined) {
    return false;
  }

  // Handle empty strings or boolean values
  if (typeof lat === 'boolean' || typeof lon === 'boolean') {
    return false;
  }
  if (typeof lat === 'string' && lat.trim() === '') {
    return false;
  }
  if (typeof lon === 'string' && lon.trim() === '') {
    return false;
  }

  const numLat = Number(lat);
  const numLon = Number(lon);

  if (isNaN(numLat) || isNaN(numLon)) {
    return false;
  }

  return (
    numLat >= -90 &&
    numLat <= 90 &&
    numLon >= -180 &&
    numLon <= 180
  );
}

/**
 * Calculates straight-line distance in kilometers between two coordinate pairs using the Haversine formula.
 * 
 * @param {number|string} latitude1 
 * @param {number|string} longitude1 
 * @param {number|string} latitude2 
 * @param {number|string} longitude2 
 * @returns {number|null} Distance in kilometers rounded to 2 decimal places, or null if coordinates are missing/invalid.
 */
function calculateDistance(latitude1, longitude1, latitude2, longitude2) {
  if (
    !isValidCoordinates(latitude1, longitude1) ||
    !isValidCoordinates(latitude2, longitude2)
  ) {
    return null;
  }

  const lat1 = Number(latitude1);
  const lon1 = Number(longitude1);
  const lat2 = Number(latitude2);
  const lon2 = Number(longitude2);

  // Exact identical coordinates check
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const toRad = (degree) => (degree * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

module.exports = {
  calculateDistance,
  isValidCoordinates,
  EARTH_RADIUS_KM
};
