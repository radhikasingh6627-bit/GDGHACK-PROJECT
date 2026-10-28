const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5001,
  dataGovApiKey: process.env.AGMARKNET_API_KEY || process.env.DATA_GOV_API_KEY || '',
  agmarknetApiKey: process.env.AGMARKNET_API_KEY || process.env.DATA_GOV_API_KEY || '',
  gemmaApiKey: process.env.GEMMA_API_KEY || '',
  gemmaApiBaseUrl: process.env.GEMMA_API_BASE_URL || '',
  gemmaModelId: process.env.GEMMA_MODEL_ID || '',

  // Meta WhatsApp Cloud API configuration
  whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  whatsappTestRecipient: process.env.WHATSAPP_TEST_RECIPIENT || '',
  whatsappTemplateName: process.env.WHATSAPP_TEMPLATE_NAME || 'mandi_price_alert',
  whatsappLanguageCode: process.env.WHATSAPP_LANGUAGE_CODE || 'en',
  whatsappApiVersion: process.env.WHATSAPP_API_VERSION || 'v22.0',
  alertCheckIntervalMinutes: parseInt(process.env.ALERT_CHECK_INTERVAL_MINUTES, 10) || 30
};

module.exports = config;
