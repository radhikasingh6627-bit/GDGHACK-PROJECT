const mandiService = require('../services/mandiService');

/**
 * GET /api/mandis/compare
 * Query parameters:
 *   - commodity (required, e.g. 'Wheat')
 *   - district (optional, e.g. 'Lucknow')
 *   - state (optional, e.g. 'Uttar Pradesh')
 *   - latitude / lat (optional farmer latitude, e.g. 26.85)
 *   - longitude / lng (optional farmer longitude, e.g. 80.95)
 *   - sortBy (optional: 'price' [default] or 'distance')
 *   - variety (optional)
 *   - grade (optional)
 */
async function compareMandis(req, res, next) {
  try {
    const {
      commodity,
      district,
      state,
      latitude,
      longitude,
      lat,
      lng,
      sortBy,
      variety,
      grade
    } = req.query;

    const result = await mandiService.compareMandis({
      commodity,
      district,
      state,
      latitude,
      longitude,
      lat,
      lng,
      sortBy,
      variety,
      grade
    });

    if (result.status === 'invalid_params') {
      return res.status(400).json({
        success: false,
        status: 'invalid_params',
        error: {
          code: result.code || 'INVALID_PARAMETER',
          message: result.error
        }
      });
    }

    if (result.status === 'source_unavailable') {
      return res.status(503).json({
        success: false,
        status: 'source_unavailable',
        message: result.message,
        error: result.error,
        mandis: []
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  compareMandis
};
