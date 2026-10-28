const config = require('../config/env');

/**
 * Checks whether Meta WhatsApp Cloud API credentials are configured with real values.
 * Returns false if missing or placeholder strings are present.
 */
function isWhatsAppConfigured() {
  const token = config.whatsappAccessToken;
  const phoneId = config.whatsappPhoneNumberId;

  const isInvalid = (val) =>
    !val ||
    typeof val !== 'string' ||
    val.trim() === '' ||
    val.includes('PASTE_') ||
    val.includes('YOUR_');

  return !isInvalid(token) && !isInvalid(phoneId);
}

/**
 * Validates and normalizes Indian mobile phone numbers for WhatsApp Cloud API.
 * Acceptable formats:
 *   - "9876543210" (10 digits starting with 6, 7, 8, 9)
 *   - "+91 98765 43210" / "+919876543210"
 *   - "09876543210"
 * Returns normalized international format: "919876543210"
 */
function normalizeIndianPhone(input) {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      normalized: null,
      error: 'Phone number is required and must be a valid string.'
    };
  }

  // Strip all non-digit characters except leading plus
  let cleaned = input.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }

  // If starts with single 0 (trunk prefix), strip it
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.slice(1);
  }

  // If 10 digits starting with 6-9, prepend 91 (India country code)
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `91${cleaned}`;
  }

  // Final validation: must be 91 followed by 10 digits starting with 6-9 (total 12 digits)
  const isValid = /^91[6-9]\d{9}$/.test(cleaned);

  if (!isValid) {
    return {
      isValid: false,
      normalized: null,
      error: 'Invalid Indian mobile number. Must be a 10-digit number starting with 6-9 (e.g. 9876543210 or +91 9876543210).'
    };
  }

  return {
    isValid: true,
    normalized: cleaned,
    error: null
  };
}

/**
 * Masks a phone number for safe display in logs and UI (e.g. "91******3210")
 */
function maskPhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return '***';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '***';
  if (digits.length <= 6) return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
  return `${digits.slice(0, 2)}******${digits.slice(-4)}`;
}

/**
 * Builds the official Meta WhatsApp Cloud API template payload.
 * Business-initiated outbound messages require an approved WhatsApp template.
 */
function buildTemplatePayload(recipientPhone, templateData) {
  const {
    crop,
    mandi,
    reportedPrice,
    targetPrice,
    reportDate,
    source = 'Agmarknet (data.gov.in)'
  } = templateData;

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: recipientPhone,
    type: 'template',
    template: {
      name: config.whatsappTemplateName || 'mandi_price_alert',
      language: {
        code: config.whatsappLanguageCode || 'en'
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: String(crop) },
            { type: 'text', text: String(mandi) },
            { type: 'text', text: `₹${reportedPrice}` },
            { type: 'text', text: `₹${targetPrice}` },
            { type: 'text', text: String(reportDate) },
            { type: 'text', text: String(source) }
          ]
        }
      ]
    }
  };
}

/**
 * Sends a WhatsApp price alert using official Meta WhatsApp Cloud API.
 * In DEMO MODE (when credentials are absent), it securely generates a simulated delivery
 * that is clearly labelled [SIMULATED — NOT SENT].
 */
async function sendWhatsAppAlert({
  to,
  recipient: recipientParam,
  crop,
  mandi,
  reportedPrice,
  targetPrice,
  reportDate,
  source = 'Agmarknet (data.gov.in)',
  isTest = false
}) {
  const rawPhone = to || recipientParam;
  const phoneValidation = normalizeIndianPhone(rawPhone);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      mode: isWhatsAppConfigured() ? 'live' : 'demo',
      status: 'failed',
      error: phoneValidation.error,
      recipient: rawPhone
    };
  }

  const recipient = phoneValidation.normalized;
  const configured = isWhatsAppConfigured();

  // 1. DEMO MODE (Safe Simulation when Meta credentials are not configured)
  if (!configured) {
    const simulatedMessageId = `sim_wamid_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const disclaimer = 'Reported official modal price from Agmarknet, not a guaranteed selling rate.';
    const previewMessage = `[SIMULATED — NOT SENT]\n🌾 Crop: ${crop}\n🏛️ Mandi: ${mandi}\n💰 Reported Modal Price: ₹${reportedPrice}/quintal\n🎯 Target: ₹${targetPrice}/quintal\n📅 Date: ${reportDate}\n📋 Source: ${source}\n⚠️ DISCLAIMER: This is an official reported mandi rate, not a guaranteed selling price.`;

    return {
      success: true,
      mode: 'demo',
      status: 'simulated',
      isSimulated: true,
      badge: 'SIMULATED — NOT SENT',
      messageId: simulatedMessageId,
      recipient,
      maskedRecipient: maskPhoneNumber(recipient),
      crop,
      mandi,
      reportedPrice,
      targetPrice,
      reportDate,
      source,
      isTest,
      previewMessage,
      disclaimer,
      simulatedNotice: '[SIMULATED — NOT SENT] WhatsApp credentials unconfigured. Safe local demo mode active.',
      timestamp: new Date().toISOString()
    };
  }

  // 2. LIVE MODE (Calls Meta WhatsApp Cloud API over HTTPS)
  const apiVersion = config.whatsappApiVersion || 'v22.0';
  const phoneNumberId = config.whatsappPhoneNumberId;
  const endpoint = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const payload = buildTemplatePayload(recipient, {
    crop,
    mandi,
    reportedPrice,
    targetPrice,
    reportDate,
    source
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.whatsappAccessToken.trim()}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      // Sanitize Meta error response to ensure access token is NEVER leaked
      const metaError = data?.error || {};
      const errorMessage =
        metaError.message || `Meta WhatsApp API returned HTTP ${response.status}.`;
      const errorCode = metaError.code || response.status;
      const errorSubcode = metaError.error_subcode;

      let farmerFriendlyHint = 'Please check your Meta WhatsApp Cloud API configuration.';
      if (errorCode === 190) {
        farmerFriendlyHint = 'Meta WhatsApp Access Token has expired. Please refresh your token in the Meta developer portal.';
      } else if (errorCode === 131030) {
        farmerFriendlyHint = 'Recipient phone number is not on the Meta Test Allowlist. In development mode, recipient numbers must be explicitly verified in the Meta App Dashboard.';
      } else if (errorCode === 132000 || errorCode === 132001) {
        farmerFriendlyHint = `Template "${config.whatsappTemplateName}" was not found or is not approved in your WhatsApp Business Account.`;
      }

      return {
        success: false,
        mode: 'live',
        status: 'failed',
        error: errorMessage,
        errorCode,
        errorSubcode,
        hint: farmerFriendlyHint,
        recipient: maskPhoneNumber(recipient),
        timestamp: new Date().toISOString()
      };
    }

    const messageId =
      data?.messages && data?.messages[0] ? data.messages[0].id : `wamid_${Date.now()}`;

    return {
      success: true,
      mode: 'live',
      status: 'delivered',
      messageId,
      recipient: maskPhoneNumber(recipient),
      crop,
      mandi,
      reportedPrice,
      targetPrice,
      reportDate,
      source,
      isTest,
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    const isTimeout = err.name === 'AbortError';
    return {
      success: false,
      mode: 'live',
      status: 'failed',
      error: isTimeout
        ? 'Meta WhatsApp Cloud API request timed out after 12 seconds.'
        : `Network error connecting to Meta WhatsApp Cloud API: ${err.message}`,
      recipient: maskPhoneNumber(recipient),
      timestamp: new Date().toISOString()
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Sends a test alert only to the configured WHATSAPP_TEST_RECIPIENT.
 * Requires an explicit user action.
 */
async function sendTestAlert() {
  const testRecipient = config.whatsappTestRecipient;

  if (!testRecipient || typeof testRecipient !== 'string' || testRecipient.trim() === '') {
    return {
      success: false,
      mode: isWhatsAppConfigured() ? 'live' : 'demo',
      status: 'failed',
      error: 'WHATSAPP_TEST_RECIPIENT is not configured in .env. Please set a verified 10-digit mobile number.',
      hint: 'Configure WHATSAPP_TEST_RECIPIENT=919876543210 in your .env file.'
    };
  }

  const phoneValidation = normalizeIndianPhone(testRecipient);
  if (!phoneValidation.isValid) {
    return {
      success: false,
      mode: isWhatsAppConfigured() ? 'live' : 'demo',
      status: 'failed',
      error: `Configured WHATSAPP_TEST_RECIPIENT is invalid: ${phoneValidation.error}`
    };
  }

  return sendWhatsAppAlert({
    to: phoneValidation.normalized,
    crop: 'Wheat (गेहूं)',
    mandi: 'Datia APMC (दतिया मंडी)',
    reportedPrice: 2780,
    targetPrice: 2700,
    reportDate: new Date().toISOString().split('T')[0],
    source: 'Agmarknet (data.gov.in) Official Daily Report',
    isTest: true
  });
}

/**
 * Returns the current WhatsApp service status and configuration info.
 * Protects secrets and masks phone numbers.
 */
function getWhatsAppStatus() {
  const configured = isWhatsAppConfigured();
  const testRecipient = config.whatsappTestRecipient ? config.whatsappTestRecipient.trim() : '';
  const normalizedTest = testRecipient ? normalizeIndianPhone(testRecipient) : null;

  return {
    isConfigured: configured,
    mode: configured ? 'live' : 'demo',
    badge: configured ? 'LIVE META API' : 'SIMULATED DEMO MODE',
    apiVersion: config.whatsappApiVersion || 'v22.0',
    templateName: config.whatsappTemplateName || 'mandi_price_alert',
    languageCode: config.whatsappLanguageCode || 'en',
    hasTestRecipient: Boolean(normalizedTest && normalizedTest.isValid),
    maskedTestRecipient: normalizedTest?.isValid ? maskPhoneNumber(normalizedTest.normalized) : null,
    notes: configured
      ? 'Connected to official Meta WhatsApp Cloud API.'
      : 'Running in safe DEMO MODE. Messages are simulated and labelled [SIMULATED — NOT SENT].'
  };
}

module.exports = {
  isWhatsAppConfigured,
  normalizeIndianPhone,
  maskPhoneNumber,
  buildTemplatePayload,
  sendWhatsAppAlert,
  sendTestAlert,
  getWhatsAppStatus
};
