/**
 * Automated tests for Part 5 Gemma 4 AI Intent Extraction, Input Sanitization, and Grounding.
 * Uses Node.js's built-in `node:test` and `node:assert/strict`.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getGemmaStatus } = require('../src/config/gemmaConfig');
const {
  heuristicExtractIntent,
  validateAndSanitizeIntent,
  cleanGemmaOutput,
  generateDeterministicFallback
} = require('../src/services/gemmaService');

describe('Part 5 Gemma 4 AI Integration & Grounding Tests', () => {

  // 1. Placeholder detection
  test('Fixture 1: getGemmaStatus detects placeholder credentials accurately', () => {
    const status = getGemmaStatus();
    assert.equal(typeof status.isConfigured, 'boolean');
    assert.ok(Array.isArray(status.missing));
  });

  // 2. Intent extraction: latest_price
  test('Fixture 2: Extracts latest_price intent with Hindi crop name', () => {
    const res = heuristicExtractIntent('Kanpur mein pyaz ka kya rate hai?');
    assert.equal(res.operation, 'latest_price');
    assert.equal(res.commodity, 'Onion');
    assert.equal(res.district, 'Kanpur');
    assert.equal(res.isMissingRequiredInfo, false);
  });

  // 3. Intent extraction: price_trend
  test('Fixture 3: Extracts price_trend intent from Hinglish query', () => {
    const res = heuristicExtractIntent('Lucknow mein gehun ka bhav badha ya ghata?');
    assert.equal(res.operation, 'price_trend');
    assert.equal(res.commodity, 'Wheat');
    assert.equal(res.district, 'Lucknow');
    assert.equal(res.days, 7);
    assert.equal(res.isMissingRequiredInfo, false);
  });

  // 4. Intent extraction: compare_mandis
  test('Fixture 4: Extracts compare_mandis intent from Hinglish question', () => {
    const res = heuristicExtractIntent('Tamatar kahan bechu kaunsi mandi best hai?');
    assert.equal(res.operation, 'compare_mandis');
    assert.equal(res.commodity, 'Tomato');
    assert.equal(res.isMissingRequiredInfo, false);
  });

  // 5. Missing commodity triggers clarification
  test('Fixture 5: Queries lacking a commodity flag isMissingRequiredInfo and ask clarification', () => {
    const res = heuristicExtractIntent('Bhav badha ya ghata?');
    assert.equal(res.isMissingRequiredInfo, true);
    assert.equal(res.commodity, null);
    assert.ok(typeof res.clarificationNeeded === 'string');
    assert.match(res.clarificationNeeded, /fasal/i);
  });

  // 6. Sanitization rejects malicious or unknown operations
  test('Fixture 6: validateAndSanitizeIntent treats AI output as untrusted and sanitizes it', () => {
    const fallback = {
      operation: 'latest_price',
      commodity: 'Wheat',
      district: 'Lucknow',
      days: 7,
      isMissingRequiredInfo: false,
      clarificationNeeded: null
    };

    const untrustedAiOutput = {
      operation: 'execute_shell_command',
      commodity: 'Wheat',
      district: 'Lucknow',
      days: -999
    };

    const sanitized = validateAndSanitizeIntent(untrustedAiOutput, fallback);
    assert.equal(sanitized.operation, 'latest_price');
    assert.equal(sanitized.days, 7);
  });

  // 7. Thought tags removal: <thought>...</thought>
  test('Fixture 7: cleanGemmaOutput completely removes <thought>...</thought> tags and internal reasoning', () => {
    const rawWithThought = '<thought>\n* Thinking step 1...\n* Planning response...\n</thought>Kanpur mandi mein gehun ka bhav ₹2600 prati quintal hai.';
    const cleaned = cleanGemmaOutput(rawWithThought, {});

    assert.equal(cleaned.includes('<thought>'), false, 'Final answer must never contain opening <thought> tag');
    assert.equal(cleaned.includes('</thought>'), false, 'Final answer must never contain closing </thought> tag');
    assert.equal(cleaned.includes('Thinking step 1'), false, 'Internal reasoning must be completely stripped');
    assert.equal(cleaned, 'Kanpur mandi mein gehun ka bhav ₹2600 prati quintal hai.');
  });

  // 8. Thought tags removal: <think>...</think>
  test('Fixture 8: cleanGemmaOutput completely removes <think>...</think> tags', () => {
    const rawWithThink = '<think>Analyzing user question</think>Lucknow mein gehun ka bhav sthir raha hai.';
    const cleaned = cleanGemmaOutput(rawWithThink, {});

    assert.equal(cleaned.includes('<think>'), false);
    assert.equal(cleaned.includes('</think>'), false);
    assert.equal(cleaned, 'Lucknow mein gehun ka bhav sthir raha hai.');
  });

  // 9. Unclosed trailing thought tags fallback
  test('Fixture 9: Truncated or unclosed <thought> tags fall back gracefully to clean grounded answer', () => {
    const rawTruncated = '<thought>\n* User Question: Lucknow mein gehun...\n* Internal chain of thought interrupted mid-sentence';
    const fallbackContext = {
      intent: { commodity: 'Wheat', district: 'Lucknow' },
      calculatedData: { status: 'no_data', records: [] }
    };
    const cleaned = cleanGemmaOutput(rawTruncated, fallbackContext);

    assert.equal(cleaned.includes('<thought>'), false);
    assert.equal(cleaned.includes('Internal chain of thought'), false);
    assert.ok(cleaned.length > 10, 'Fallback answer must be provided');
    assert.match(cleaned, /record nahi mila/i);
  });

  // 10. No data explanation explains records not found and trend cannot be determined
  test('Fixture 10: generateDeterministicFallback for no_data clearly explains trend cannot be determined', () => {
    const fallback = generateDeterministicFallback({
      intent: { commodity: 'Wheat', district: 'Lucknow' },
      calculatedData: { status: 'no_data', records: [] }
    });

    assert.match(fallback, /record nahi mila/i);
    assert.match(fallback, /trend nirdharit nahi/i);
    assert.equal(fallback.includes('<thought>'), false);
  });

});
