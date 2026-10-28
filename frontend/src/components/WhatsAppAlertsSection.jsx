import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle,
  AlertTriangle,
  Clock,
  Phone,
  Send,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import {
  POPULAR_CROPS,
  POPULAR_STATES,
  STATE_DISTRICTS_MAP
} from '../utils/translations';
import {
  getAlerts,
  createAlert,
  deleteAlert,
  checkAlert,
  sendTestAlert,
  getAlertHistory,
  getWhatsAppStatus,
  getTodayPrices
} from '../services/api';

export default function WhatsAppAlertsSection() {
  const { t, lang } = useLanguage();
  const alertT = t.alerts || {};

  // Form State
  const [selectedCrop, setSelectedCrop] = useState('Wheat');
  const [selectedState, setSelectedState] = useState('Uttar Pradesh');
  const [selectedDistrict, setSelectedDistrict] = useState('Lucknow');
  const [targetPrice, setTargetPrice] = useState('2400');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);

  // Status & Feedback States
  const [systemStatus, setSystemStatus] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [savingAlert, setSavingAlert] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [checkingAlertId, setCheckingAlertId] = useState(null);
  const [formFeedback, setFormFeedback] = useState(null); // { type: 'success'|'error', message }
  const [testResult, setTestResult] = useState(null);
  const [showHistory, setShowHistory] = useState(true);

  // Live price preview for the selected form inputs
  const [previewRate, setPreviewRate] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Phone validation helper (Indian 10-digit)
  const isPhoneValid = /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
  const isTargetValid = Number(targetPrice) > 0;
  const isFormValid = selectedCrop && selectedDistrict && isTargetValid && isPhoneValid && consent;

  // 1. Initial Load of Alerts, Status, and History
  const loadData = async () => {
    setLoadingAlerts(true);
    try {
      const [statusRes, alertsRes, historyRes] = await Promise.all([
        getWhatsAppStatus(),
        getAlerts(),
        getAlertHistory(15)
      ]);

      if (statusRes && statusRes.success) {
        setSystemStatus(statusRes);
      }
      if (alertsRes && alertsRes.success) {
        setAlerts(alertsRes.alerts || []);
      }
      if (historyRes && historyRes.success) {
        setHistory(historyRes.history || []);
      }
    } catch (err) {
      console.warn('[WhatsAppAlerts] Load error:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 2. Fetch live price preview when crop or district changes
  useEffect(() => {
    let isCancelled = false;
    const fetchCurrentRate = async () => {
      if (!selectedCrop || !selectedDistrict) {
        setPreviewRate(null);
        return;
      }
      setLoadingPreview(true);
      try {
        const res = await getTodayPrices({
          commodity: selectedCrop,
          district: selectedDistrict,
          state: selectedState,
          limit: 10
        });

        if (!isCancelled) {
          if (res && res.success && res.records && res.records.length > 0) {
            const firstValid = res.records.find((r) => r.isPriceValid && r.modalPrice > 0);
            if (firstValid) {
              setPreviewRate({
                modalPrice: firstValid.modalPrice,
                market: firstValid.market || selectedDistrict,
                date: firstValid.date || firstValid.arrivalDate,
                isMockData: Boolean(res.isMockData)
              });
            } else {
              setPreviewRate(null);
            }
          } else {
            setPreviewRate(null);
          }
        }
      } catch {
        if (!isCancelled) setPreviewRate(null);
      } finally {
        if (!isCancelled) setLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchCurrentRate, 400);
    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [selectedCrop, selectedDistrict, selectedState]);

  // Handle State Change
  const handleStateChange = (stateName) => {
    setSelectedState(stateName);
    const districts = STATE_DISTRICTS_MAP[stateName];
    if (districts && districts.length > 0) {
      setSelectedDistrict(districts[0]);
    }
  };

  // 3. Create Alert Action
  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSavingAlert(true);
    setFormFeedback(null);

    const payload = {
      commodity: selectedCrop,
      state: selectedState,
      district: selectedDistrict,
      targetPrice: Number(targetPrice),
      recipientPhone: phone.replace(/\D/g, ''),
      consent: true
    };

    const res = await createAlert(payload);
    setSavingAlert(false);

    if (res.success) {
      setFormFeedback({
        type: 'success',
        message: lang === 'hi'
          ? `✓ ${selectedCrop} के लिए ₹${targetPrice} पर व्हाट्सएप अलर्ट सफलतापूर्वक सेट किया गया!`
          : `✓ WhatsApp price alert set successfully for ${selectedCrop} at ₹${targetPrice}/quintal!`
      });
      setPhone('');
      setConsent(false);
      loadData();
    } else {
      setFormFeedback({
        type: 'error',
        message: res.error || (lang === 'hi' ? 'अलर्ट सेट करने में त्रुटि हुई।' : 'Failed to save alert.')
      });
    }
  };

  // 4. Delete Alert Action
  const handleDeleteAlert = async (id) => {
    const res = await deleteAlert(id);
    if (res.success) {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    }
  };

  // 5. Check Single Alert Action
  const handleCheckAlert = async (id) => {
    setCheckingAlertId(id);
    const res = await checkAlert(id);
    setCheckingAlertId(null);
    if (res.success && res.alert) {
      setAlerts((prev) => prev.map((a) => (a.id === id ? res.alert : a)));
      // Refresh history log if an alert was triggered
      if (res.evaluation && res.evaluation.triggered) {
        const histRes = await getAlertHistory(15);
        if (histRes.success) setHistory(histRes.history);
      }
    }
  };

  // 6. Explicit Send Test Alert Action
  const handleSendTest = async () => {
    setSendingTest(true);
    setTestResult(null);

    const res = await sendTestAlert();
    setSendingTest(false);
    setTestResult(res);

    // Refresh history
    const histRes = await getAlertHistory(15);
    if (histRes.success) setHistory(histRes.history);
  };

  const isDemoMode = systemStatus?.whatsapp?.mode === 'demo';

  return (
    <div className="bg-white rounded-3xl border border-emerald-100 shadow-sm overflow-hidden my-8">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0f3d24] via-[#166534] to-[#14532d] text-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300 shrink-0 shadow-inner">
              <Bell size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl md:text-2xl font-black tracking-tight">
                  {alertT.title || 'WhatsApp Mandi Price Alerts'}
                </h3>
                {/* Safe Demo vs Live Badge */}
                {isDemoMode ? (
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    [SIMULATED — NOT SENT] Safe Demo Mode
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 rounded-full text-xs font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Live WhatsApp Cloud API ({systemStatus?.whatsapp?.apiVersion || 'v22.0'})
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
                {alertT.subtitle || 'Get instant WhatsApp notifications when the official reported modal rate reaches or exceeds your target price.'}
              </p>
            </div>
          </div>

          {/* Test Alert Button */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleSendTest}
              disabled={sendingTest}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
              title="Sends an explicit test message strictly to the verified test recipient"
            >
              {sendingTest ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{alertT.btnTesting || 'Sending Test...'}</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>{alertT.btnTest || 'Send Test Alert'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo Mode Notice Banner */}
        {isDemoMode && (
          <div className="mt-4 p-3 bg-amber-500/15 border border-amber-400/30 rounded-xl text-xs text-amber-100 flex items-start gap-2 leading-relaxed">
            <Info size={16} className="text-amber-300 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-200">DEMO MODE ACTIVE: </span>
              Meta WhatsApp Cloud API credentials are not yet configured in <code className="bg-black/30 px-1 py-0.5 rounded text-amber-200 font-mono">.env</code>. Alerts and target evaluations run safely in simulation mode with simulated delivery receipts labelled <span className="font-bold underline">[SIMULATED — NOT SENT]</span>. No real WhatsApp messages will be dispatched until a valid Meta access token and phone number ID are provided.
            </div>
          </div>
        )}

        {/* Test Result Feedback Modal / Card */}
        {testResult && (
          <div className="mt-4 p-4 bg-white text-gray-900 rounded-2xl shadow-lg border border-gray-200 transition-all">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <CheckCircle size={18} className="text-emerald-600" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-600" />
                )}
                <span className="font-bold text-sm">
                  {testResult.message || (testResult.success ? 'Test Dispatched' : 'Test Failed')}
                </span>
                {testResult.result?.isSimulated && (
                  <span className="text-[11px] font-extrabold px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                    [SIMULATED — NOT SENT]
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>
            {testResult.result?.previewMessage && (
              <pre className="mt-3 p-3 bg-gray-50 rounded-xl text-xs font-mono text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-200">
                {testResult.result.previewMessage}
              </pre>
            )}
            {testResult.result?.error && (
              <p className="mt-2 text-xs text-red-600 font-medium">
                {testResult.result.error}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-6 md:p-8 space-y-8">
        {/* 2. New Alert Form & Live Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Side (7 cols) */}
          <div className="lg:col-span-7 bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100">
            <h4 className="text-base font-extrabold text-[#0f3d24] mb-4 flex items-center gap-2">
              <Bell size={18} className="text-[#166534]" />
              {alertT.formHeading || 'Set New Price Alert'}
            </h4>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              {/* Row 1: Crop and State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {alertT.cropLabel || 'Crop / Commodity'}
                  </label>
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  >
                    {POPULAR_CROPS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {lang === 'hi' ? c.labelHi : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {t.home.stateLabel || 'State'}
                  </label>
                  <select
                    value={selectedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  >
                    {POPULAR_STATES.filter((s) => s.value).map((s) => (
                      <option key={s.value} value={s.value}>
                        {lang === 'hi' ? s.labelHi : s.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: District and Target Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {alertT.districtLabel || 'District / Mandi'}
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  >
                    {(STATE_DISTRICTS_MAP[selectedState] || []).map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    {alertT.targetPriceLabel || 'Target Modal Price (₹/Quintal)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="10"
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(e.target.value)}
                      placeholder={alertT.targetPricePlaceholder || 'e.g. 2600'}
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: WhatsApp Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>{alertT.phoneLabel || 'WhatsApp Mobile Number'}</span>
                  <span className="text-[11px] text-gray-500 font-normal">
                    {phone && !isPhoneValid && (
                      <span className="text-red-600 font-semibold">10-digit number required</span>
                    )}
                    {phone && isPhoneValid && (
                      <span className="text-emerald-700 font-semibold">✓ Valid Indian number</span>
                    )}
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-gray-500 font-bold text-sm border-r border-gray-200 pr-2">
                    <Phone size={14} className="text-[#166534]" />
                    <span>+91</span>
                  </div>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder={alertT.phonePlaceholder || '10-digit mobile number (e.g. 9876543210)'}
                    className="w-full pl-20 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition tracking-wider"
                  />
                </div>
              </div>

              {/* Row 4: Explicit Farmer Consent Checkbox */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200/80 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="farmerConsent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="farmerConsent" className="text-xs text-gray-700 leading-relaxed cursor-pointer select-none">
                  <span className="font-bold text-gray-900 block mb-0.5">
                    {lang === 'hi' ? 'स्पष्ट किसान सहमति (Explicit Consent Required):' : 'Farmer Consent Required:'}
                  </span>
                  {alertT.consentText ||
                    'I explicitly consent to receive WhatsApp price alert notifications for this crop and mandi at this mobile number. I understand these are reported government mandi rates, not guaranteed selling prices.'}
                </label>
              </div>

              {/* Feedback Alert Message */}
              {formFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    formFeedback.type === 'success'
                      ? 'bg-emerald-100 text-[#166534] border border-emerald-300'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {formFeedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  <span>{formFeedback.message}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isFormValid || savingAlert}
                className="w-full py-3 px-6 bg-[#166534] hover:bg-[#0f3d24] active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {savingAlert ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>{alertT.btnSaving || 'Saving Alert...'}</span>
                  </>
                ) : (
                  <>
                    <Bell size={18} />
                    <span>{alertT.btnSave || 'Save Price Alert'}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right Preview Side (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 bg-gradient-to-br from-gray-50 to-emerald-50/20 rounded-2xl border border-gray-200">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {lang === 'hi' ? 'सरकारी दर तुलना पूर्वावलोकन' : 'Live Official Rate Comparison'}
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Agmarknet
                </span>
              </div>

              {loadingPreview ? (
                <div className="py-8 flex flex-col items-center justify-center text-gray-500 gap-2">
                  <RefreshCw size={20} className="animate-spin text-[#166534]" />
                  <span className="text-xs font-medium">
                    {lang === 'hi' ? 'वर्तमान मंडी भाव जांच रहे हैं...' : 'Checking current market rates...'}
                  </span>
                </div>
              ) : previewRate ? (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                    <div className="text-xs text-gray-500">
                      {selectedCrop} — {previewRate.market} ({selectedDistrict})
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-2xl font-black text-[#0f3d24]">
                        ₹{previewRate.modalPrice}
                      </span>
                      <span className="text-xs font-bold text-gray-500">/ क्विंटल</span>
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      रिपोर्टिंग तारीख: <span className="font-bold text-gray-700">{previewRate.date}</span>
                    </div>
                  </div>

                  {/* Target Comparison Indicator */}
                  <div className="p-3.5 rounded-xl border bg-white shadow-sm">
                    <div className="text-xs font-bold text-gray-700 mb-2">
                      लक्ष्य भाव स्थिति (Target Threshold Status):
                    </div>
                    {Number(previewRate.modalPrice) >= Number(targetPrice) ? (
                      <div className="flex items-start gap-2 text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs">
                        <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">लक्ष्य प्राप्त! (Threshold Met)</span>
                          <p className="mt-0.5 text-[11px] text-emerald-700 leading-tight">
                            वर्तमान भाव (₹{previewRate.modalPrice}) आपके लक्ष्य (₹{targetPrice}) से अधिक या बराबर है। अलर्ट तुरंत ट्रिगर होगा।
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-xs">
                        <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">प्रतीक्षारत (Waiting for Target)</span>
                          <p className="mt-0.5 text-[11px] text-amber-700 leading-tight">
                            वर्तमान भाव (₹{previewRate.modalPrice}) लक्ष्य (₹{targetPrice}) से ₹{Number(targetPrice) - Number(previewRate.modalPrice)} कम है। भाव बढ़ते ही सूचित किया जाएगा।
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 px-4 bg-white rounded-xl border border-gray-200 text-center text-xs text-gray-600 leading-relaxed">
                  <Info size={20} className="mx-auto mb-2 text-gray-400" />
                  चुने गए ज़िले में {selectedCrop} का आज का सरकारी भाव उपलब्ध नहीं है। अलर्ट सक्रिय रहेगा और नया डेटा आते ही मूल्यांकन करेगा।
                </div>
              )}
            </div>

            {/* Informational Disclaimer Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 text-[11px] text-gray-500 leading-relaxed flex items-start gap-2">
              <ShieldCheck size={16} className="text-[#166534] shrink-0 mt-0.5" />
              <span>
                {alertT.disclaimerNote ||
                  'Alerts are based on official modal prices from Agmarknet (data.gov.in). Reported rates are informational averages, not guaranteed selling prices.'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Active Alerts List */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base md:text-lg font-black text-[#0f3d24] flex items-center gap-2">
              <Bell size={20} className="text-[#166534]" />
              <span>{alertT.activeAlertsHeading || 'Active Price Alerts'}</span>
              <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-[#166534] rounded-full">
                {alerts.length}
              </span>
            </h4>
            <button
              type="button"
              onClick={loadData}
              disabled={loadingAlerts}
              className="text-xs font-bold text-[#166534] hover:text-[#0f3d24] flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-emerald-50 transition cursor-pointer"
            >
              <RefreshCw size={14} className={loadingAlerts ? 'animate-spin' : ''} />
              <span>{lang === 'hi' ? 'रिफ्रेश करें' : 'Refresh'}</span>
            </button>
          </div>

          {alerts.length === 0 ? (
            <div className="p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300 text-center">
              <Bell size={28} className="mx-auto text-gray-400 mb-2 opacity-50" />
              <p className="text-sm font-semibold text-gray-600">
                {alertT.noAlerts || 'No price alerts registered yet. Create your first alert using the form above.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((alert) => {
                const isChecking = checkingAlertId === alert.id;
                let statusBadge = (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[11px] font-bold flex items-center gap-1">
                    <Clock size={12} />
                    {alertT.statusWaiting || 'Waiting'}
                  </span>
                );

                if (alert.status === 'triggered') {
                  statusBadge = (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-bold flex items-center gap-1">
                      <CheckCircle size={12} />
                      {alertT.statusTriggered || 'Triggered'}
                    </span>
                  );
                } else if (alert.status === 'data_unavailable') {
                  statusBadge = (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 border border-gray-300 rounded-full text-[11px] font-bold flex items-center gap-1">
                      <AlertTriangle size={12} />
                      {alertT.statusUnavailable || 'Data Unavailable'}
                    </span>
                  );
                }

                return (
                  <div
                    key={alert.id}
                    className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h5 className="font-black text-gray-900 text-base">
                            {alert.commodity}
                          </h5>
                          <p className="text-xs text-gray-600">
                            {alert.market || alert.district} ({alert.state || 'India'})
                          </p>
                        </div>
                        {statusBadge}
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl space-y-1.5 text-xs text-gray-700 mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">लक्ष्य भाव (Target):</span>
                          <span className="font-black text-emerald-800">
                            ₹{alert.targetPrice}/क्विंटल
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">रिपोर्टेड भाव (Latest):</span>
                          <span className="font-bold text-gray-900">
                            {alert.lastReportedPrice ? `₹${alert.lastReportedPrice}/क्विंटल` : '—'}
                          </span>
                        </div>
                        {alert.lastReportDate && (
                          <div className="flex justify-between text-[11px]">
                            <span className="text-gray-400">तारीख (Date):</span>
                            <span className="text-gray-600 font-medium">{alert.lastReportDate}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-[11px]">
                          <span className="text-gray-400">प्राप्तकर्ता (Recipient):</span>
                          <span className="text-gray-700 font-mono font-semibold">
                            {alert.maskedPhone || '91******XXXX'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Alert Card Action Buttons */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => handleCheckAlert(alert.id)}
                        disabled={isChecking}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#166534] rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
                        <span>{alertT.btnCheckNow || 'Check Now'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title={alertT.btnDelete || 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Alert Notification History Log (Collapsible) */}
        <div className="border-t border-gray-200 pt-6">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-left py-2 text-gray-800 hover:text-[#166534] transition cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-[#166534]" />
              <h4 className="text-base font-extrabold text-[#0f3d24]">
                {alertT.historyHeading || 'Recent Alert History (Delivery Log)'}
              </h4>
              <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {history.length}
              </span>
            </div>
            {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {showHistory && (
            <div className="mt-4">
              {history.length === 0 ? (
                <p className="text-xs text-gray-500 py-3">
                  {alertT.noHistory || 'No alert delivery history yet.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-y border-gray-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3">समय (Timestamp)</th>
                        <th className="py-2.5 px-3">फसल व मंडी (Crop & Mandi)</th>
                        <th className="py-2.5 px-3">रिपोर्टेड / लक्ष्य (Reported / Target)</th>
                        <th className="py-2.5 px-3">प्राप्तकर्ता (Recipient)</th>
                        <th className="py-2.5 px-3">स्थिति (Status)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {history.map((item) => {
                        let statusPill = (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded font-semibold text-[11px]">
                            {item.status}
                          </span>
                        );
                        if (item.status === 'delivered') {
                          statusPill = (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px] flex items-center gap-1 w-fit">
                              <CheckCircle size={10} />
                              Delivered (Meta API)
                            </span>
                          );
                        } else if (item.status === 'simulated' || item.isSimulated) {
                          statusPill = (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[11px] flex items-center gap-1 w-fit">
                              [SIMULATED — NOT SENT]
                            </span>
                          );
                        } else if (item.status === 'failed') {
                          statusPill = (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-bold text-[11px] flex items-center gap-1 w-fit">
                              <AlertTriangle size={10} />
                              Failed
                            </span>
                          );
                        }

                        const formattedTime = item.timestamp
                          ? new Date(item.timestamp).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short'
                            })
                          : '—';

                        return (
                          <tr key={item.id} className="hover:bg-gray-50/80 transition">
                            <td className="py-3 px-3 font-mono text-gray-500 whitespace-nowrap">
                              {formattedTime}
                            </td>
                            <td className="py-3 px-3 font-semibold text-gray-900">
                              {item.commodity} ({item.mandi})
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-black text-emerald-800">
                                ₹{item.reportedPrice}
                              </span>
                              {item.targetPrice && (
                                <span className="text-gray-400 font-normal ml-1">
                                  / लक्ष्य ₹{item.targetPrice}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-gray-600">
                              {item.recipientPhone || '—'}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              {statusPill}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

