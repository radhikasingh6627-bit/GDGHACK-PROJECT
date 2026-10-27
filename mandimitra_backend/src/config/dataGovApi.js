const config = require('./env');

const RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const BASE_URL = `https://api.data.gov.in/resource/${RESOURCE_ID}`;

/**
 * Checks whether the data.gov.in API key is configured with a real (non-placeholder) key.
 * @returns {boolean}
 */
function isConfigured() {
  const key = config.dataGovApiKey;
  return Boolean(
    key &&
    typeof key === 'string' &&
    key.trim() !== '' &&
    !key.includes('PASTE_YOUR_') 
  );
}

/**
 * Builds the data.gov.in URL with documented filter parameters.
 * Uses upstream query parameters:
 *   - filters[commodity]
 *   - filters[district]
 *   - filters[state]
 *   - limit
 *   - offset
 * 
 * @param {object} options
 * @param {string} [options.commodity]
 * @param {string} [options.district]
 * @param {string} [options.state]
 * @param {number} [options.limit=100]
 * @param {number} [options.offset=0]
 * @returns {string} Fully formed request URL (keys kept safe in memory)
 */
function buildDataGovUrl(options = {}) {
  const url = new URL(BASE_URL);

  url.searchParams.set('api-key', config.dataGovApiKey || '');
  url.searchParams.set('format', 'json');

  const limit = options.limit ? Math.min(Math.max(parseInt(options.limit, 10), 1), 500) : 100;
  url.searchParams.set('limit', String(limit));

  if (options.offset && parseInt(options.offset, 10) > 0) {
    url.searchParams.set('offset', String(parseInt(options.offset, 10)));
  }

  if (options.commodity && typeof options.commodity === 'string' && options.commodity.trim()) {
   url.searchParams.set(
  'filters[commodity]',
  options.commodity.trim().toLowerCase()
);
  }

  if (options.district && typeof options.district === 'string' && options.district.trim()) {
    url.searchParams.set('filters[district]', options.district.trim());
  }

  if (options.state && typeof options.state === 'string' && options.state.trim()) {
    url.searchParams.set('filters[state.keyword]', options.state.trim());
  }

  return url.toString();
}

module.exports = {
  RESOURCE_ID,
  BASE_URL,
  isConfigured,
  buildDataGovUrl
};
