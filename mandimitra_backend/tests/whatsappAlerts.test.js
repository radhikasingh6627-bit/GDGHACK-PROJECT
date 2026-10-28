/**
 * Automated tests for the WhatsApp Price Alert System.
 * Covers:
 *  - Indian phone number validation and normalization
 *  - Phone number privacy masking
 *  - Official Meta WhatsApp Cloud API template payload construction
 *  - Demo Mode simulation safeguards ([SIMULATED — NOT SENT])
 *  - Threshold comparisons (triggers when reported >= target, waits when < target)
 *  - Duplicate alert suppression (never resends for the same report date)
 *  - Invalid, missing, and non-positive price safeguards (data_unavailable)
 *  - Explicit farmer consent enforcement
 *
 * Uses Node.js built-in `node:test` and `node:assert/strict`.
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeIndianPhone,
  maskPhoneNumber,
  buildTemplatePayload,
  isWhatsAppConfigured,
  sendWhatsAppAlert
} = require('../src/services/whatsappService');

const alertStorage = require('../src/services/alertStorageService');
const { evaluateAlert, findMatchingRecord } = require('../src/services/alertEvaluationService');

describe('WhatsApp Price Alert System — Unit Tests', () => {

  // =========================================================================
  // 1. Phone Number Validation and Normalization
  // =========================================================================
  describe('Indian Phone Normalization', () => {
    test('Standard 10-digit number starting with 9 normalizes to 91XXXXXXXXXX', () => {
      const res = normalizeIndianPhone('9876543210');
      assert.equal(res.isValid, true);
      assert.equal(res.normalized, '919876543210');
    });

    test('10-digit number starting with 6, 7, 8 are valid', () => {
      assert.equal(normalizeIndianPhone('6123456789').isValid, true);
      assert.equal(normalizeIndianPhone('7890123456').isValid, true);
      assert.equal(normalizeIndianPhone('8901234567').isValid, true);
    });

    test('Formatted with spaces and +91 country code normalizes cleanly', () => {
      const res = normalizeIndianPhone('+91 98765 43210');
      assert.equal(res.isValid, true);
      assert.equal(res.normalized, '919876543210');
    });

    test('Number with leading 0 trunk prefix normalizes cleanly', () => {
      const res = normalizeIndianPhone('09876543210');
      assert.equal(res.isValid, true);
      assert.equal(res.normalized, '919876543210');
    });

    test('Rejects invalid numbers starting with 0-5', () => {
      assert.equal(normalizeIndianPhone('1234567890').isValid, false);
      assert.equal(normalizeIndianPhone('5555555555').isValid, false);
    });

    test('Rejects numbers with wrong length or non-digits', () => {
      assert.equal(normalizeIndianPhone('98765').isValid, false);
      assert.equal(normalizeIndianPhone('9876543210123').isValid, false);
      assert.equal(normalizeIndianPhone('98765abcde').isValid, false);
      assert.equal(normalizeIndianPhone('').isValid, false);
      assert.equal(normalizeIndianPhone(null).isValid, false);
    });
  });

  // =========================================================================
  // 2. Phone Masking for Privacy
  // =========================================================================
  describe('Privacy Phone Masking', () => {
    test('Masks middle digits of a 12-digit Indian number', () => {
      const masked = maskPhoneNumber('919876543210');
      assert.equal(masked, '91******3210');
      assert.equal(masked.length, 12);
    });

    test('Handles short or empty gracefully', () => {
      assert.equal(maskPhoneNumber(''), '***');
      assert.equal(maskPhoneNumber(null), '***');
    });
  });

  // =========================================================================
  // 3. Meta Template Payload Construction
  // =========================================================================
  describe('Meta Template Payload Construction', () => {
    test('Builds correct official WhatsApp Cloud API template structure', () => {
      const payload = buildTemplatePayload('919876543210', {
        crop: 'Wheat',
        mandi: 'Datia APMC',
        reportedPrice: 2780,
        targetPrice: 2700,
        reportDate: '2026-10-28',
        source: 'Agmarknet (data.gov.in)'
      });

      assert.equal(payload.messaging_product, 'whatsapp');
      assert.equal(payload.to, '919876543210');
      assert.equal(payload.type, 'template');
      assert.ok(payload.template.name);
      assert.ok(payload.template.language.code);

      const params = payload.template.components[0].parameters;
      assert.equal(params.length, 6);
      assert.equal(params[0].text, 'Wheat');
      assert.equal(params[1].text, 'Datia APMC');
      assert.equal(params[2].text, '₹2780');
      assert.equal(params[3].text, '₹2700');
      assert.equal(params[4].text, '2026-10-28');
      assert.equal(params[5].text, 'Agmarknet (data.gov.in)');
    });
  });

  // =========================================================================
  // 4. Demo Mode Safeguards
  // =========================================================================
  describe('Demo Mode Simulation Safeguards', () => {
    test('When credentials are not real, returns simulated response labelled [SIMULATED — NOT SENT]', async () => {
      const result = await sendWhatsAppAlert({
        recipient: '919876543210',
        crop: 'Wheat',
        mandi: 'Datia APMC',
        reportedPrice: 2780,
        targetPrice: 2700,
        reportDate: '2026-10-28'
      });

      // If test environment has no real Meta token, it must be simulated
      if (!isWhatsAppConfigured()) {
        assert.equal(result.success, true);
        assert.equal(result.isSimulated, true);
        assert.equal(result.badge, 'SIMULATED — NOT SENT');
        assert.ok(result.previewMessage.includes('[SIMULATED — NOT SENT]'));
        assert.ok(result.previewMessage.includes('Wheat'));
        assert.ok(result.previewMessage.includes('2780'));
        assert.ok(result.previewMessage.includes('DISCLAIMER: This is an official reported mandi rate'));
      }
    });
  });

  // =========================================================================
  // 5. Threshold Evaluation & Price Logic
  // =========================================================================
  describe('Alert Evaluation & Threshold Logic', () => {
    beforeEach(() => {
      alertStorage._resetStorageForTesting({ alerts: [], notifications: [] });
    });

    test('Triggers alert when reported modal price >= target price', async () => {
      const testAlert = {
        id: 'test_alert_wheat_trigger',
        commodity: 'Wheat',
        district: 'Datia',
        market: 'Datia APMC',
        targetPrice: 2500,
        recipientPhone: '919876543210',
        consent: true,
        status: 'waiting',
        lastTriggeredReportDate: null
      };

      const mockRecords = [
        {
          commodity: 'Wheat',
          district: 'Datia',
          market: 'Datia APMC',
          modalPrice: 2650,
          isPriceValid: true,
          date: '2026-10-28'
        }
      ];

      const res = await evaluateAlert(testAlert, mockRecords);
      assert.equal(res.success, true);
      assert.equal(res.triggered, true);
      assert.equal(res.status, 'triggered');
      assert.equal(res.reportedPrice, 2650);
      assert.equal(res.targetPrice, 2500);
      assert.equal(res.reportDate, '2026-10-28');
    });

    test('Does NOT trigger when reported modal price < target price (stays waiting)', async () => {
      const testAlert = {
        id: 'test_alert_wheat_wait',
        commodity: 'Wheat',
        district: 'Datia',
        market: 'Datia APMC',
        targetPrice: 2800,
        recipientPhone: '919876543210',
        consent: true,
        status: 'waiting',
        lastTriggeredReportDate: null
      };

      const mockRecords = [
        {
          commodity: 'Wheat',
          district: 'Datia',
          market: 'Datia APMC',
          modalPrice: 2650,
          isPriceValid: true,
          date: '2026-10-28'
        }
      ];

      const res = await evaluateAlert(testAlert, mockRecords);
      assert.equal(res.success, true);
      assert.equal(res.triggered, false);
      assert.equal(res.status, 'waiting');
      assert.equal(res.reportedPrice, 2650);
      assert.ok(res.reason.includes('is below target'));
    });

    test('Duplicate alert suppression: does NOT re-trigger for the same report date', async () => {
      const testAlert = {
        id: 'test_alert_suppress_duplicate',
        commodity: 'Wheat',
        district: 'Datia',
        market: 'Datia APMC',
        targetPrice: 2500,
        recipientPhone: '919876543210',
        consent: true,
        status: 'triggered',
        lastTriggeredReportDate: '2026-10-28' // already triggered for today
      };

      const mockRecords = [
        {
          commodity: 'Wheat',
          district: 'Datia',
          market: 'Datia APMC',
          modalPrice: 2700,
          isPriceValid: true,
          date: '2026-10-28'
        }
      ];

      const res = await evaluateAlert(testAlert, mockRecords);
      assert.equal(res.success, true);
      assert.equal(res.triggered, false);
      assert.equal(res.alreadySentForDate, true);
      assert.ok(res.reason.includes('already sent for reported date 2026-10-28'));
    });

    test('Does NOT trigger from invalid price or missing price records (data_unavailable)', async () => {
      const testAlert = {
        id: 'test_alert_invalid_price',
        commodity: 'Wheat',
        district: 'Datia',
        targetPrice: 2500,
        recipientPhone: '919876543210',
        consent: true,
        status: 'waiting'
      };

      // Case A: isPriceValid is false
      const invalidRecords = [
        {
          commodity: 'Wheat',
          district: 'Datia',
          modalPrice: 2600,
          isPriceValid: false,
          date: '2026-10-28'
        }
      ];

      const resA = await evaluateAlert(testAlert, invalidRecords);
      assert.equal(resA.triggered, false);
      assert.equal(resA.status, 'data_unavailable');

      // Case B: empty records
      const resB = await evaluateAlert(testAlert, []);
      assert.equal(resB.triggered, false);
      assert.equal(resB.status, 'data_unavailable');
    });

    test('Refuses to trigger if explicit farmer consent is false', async () => {
      const testAlert = {
        id: 'test_alert_no_consent',
        commodity: 'Wheat',
        district: 'Datia',
        market: 'Datia APMC',
        targetPrice: 2500,
        recipientPhone: '919876543210',
        consent: false, // No consent
        status: 'waiting',
        lastTriggeredReportDate: null
      };

      const mockRecords = [
        {
          commodity: 'Wheat',
          district: 'Datia',
          market: 'Datia APMC',
          modalPrice: 2700,
          isPriceValid: true,
          date: '2026-10-28'
        }
      ];

      const res = await evaluateAlert(testAlert, mockRecords);
      assert.equal(res.success, false);
      assert.equal(res.triggered, false);
      assert.match(res.reason, /consent/i);
    });
  });

  // =========================================================================
  // 6. Alert Storage CRUD & Notification History
  // =========================================================================
  describe('Alert Storage Persistence', () => {
    beforeEach(() => {
      alertStorage._resetStorageForTesting({ alerts: [], notifications: [] });
    });

    test('createAlert saves alert, masks phone, and retrieves without exposing raw phone by default', () => {
      const created = alertStorage.createAlert({
        commodity: 'Gram',
        district: 'Indore',
        market: 'Choithram Mandi',
        targetPrice: 6200,
        recipientPhone: '919876543210',
        consent: true
      });

      assert.ok(created.id);
      assert.equal(created.commodity, 'Gram');
      assert.equal(created.targetPrice, 6200);
      assert.equal(created.maskedPhone, '91******3210');
      assert.equal(created.recipientPhone, undefined); // raw phone hidden

      const all = alertStorage.getAllAlerts();
      assert.equal(all.length, 1);
      assert.equal(all[0].id, created.id);
      assert.equal(all[0].recipientPhone, undefined);
    });

    test('deleteAlert removes the alert', () => {
      const created = alertStorage.createAlert({
        commodity: 'Gram',
        district: 'Indore',
        targetPrice: 6200,
        recipientPhone: '919876543210',
        consent: true
      });

      const deleted = alertStorage.deleteAlert(created.id);
      assert.equal(deleted, true);

      const all = alertStorage.getAllAlerts();
      assert.equal(all.length, 0);
    });

    test('logNotification maintains delivery logs in history', () => {
      const log = alertStorage.logNotification({
        alertId: 'alert_1',
        type: 'price_threshold_met',
        commodity: 'Mustard',
        mandi: 'Jaipur (Muhana Mandi)',
        reportedPrice: 5600,
        targetPrice: 5500,
        reportDate: '2026-10-28',
        recipientPhone: '919876543210',
        status: 'simulated',
        isSimulated: true
      });

      assert.ok(log.id);
      assert.equal(log.recipientPhone, '91******3210');

      const history = alertStorage.getNotificationHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].commodity, 'Mustard');
      assert.equal(history[0].isSimulated, true);
    });
  });

});
