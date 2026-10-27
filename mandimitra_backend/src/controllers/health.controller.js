/**
 * Health check controller
 * Confirms that the MandiMitra backend server is alive and functioning.
 * Operates independently of third-party API keys or external services.
 */
function getHealth(req, res) {
  res.status(200).json({
    status: 'ok',
    message: 'MandiMitra backend is operational',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  getHealth
};
