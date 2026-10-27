const priceService = require("../services/priceService");

/**
 * GET /api/prices/today
 * Query parameters:
 *   - commodity (optional, e.g., 'Wheat')
 *   - district (optional, e.g., 'Lucknow')
 *   - state (optional, e.g., 'Uttar Pradesh')
 *   - limit (optional, e.g., 50)
 *   - offset (optional, e.g., 0)
 */
async function getTodayPrices(req, res, next) {
  try {
    const { commodity, district, state, limit, offset } = req.query;

    const result = await priceService.getTodayPrices({
      commodity,
      district,
      state,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    if (result.status === "unconfigured") {
      return res.status(503).json({
        success: false,
        error: {
          code: "DATA_GOV_UNCONFIGURED",
          message: result.error,
          hint: "Please set DATA_GOV_API_KEY in your .env file to enable live data.gov.in queries.",
        },
      });
    }

    if (result.status === "api_error") {
      return res.status(502).json({
        success: false,
        error: {
          code: "UPSTREAM_API_ERROR",
          message: result.error,
        },
      });
    }

    if (result.status === "no_data") {
      return res.status(200).json({
        success: true,
        status: "no_data",
        count: 0,
        commodity: result.commodity,
        district: result.district,
        state: result.state,
        message:
          result.message ||
          "No mandi price records found matching the requested filters.",
        records: [],
      });
    }

    return res.status(200).json({
      success: true,
      status: "success",
      count: result.count,
      total: result.total,
      commodity: result.commodity,
      district: result.district,
      state: result.state,
      records: result.records,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/prices/trend
 * Query parameters:
 *   - commodity (required, e.g., 'Wheat')
 *   - district (optional, e.g., 'Lucknow')
 *   - state (optional, e.g., 'Uttar Pradesh')
 *   - days (optional, default 7, max 90)
 *   - market (optional)
 *   - variety (optional)
 */
async function getPriceTrend(req, res, next) {
  try {
    const { commodity, district, state, days, market, variety } = req.query;

    const result = await priceService.getPriceTrend({
      commodity,
      district,
      state,
      days,
      market,
      variety,
    });

    // 1. Invalid query parameters
    if (result.status === "invalid_params") {
      return res.status(400).json({
        success: false,
        status: "invalid_params",
        error: {
          code: "INVALID_PARAMETER",
          message: result.error,
        },
      });
    }

    // 2. External source failure or missing credentials
    if (result.status === "source_unavailable") {
      return res.status(503).json({
        success: false,
        status: "source_unavailable",
        message: result.message,
        error: result.error,
        recordsAvailable: 0,
        history: [],
        change: null,
        direction: "unknown",
      });
    }

    // 3. Successful source lookup with no matching records
    if (result.status === "no_data") {
      return res.status(200).json({
        success: true,
        status: "no_data",
        message: result.message,
        recordsAvailable: 0,
        commodity: result.commodity,
        district: result.district,
        history: [],
        calendarSeries: [],
        change: null,
        direction: "unknown",
      });
    }

    // 4. Matching record exists but modal price is unavailable or invalid
    if (result.status === "price_unavailable") {
      return res.status(200).json({
        success: true,
        status: "price_unavailable",
        message: result.message,
        recordsAvailable: result.recordsAvailable,
        commodity: result.commodity,
        district: result.district,
        market: result.market,
        variety: result.variety,
        grade: result.grade,
        history: [],
        calendarSeries: [],
        change: null,
        direction: "unknown",
      });
    }

    // 5. Insufficient data: < 2 valid observations for trend calculation
    if (result.status === "insufficient_data") {
      return res.status(200).json({
        success: true,
        status: "insufficient_data",
        message: result.message,
        recordsAvailable: result.recordsAvailable,
        commodity: result.commodity,
        district: result.district,
        market: result.market,
        variety: result.variety,
        grade: result.grade,
        daysRequested: result.daysRequested,
        observationDates: result.observationDates,
        calendarSeries: result.calendarSeries,
        history: result.history,
        change: null,
        direction: "unknown",
      });
    }

    // 6. Valid trend successfully established
    return res.status(200).json({
      success: true,
      status: "success",
      commodity: result.commodity,
      district: result.district,
      market: result.market,
      variety: result.variety,
      grade: result.grade,
      daysRequested: result.daysRequested,
      recordsAvailable: result.recordsAvailable,
      observationDates: result.observationDates,
      calendarSeries: result.calendarSeries,
      history: result.history,
      change: result.change,
      metrics: result.metrics,
      direction: result.direction,
      directionEnglish: result.directionEnglish,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getTodayPrices,
  getPriceTrend,
};
