const { calculateDistance, isValidCoordinates, EARTH_RADIUS_KM } = require('./distance');

module.exports = {
  isValidCoordinates,
  calculateHaversineDistance: calculateDistance,
  calculateDistance,
  EARTH_RADIUS_KM
};
