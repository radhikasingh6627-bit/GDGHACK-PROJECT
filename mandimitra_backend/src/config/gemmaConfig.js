const config = require('./env');

/**
 * Gemma 4 Configuration Module
 * 
 * Manages provider credentials and validation.
 * Supports OpenAI-compatible inference endpoints (e.g. Groq, HuggingFace, Together, OpenRouter, Google AI Studio)
 * hosting Gemma 4 models.
 */

function isPlaceholderOrEmpty(value) {
  if (!value || typeof value !== 'string') return true;
  const trimmed = value.trim();
  return (
    trimmed === '' ||
    trimmed.startsWith('PASTE_') ||
    trimmed.includes('PASTE_YOUR_') ||
    trimmed.includes('PASTE_VERIFIED_')
  );
}

/**
 * Validates whether Gemma 4 provider credentials are fully configured.
 * @returns {{ isConfigured: boolean, missing: string[] }}
 */
function getGemmaStatus() {
  const missing = [];

  if (isPlaceholderOrEmpty(config.gemmaApiKey)) {
    missing.push('GEMMA_API_KEY');
  }
  if (isPlaceholderOrEmpty(config.gemmaApiBaseUrl)) {
    missing.push('GEMMA_API_BASE_URL');
  }
  if (isPlaceholderOrEmpty(config.gemmaModelId)) {
    missing.push('GEMMA_MODEL_ID');
  }

  return {
    isConfigured: missing.length === 0,
    missing,
    modelId: config.gemmaModelId || null,
    baseUrl: config.gemmaApiBaseUrl || null
  };
}

module.exports = {
  getGemmaStatus,
  apiKey: config.gemmaApiKey,
  baseUrl: config.gemmaApiBaseUrl,
  modelId: config.gemmaModelId
};
