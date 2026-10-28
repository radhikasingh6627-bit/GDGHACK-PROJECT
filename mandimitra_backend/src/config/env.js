const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  dataGovApiKey: process.env.DATA_GOV_API_KEY || '',
  gemmaApiKey: process.env.GEMMA_API_KEY || '',
  gemmaApiBaseUrl: process.env.GEMMA_API_BASE_URL || '',
  gemmaModelId: process.env.GEMMA_MODEL_ID || ''
};

module.exports = config;
