const { getGemmaStatus, apiKey, baseUrl, modelId } = require('../config/gemmaConfig');

const ALLOWED_OPERATIONS = ['latest_price', 'price_trend', 'compare_mandis'];

// Common Hindi/Hinglish crop names mapped to standard Agmarknet English names
const HINDI_COMMODITY_MAP = {
  gehun: 'Wheat',
  gehu: 'Wheat',
  kanak: 'Wheat',
  pyaz: 'Onion',
  pyaaz: 'Onion',
  kanda: 'Onion',
  tamatar: 'Tomato',
  aloo: 'Potato',
  alu: 'Potato',
  chawal: 'Rice',
  dhan: 'Paddy(Dhan)',
  sarson: 'Mustard',
  chana: 'Gram',
  makka: 'Maize',
  makki: 'Maize',
  lahsun: 'Garlic',
  adrak: 'Ginger',
  mirch: 'Chilli'
};

/**
 * Executes an HTTP inference call to the Gemma 4 provider.
 * Protects credentials and never leaks them in error responses.
 */
async function callGemmaInference(messages, temperature = 0.1, maxTokens = 1000) {
  const status = getGemmaStatus();
  if (!status.isConfigured) {
    return {
      success: false,
      unconfigured: true,
      missing: status.missing,
      error: `Gemma 4 provider is not configured. Missing in .env: ${status.missing.join(', ')}`
    };
  }

  let endpoint = baseUrl.trim();
  if (!endpoint.endsWith('/chat/completions')) {
    endpoint = endpoint.replace(/\/+$/, '') + '/chat/completions';
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: modelId.trim(),
        messages,
        temperature,
        max_tokens: maxTokens
      })
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        status: response.status,
        error: `Gemma provider returned status ${response.status}. ${errText ? 'Provider message: ' + errText.slice(0, 200) : ''}`
      };
    }

    const data = await response.json();
    const content =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;

    if (!content) {
      return {
        success: false,
        error: 'Gemma provider returned an empty response or unexpected structure.'
      };
    }

    return {
      success: true,
      content: content.trim()
    };
  } catch (err) {
    return {
      success: false,
      error: `Network error connecting to Gemma provider: ${err.message}`
    };
  }
}

/**
 * Generates a deterministic, strictly grounded fallback answer when the model
 * produces no usable answer or only output internal reasoning tags.
 * 
 * @param {object} context { calculatedData, intent }
 * @returns {string} 1-2 sentence friendly grounded answer
 */
function generateDeterministicFallback(context = {}) {
  const { calculatedData = {}, intent = {} } = context;
  const commodity = intent.commodity || 'is fasal';
  const district = intent.district ? `${intent.district} mein` : '';

  // 1. No data case
  if (calculatedData.status === 'no_data' || (Array.isArray(calculatedData.records) && calculatedData.records.length === 0)) {
    return `Maaf kijiye, ${district ? district + ' ' : ''}${commodity} ke mandi bhav ka koi record nahi mila hai, isliye bhav ya trend nirdharit nahi kiya ja sakta.`;
  }

  // 2. Insufficient data case (< 2 observations for trend)
  if (calculatedData.status === 'insufficient_data') {
    return `${district ? district + ' ' : ''}${commodity} ke pichhle dinon ka paryapt data uplabdh nahi hai, isliye trend nikalna sambhav nahi hai.`;
  }

  // 3. Price unavailable case
  if (calculatedData.status === 'price_unavailable') {
    return `${district ? district + ' ' : ''}${commodity} ke mandi records mile hain, lekin modal bhav uplabdh nahi hai.`;
  }

  // 4. Trend success case
  if (calculatedData.change && calculatedData.change.latestPrice !== undefined) {
    const dirHindi = calculatedData.direction === 'badha'
      ? 'badha'
      : (calculatedData.direction === 'ghata' ? 'ghata' : 'sthir raha');
    return `${district ? district + ' ' : ''}${commodity} ka bhav pichhle dinon mein ${dirHindi} hai. Latest modal bhav ₹${calculatedData.change.latestPrice} prati quintal hai.`;
  }

  // 5. Latest price success case
  if (Array.isArray(calculatedData.records) && calculatedData.records.length > 0 && calculatedData.records[0].modalPrice) {
    const top = calculatedData.records[0];
    return `${top.market} mein ${commodity} ka latest modal bhav ₹${top.modalPrice} prati quintal darj kiya gaya hai.`;
  }

  // 6. Compare mandis success case
  if (calculatedData.bestMandi && calculatedData.bestMandi.modalPrice) {
    return `Sabse behtar bhav ${calculatedData.bestMandi.market} mein ₹${calculatedData.bestMandi.modalPrice} prati quintal hai.`;
  }

  return `Is query ke liye verified data ke aadhar par jankari uplabdh karai gayi hai.`;
}

/**
 * Backend-side defensive output cleaning safeguard.
 * Completely strips <thought>...</thought> and <think>...</think> blocks,
 * handles unclosed trailing thought tags, and guarantees a clean, 1-3 sentence farmer answer.
 * 
 * @param {string} rawText Raw output from model
 * @param {object} context Fallback context { calculatedData, intent }
 * @returns {string} Clean final answer
 */
function cleanGemmaOutput(rawText, context = {}) {
  if (!rawText || typeof rawText !== 'string') {
    return generateDeterministicFallback(context);
  }

  // 1. Remove complete <thought>...</thought> blocks (case-insensitive)
  let cleaned = rawText.replace(/<thought>[\s\S]*?<\/thought>/gi, '');

  // 2. Remove complete <think>...</think> blocks
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // 3. Remove unclosed trailing <thought>... or <think>... if model output truncated
  cleaned = cleaned.replace(/<thought>[\s\S]*$/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');

  // 4. Strip stray tags or metadata prefixes
  cleaned = cleaned.replace(/<\/?thought>/gi, '').replace(/<\/?think>/gi, '');
  cleaned = cleaned.replace(/^(Thought|Reasoning|Internal Monologue):[\s\S]*?\n\n/i, '');

  cleaned = cleaned.trim();

  // 5. If the model produced no usable final answer (e.g. only thoughts were generated)
  if (!cleaned || cleaned.length < 5) {
    return generateDeterministicFallback(context);
  }

  return cleaned;
}

/**
 * Fallback intent parser when running offline or validating Gemma output.
 * Ensures query parsing works even when external AI is unconfigured or returns noisy JSON.
 */
function heuristicExtractIntent(question) {
  const lower = question.toLowerCase();

  // 1. Detect Operation
  let operation = 'latest_price';
  if (
    lower.includes('trend') ||
    lower.includes('badha') ||
    lower.includes('ghata') ||
    lower.includes('bhav gira') ||
    lower.includes('bhav chadha') ||
    lower.includes('rate badha') ||
    lower.includes('rate gira') ||
    lower.includes('gira ya chadha') ||
    lower.includes('badha ya ghata') ||
    lower.includes('price trend')
  ) {
    operation = 'price_trend';
  } else if (
    lower.includes('compare') ||
    lower.includes('kahan bechu') ||
    lower.includes('kisme bechu') ||
    lower.includes('kaunsi mandi') ||
    lower.includes('paas ki mandi') ||
    lower.includes('best mandi') ||
    lower.includes('aas paas')
  ) {
    operation = 'compare_mandis';
  }

  // 2. Detect Commodity
  let commodity = null;
  for (const [hindi, english] of Object.entries(HINDI_COMMODITY_MAP)) {
    const regex = new RegExp(`\\b${hindi}\\b`, 'i');
    if (regex.test(lower)) {
      commodity = english;
      break;
    }
  }

  if (!commodity) {
    const commonEnglish = ['Wheat', 'Onion', 'Tomato', 'Potato', 'Rice', 'Mustard', 'Gram', 'Maize', 'Garlic'];
    for (const crop of commonEnglish) {
      if (lower.includes(crop.toLowerCase())) {
        commodity = crop;
        break;
      }
    }
  }

  // 3. Detect District / City
  let district = null;
  const commonDistricts = [
    'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut',
    'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Faizabad', 'Ayodhya',
    'Indore', 'Bhopal', 'Jaipur', 'Patna', 'Nashik', 'Pune', 'Nagpur', 'Ludhiana'
  ];
  for (const dist of commonDistricts) {
    if (lower.includes(dist.toLowerCase())) {
      district = dist;
      break;
    }
  }

  // 4. Detect Days
  let days = 7;
  const daysMatch = lower.match(/(\d+)\s*(din|days?)/);
  if (daysMatch) {
    days = parseInt(daysMatch[1], 10);
  }

  const isMissingRequiredInfo = !commodity;
  const clarificationNeeded = isMissingRequiredInfo
    ? 'Aap kis fasal ya commodity (jaise gehun, pyaz, tamatar) ke baare mein janna chahte hain? Kripya fasal ka naam batayein.'
    : null;

  return {
    operation,
    commodity,
    district,
    state: null,
    days,
    isMissingRequiredInfo,
    clarificationNeeded
  };
}

/**
 * Validates and sanitizes model-generated intent.
 * Treats all AI output as untrusted input.
 */
function validateAndSanitizeIntent(rawIntent, fallbackIntent) {
  if (!rawIntent || typeof rawIntent !== 'object') {
    return fallbackIntent;
  }

  let operation = rawIntent.operation;
  if (!ALLOWED_OPERATIONS.includes(operation)) {
    operation = fallbackIntent.operation || 'latest_price';
  }

  const commodity =
    typeof rawIntent.commodity === 'string' && rawIntent.commodity.trim() !== ''
      ? rawIntent.commodity.trim()
      : fallbackIntent.commodity;

  const district =
    typeof rawIntent.district === 'string' && rawIntent.district.trim() !== ''
      ? rawIntent.district.trim()
      : fallbackIntent.district;

  const state =
    typeof rawIntent.state === 'string' && rawIntent.state.trim() !== ''
      ? rawIntent.state.trim()
      : fallbackIntent.state;

  let days = parseInt(rawIntent.days, 10);
  if (isNaN(days) || days <= 0 || days > 365) {
    days = fallbackIntent.days || 7;
  }

  const isMissingRequiredInfo = !commodity;
  let clarificationNeeded = null;
  if (isMissingRequiredInfo) {
    clarificationNeeded =
      rawIntent.clarificationNeeded ||
      'Aap kis fasal ya commodity (jaise gehun, pyaz, tamatar) ke baare mein janna chahte hain? Kripya fasal ka naam batayein.';
  }

  return {
    operation,
    commodity,
    district,
    state,
    days,
    isMissingRequiredInfo,
    clarificationNeeded
  };
}

/**
 * Extracts structured intent from the user query using Gemma 4.
 */
async function extractIntent(question) {
  const fallback = heuristicExtractIntent(question);
  const status = getGemmaStatus();

  if (!status.isConfigured) {
    return {
      usedAi: false,
      unconfigured: true,
      missing: status.missing,
      intent: fallback
    };
  }

  const systemPrompt = `You are an intent extraction engine for MandiMitra, an Indian agricultural mandi assistant.
Extract user intent into STRICT JSON format with these exact keys:
{
  "operation": "latest_price" | "price_trend" | "compare_mandis",
  "commodity": "English commodity name (e.g. Wheat, Onion, Tomato, Potato, Rice) or null",
  "district": "District/City name or null",
  "state": "State name or null",
  "days": number or 7,
  "isMissingRequiredInfo": boolean,
  "clarificationNeeded": "Hindi question asking for missing info if commodity is null, else null"
}

IMPORTANT:
- Output ONLY raw JSON. Do NOT output <thought> tags or markdown fences.
- Hindi crops: 'gehun'->'Wheat', 'pyaz'->'Onion', 'tamatar'->'Tomato', 'aloo'->'Potato', 'chawal'->'Rice'.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: question }
  ];

  const aiResult = await callGemmaInference(messages, 0.0, 500);
  if (!aiResult.success) {
    return {
      usedAi: false,
      aiError: aiResult.error,
      intent: fallback
    };
  }

  try {
    // Strip any <thought> tags from intent output as well
    const cleanedContent = aiResult.content
      .replace(/<thought>[\s\S]*?<\/thought>/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanedContent);
    const sanitized = validateAndSanitizeIntent(parsed, fallback);
    return {
      usedAi: true,
      intent: sanitized
    };
  } catch (parseErr) {
    return {
      usedAi: false,
      aiError: 'Failed to parse AI JSON response; safely fell back to deterministic parser.',
      intent: fallback
    };
  }
}

/**
 * Generates a concise, empathetic explanation in simple Hindi, Hinglish, or English.
 * Strictly grounded in real verified numerical calculations and dates.
 * Guaranteed to never expose <thought> tags or internal reasoning.
 */
async function generateExplanation({ question, intent, calculatedData }) {
  const status = getGemmaStatus();
  if (!status.isConfigured) {
    return {
      success: false,
      unconfigured: true,
      missing: status.missing,
      error: `Gemma 4 provider credentials are not configured in .env. Missing: ${status.missing.join(', ')}`
    };
  }

  const systemPrompt = `You are MandiMitra, an honest, friendly AI agricultural mandi advisor for Indian farmers.
Respond directly to the farmer in 1 to 3 short, friendly sentences in the same language as their question (Hindi, Hinglish, or English).

STRICT OUTPUT FORMAT RULES:
1. Output ONLY the final user-facing answer.
2. NEVER output <thought>, <think>, internal reasoning, analysis, drafts, or self-evaluation.
3. Start directly with the answer. Do not write preamble or meta-commentary.

STRICT GROUNDING & CONTENT RULES:
1. State ONLY facts and numbers explicitly present in the provided VERIFIED DATA.
2. If data is marked as "no_data" or records are empty, explain clearly that no matching mandi-price records were found and that the price trend cannot be determined.
3. If data is marked as "insufficient_data", explain that historical data is insufficient to establish a trend.
4. NEVER invent prices, dates, market names, or reasons for price movements (e.g. do not invent rainfall, transport issues, or demand).
5. Do NOT promise automatic notifications, price alerts, or future updates (as no notification feature exists).
6. Keep the answer concise (1 to 3 sentences max).`;

  const contextData = {
    userQuestion: question,
    operation: intent.operation,
    commodity: intent.commodity,
    district: intent.district,
    verifiedCalculations: calculatedData
  };

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: `Farmer Question: "${question}"\n\nVERIFIED DATA:\n${JSON.stringify(contextData, null, 2)}\n\nProvide ONLY the direct 1-3 sentence answer.`
    }
  ];

  const result = await callGemmaInference(messages, 0.2, 1000);

  if (!result.success) {
    // If the external provider failed, provide the clean deterministic fallback
    const fallbackAnswer = generateDeterministicFallback({ question, intent, calculatedData });
    return {
      success: true,
      explanation: fallbackAnswer,
      providerNote: 'Generated via deterministic grounding fallback.'
    };
  }

  // Defensive output cleaning safeguard: completely strip all <thought> blocks
  const cleanAnswer = cleanGemmaOutput(result.content, { question, intent, calculatedData });

  return {
    success: true,
    explanation: cleanAnswer
  };
}

module.exports = {
  getGemmaStatus,
  extractIntent,
  generateExplanation,
  cleanGemmaOutput,
  generateDeterministicFallback,
  heuristicExtractIntent,
  validateAndSanitizeIntent
};
