const { getGemmaStatus } = require('../config/gemmaConfig');
const gemmaService = require('../services/gemmaService');
const mandiPriceService = require('../services/mandiPriceService');

/**
 * POST /api/query
 * Natural language AI query handler powered by Gemma 4.
 * 
 * Strict Grounding Architecture:
 * 1. Validate incoming question input.
 * 2. Check Gemma 4 configuration status.
 * 3. Extract intent via Gemma 4.
 * 4. Treat AI intent as untrusted input; validate against strict schema.
 * 5. If required fields are missing, return a clarification request.
 * 6. Retrieve real mandi records from verified backend service.
 * 7. Perform all mathematical calculations in deterministic JavaScript.
 * 8. Pass only verified results to Gemma 4 for natural language explanation.
 * 9. Defensive output cleaning: guarantee no <thought> tags or reasoning leak into answer.
 */
async function handleQuery(req, res, next) {
  try {
    const { question } = req.body || {};

    // 1. Validate request body
    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Field "question" is required and must be a non-empty string.'
        }
      });
    }

    const trimmedQuestion = question.trim();

    // 2. Check Gemma 4 provider configuration
    const gemmaStatus = getGemmaStatus();
    if (!gemmaStatus.isConfigured) {
      return res.status(503).json({
        success: false,
        error: {
          code: 'GEMMA_PROVIDER_UNCONFIGURED',
          message: `Gemma 4 provider is not configured. Missing in .env: ${gemmaStatus.missing.join(', ')}`,
          missing: gemmaStatus.missing,
          hint: 'Please configure GEMMA_API_KEY, GEMMA_API_BASE_URL, and GEMMA_MODEL_ID in .env. Non-AI endpoints remain fully functional.'
        }
      });
    }

    // 3. Extract Intent using Gemma 4
    const intentResult = await gemmaService.extractIntent(trimmedQuestion);
    const intent = intentResult.intent;

    // 4. Check if required info is missing (e.g. no commodity identified)
    if (intent.isMissingRequiredInfo || !intent.commodity) {
      return res.status(200).json({
        success: true,
        question: trimmedQuestion,
        intent,
        needsClarification: true,
        answer: intent.clarificationNeeded || 'Kripya batayein aap kis fasal ya commodity ke baare mein janna chahte hain?'
      });
    }

    // 5 & 6. Retrieve real records and calculate numerical results via JavaScript
    let groundedData = null;

    if (intent.operation === 'price_trend') {
      const trendResult = await mandiPriceService.getPriceTrend({
        commodity: intent.commodity,
        district: intent.district,
        state: intent.state,
        days: intent.days || 7
      });

      if (trendResult.status === 'source_unavailable' || trendResult.unconfigured) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'DATA_GOV_UNCONFIGURED',
            message: trendResult.error || trendResult.message,
            hint: 'Set DATA_GOV_API_KEY in .env to ground AI answers with real mandi data.'
          }
        });
      }

      groundedData = trendResult;
    } else if (intent.operation === 'compare_mandis') {
      const compareResult = await mandiPriceService.compareMandis({
        commodity: intent.commodity,
        district: intent.district,
        state: intent.state
      });

      if (compareResult.status === 'source_unavailable' || compareResult.unconfigured) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'DATA_GOV_UNCONFIGURED',
            message: compareResult.error || compareResult.message,
            hint: 'Set DATA_GOV_API_KEY in .env to ground AI answers with real mandi data.'
          }
        });
      }

      groundedData = compareResult;
    } else {
      // Default: latest_price
      const priceResult = await mandiPriceService.getTodayPrices({
        commodity: intent.commodity,
        district: intent.district,
        state: intent.state
      });

      if (priceResult.status === 'unconfigured' || priceResult.unconfigured) {
        return res.status(503).json({
          success: false,
          error: {
            code: 'DATA_GOV_UNCONFIGURED',
            message: priceResult.error,
            hint: 'Set DATA_GOV_API_KEY in .env to ground AI answers with real mandi data.'
          }
        });
      }

      groundedData = priceResult;
    }

    // 7. Generate explanation using Gemma 4 strictly grounded in verified calculation data
    const explanationResult = await gemmaService.generateExplanation({
      question: trimmedQuestion,
      intent,
      calculatedData: groundedData
    });

    // 8. Defensive output cleaning: guarantee no <thought> tags or reasoning leak into answer
    const cleanAnswer = gemmaService.cleanGemmaOutput(explanationResult.explanation, {
      question: trimmedQuestion,
      intent,
      calculatedData: groundedData
    });

    return res.status(200).json({
      success: true,
      question: trimmedQuestion,
      intent,
      groundedData,
      answer: cleanAnswer
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  handleQuery
};
