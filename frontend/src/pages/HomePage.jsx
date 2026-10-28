import React, { useState, useEffect } from 'react';
import { Search, MapPin, Wheat, RefreshCw, TrendingUp, Scale, Compass, Bot, ShieldCheck, Bell } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS, POPULAR_STATES, SUGGESTED_DISTRICTS, STATE_DISTRICTS_MAP } from '../utils/translations';
import { getTodayPrices } from '../services/api';
import PriceCard from '../components/PriceCard';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import WhatsAppAlertsSection from '../components/WhatsAppAlertsSection';

export default function HomePage({ onNavigate }) {
  const { t, lang } = useLanguage();

  // Search filter states
  const [commodity, setCommodity] = useState('Wheat');
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Lucknow');

  const handleStateChange = (selectedState) => {
    setState(selectedState);
    const districtsForState = STATE_DISTRICTS_MAP[selectedState];
    const defaultDistrict = districtsForState && districtsForState.length > 0 ? districtsForState[0] : '';
    setDistrict(defaultDistrict);
  };

  const currentDistricts = (state && STATE_DISTRICTS_MAP[state]) || SUGGESTED_DISTRICTS;

  // API data & loading states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Fetch prices from backend
  const fetchPrices = async (customParams = null) => {
    const selectedCommodity = customParams?.commodity !== undefined ? customParams.commodity : commodity;
    const selectedDistrict = customParams?.district !== undefined ? customParams.district : district;
    const selectedState = customParams?.state !== undefined ? customParams.state : state;

    setLoading(true);
    setError(null);

    const res = await getTodayPrices({
      commodity: selectedCommodity,
      district: selectedDistrict,
      state: selectedState,
      limit: 50
    });

    setLoading(false);

    if (!res.success) {
      setError({
        message: res.message,
        hint: res.hint,
        code: res.status
      });
      setData(null);
    } else {
      setData(res);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchPrices();
  };

  const handleQuickDistrict = (districtName) => {
    setDistrict(districtName);
    fetchPrices({ district: districtName });
  };

  const records = data?.records || [];
  const primaryRecord = records.length > 0 ? records[0] : null;
  const secondaryRecords = records.length > 1 ? records.slice(1) : [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* 1. Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-[#0f3d24] to-[#166534] text-white p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        {/* Subtle decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-800/80 border border-emerald-500/30 text-emerald-200 text-xs font-semibold rounded-full mb-3">
            <ShieldCheck size={14} className="text-[#22c55e]" />
            <span>{t.home.sourceNotice}</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            {t.home.welcomeTitle}
          </h2>
          <p className="mt-2 text-emerald-100/90 text-sm md:text-base leading-relaxed">
            {t.home.welcomeSubtitle}
          </p>
        </div>
      </div>

      {/* 2. Crop & Mandi Lookup Filter Form */}
      <div className="bg-white p-6 md:p-7 rounded-3xl border border-gray-200/80 shadow-md">
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-100">
          <h3 className="text-lg md:text-xl font-bold text-[#0f3d24] flex items-center gap-2">
            <Search className="text-[#166534]" size={20} />
            <span>{t.home.quickLookupHeading}</span>
          </h3>
          <span className="text-xs text-gray-500 hidden sm:inline-block">
            दैनिक अपडेट • data.gov.in
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Commodity Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t.home.commodityLabel}
              </label>
              <div className="relative">
                <select
                  value={commodity}
                  onChange={(e) => setCommodity(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] focus:border-transparent outline-none transition cursor-pointer appearance-none"
                >
                  {POPULAR_CROPS.map((crop) => (
                    <option key={crop.value} value={crop.value}>
                      {lang === 'hi' ? crop.labelHi : crop.labelEn}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Wheat size={18} />
                </div>
              </div>
            </div>

            {/* 2. State Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t.home.stateLabel}
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] focus:border-transparent outline-none transition cursor-pointer"
              >
                {POPULAR_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {lang === 'hi' ? st.labelHi : st.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. District Dropdown (Dependent on chosen state) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {t.home.districtLabel}
              </label>
              <div className="relative">
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] focus:border-transparent outline-none transition cursor-pointer appearance-none"
                >
                  <option value="">
                    {lang === 'hi' ? '-- सभी ज़िले (All Districts) --' : '-- All Districts --'}
                  </option>
                  {currentDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <MapPin size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Suggested Quick Districts Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-bold text-gray-500 mr-1">
              {t.home.suggestedDistricts}
            </span>
            {currentDistricts.slice(0, 8).map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => handleQuickDistrict(dist)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                  district.toLowerCase() === dist.toLowerCase()
                    ? 'bg-[#166534] text-white border-[#166534]'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {dist}
              </button>
            ))}
          </div>

          {/* Large Green Button labelled 'भाव देखें / Get Prices' */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto min-w-[260px] px-8 py-3.5 bg-[#166534] hover:bg-[#0f3d24] active:scale-[0.99] text-white font-extrabold text-base md:text-lg rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  <span>{t.home.loading}</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>{t.home.submitButton}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 3. Results Section */}
      <div>
        {loading && <LoadingIndicator message={t.home.loading} />}

        {error && (
          <ErrorMessage
            message={error.message}
            hint={error.hint}
            onRetry={() => fetchPrices()}
          />
        )}

        {!loading && !error && data && data.status === 'no_data' && (
          <EmptyState
            commodity={commodity}
            district={district}
            onSelectDistrict={(dist) => handleQuickDistrict(dist)}
          />
        )}

        {!loading && !error && primaryRecord && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl md:text-2xl font-extrabold text-[#0f3d24]">
                {t.home.latestPriceCardTitle}
              </h3>
              <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-[#166534] rounded-full">
                {t.home.recordsFound} {records.length}
              </span>
            </div>

            {/* Prominent Featured Price Card */}
            <PriceCard record={primaryRecord} isFeatured={true} />

            {/* Additional reported records in this district/state */}
            {secondaryRecords.length > 0 && (
              <div className="pt-4">
                <h4 className="text-base font-bold text-gray-800 mb-3">
                  {t.common.allRecords} ({secondaryRecords.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {secondaryRecords.map((rec, idx) => (
                    <PriceCard key={idx} record={rec} isFeatured={false} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. WhatsApp Price Alerts Section */}
      <div id="whatsapp-alerts">
        <WhatsAppAlertsSection />
      </div>

      {/* 5. Quick Feature Access Grid */}
      <div className="pt-6 border-t border-gray-200">
        <h3 className="text-xl font-extrabold text-[#0f3d24] mb-4">
          {t.home.quickFeaturesHeading}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Feature 1: Trends */}
          <div
            onClick={() => onNavigate && onNavigate('trends')}
            className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#166534] flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <TrendingUp size={22} />
              </div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#166534] transition">
                {t.home.featureTrendsTitle}
              </h4>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                {t.home.featureTrendsDesc}
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-[#166534] flex items-center gap-1">
              <span>{t.home.exploreBtn}</span>
            </div>
          </div>

          {/* Feature 2: Compare */}
          <div
            onClick={() => onNavigate && onNavigate('compare')}
            className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#166534] flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Scale size={22} />
              </div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#166534] transition">
                {t.home.featureCompareTitle}
              </h4>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                {t.home.featureCompareDesc}
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-[#166534] flex items-center gap-1">
              <span>{t.home.exploreBtn}</span>
            </div>
          </div>

          {/* Feature 3: Nearest Mandi */}
          <div
            onClick={() => onNavigate && onNavigate('nearest')}
            className="p-5 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-[#166534] flex items-center justify-center mb-3 group-hover:scale-105 transition">
                <Compass size={22} />
              </div>
              <h4 className="font-bold text-gray-900 group-hover:text-[#166534] transition">
                {t.home.featureNearestTitle}
              </h4>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                {t.home.featureNearestDesc}
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-[#166534] flex items-center gap-1">
              <span>{t.home.exploreBtn}</span>
            </div>
          </div>

          {/* Feature 4: Gemma 4 AI Assistant */}
          <div
            onClick={() => onNavigate && onNavigate('assistant')}
            className="p-5 bg-gradient-to-br from-emerald-50 to-white rounded-2xl border border-emerald-200 shadow-sm hover:shadow-md hover:border-emerald-400 transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-[#0f3d24] text-[#22c55e] flex items-center justify-center mb-3 group-hover:scale-105 transition shadow-sm">
                <Bot size={22} />
              </div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-gray-900 group-hover:text-[#166534] transition">
                  {t.home.featureAssistantTitle}
                </h4>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                {t.home.featureAssistantDesc}
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-[#166534] flex items-center gap-1">
              <span>{t.home.exploreBtn}</span>
            </div>
          </div>

          {/* Feature 5: WhatsApp Price Alerts */}
          <div
            onClick={() => {
              const el = document.getElementById('whatsapp-alerts');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-5 bg-gradient-to-br from-emerald-800 to-[#0f3d24] text-white rounded-2xl border border-emerald-700 shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-11 h-11 rounded-xl bg-white/10 text-emerald-300 flex items-center justify-center mb-3 group-hover:scale-105 transition shadow-sm">
                <Bell size={22} />
              </div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-white transition">
                  {t.home.featureAlertsTitle || 'WhatsApp Alerts'}
                </h4>
              </div>
              <p className="text-xs text-emerald-100/80 mt-1.5 leading-relaxed">
                {t.home.featureAlertsDesc || 'Receive WhatsApp alerts when rates reach your target.'}
              </p>
            </div>
            <div className="mt-4 text-xs font-bold text-emerald-300 flex items-center gap-1">
              <span>{t.home.exploreBtn}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
