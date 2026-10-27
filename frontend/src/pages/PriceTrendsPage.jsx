import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, AlertCircle, Info, RefreshCw, BarChart2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import PriceTrendChart from '../components/PriceTrendChart';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS, POPULAR_STATES, STATE_DISTRICTS_MAP, SUGGESTED_DISTRICTS } from '../utils/translations';
import { getPriceTrend } from '../services/api';

export default function PriceTrendsPage() {
  const { lang } = useLanguage();

  const [commodity, setCommodity] = useState('Wheat');
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Lucknow');
  const [days, setDays] = useState(7);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const currentDistricts = STATE_DISTRICTS_MAP[state] || SUGGESTED_DISTRICTS;

  const handleStateChange = (newState) => {
    setState(newState);
    const districtsForState = STATE_DISTRICTS_MAP[newState];
    if (districtsForState && districtsForState.length > 0) {
      setDistrict(districtsForState[0]);
    } else {
      setDistrict('');
    }
  };

  const fetchTrend = async (customParams = null) => {
    const c = customParams?.commodity ?? commodity;
    const d = customParams?.district !== undefined ? customParams.district : district;
    const s = customParams?.state !== undefined ? customParams.state : state;
    const dy = customParams?.days ?? days;

    setLoading(true);
    setError(null);

    const res = await getPriceTrend({
      commodity: c,
      district: d,
      state: s,
      days: dy
    });

    setLoading(false);
    if (!res.success) {
      setError({ message: res.message || res.error?.message, hint: res.hint || res.error?.hint });
      setData(null);
    } else {
      setData(res);
    }
  };

  useEffect(() => {
    fetchTrend();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTrend();
  };

  const trend = data?.trend;
  const isNoData = data?.status === 'no_data' || (data?.success && !trend?.hasData && trend?.dataPoints === 0);
  const isInsufficient = data?.status === 'insufficient_data' || trend?.insufficientHistory || (trend && trend.dataPoints < 2);

  // Direction color and badge
  const isRising = trend?.direction === 'badha' || trend?.directionEnglish === 'rising';
  const isFalling = trend?.direction === 'ghata' || trend?.directionEnglish === 'falling';
  const isStable = trend?.direction === 'sthir' || trend?.directionEnglish === 'stable';

  // Calendar series for table and bar visualization (never treat null as 0)
  const calendarSeries = trend?.calendarSeries || [];
  const validPrices = calendarSeries.filter(pt => pt.modalPrice !== null && !isNaN(pt.modalPrice));
  const maxPriceVal = validPrices.length > 0 ? Math.max(...validPrices.map(pt => pt.modalPrice)) : 1;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title={lang === 'hi' ? 'मूल्य रुझान विश्लेषण' : 'Price Trend Analysis'}
        subtitle={
          lang === 'hi'
            ? 'सत्यापित वास्तविक बाज़ार भावों के आधार पर भाव में आया बदलाव।'
            : 'Genuine price trend calculation based on reported APMC mandi observations.'
        }
        badge="Pure Math Grounded"
      />

      {/* Filter Form */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {/* 1. Commodity Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {lang === 'hi' ? 'फसल' : 'Commodity'}
            </label>
            <select
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none cursor-pointer"
            >
              {POPULAR_CROPS.map((c) => (
                <option key={c.value} value={c.value}>
                  {lang === 'hi' ? c.labelHi : c.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* 2. State Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {lang === 'hi' ? 'राज्य' : 'State'}
            </label>
            <select
              value={state}
              onChange={(e) => handleStateChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none cursor-pointer"
            >
              {POPULAR_STATES.filter((s) => s.value).map((st) => (
                <option key={st.value} value={st.value}>
                  {lang === 'hi' ? st.labelHi : st.labelEn}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Dependent District Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              {lang === 'hi' ? 'ज़िला' : 'District'}
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none cursor-pointer"
            >
              <option value="">{lang === 'hi' ? '-- सभी ज़िले --' : '-- All Districts --'}</option>
              {currentDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Days & Submit */}
          <div className="flex items-center gap-2">
            <div className="w-24 flex-shrink-0">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                {lang === 'hi' ? 'अवधि' : 'Days'}
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-2.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none cursor-pointer"
              >
                <option value={7}>7 {lang === 'hi' ? 'दिन' : 'days'}</option>
                <option value={14}>14 {lang === 'hi' ? 'दिन' : 'days'}</option>
                <option value={30}>30 {lang === 'hi' ? 'दिन' : 'days'}</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <TrendingUp size={16} />}
              <span>{lang === 'hi' ? 'रुझान देखें' : 'View Trend'}</span>
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500">
            {lang === 'hi' ? 'सुझाए गए ज़िले:' : 'Quick Districts:'}
          </span>
          {currentDistricts.slice(0, 8).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDistrict(d);
                fetchTrend({ district: d });
              }}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                district.toLowerCase() === d.toLowerCase()
                  ? 'bg-[#166534] text-white border-[#166534]'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {loading && <LoadingIndicator message={lang === 'hi' ? 'रुझान का विश्लेषण हो रहा है...' : 'Calculating trend...'} />}
      {error && <ErrorMessage message={error.message} hint={error.hint} onRetry={() => fetchTrend()} />}

      {/* No Data State */}
      {!loading && !error && isNoData && (
        <div className="bg-amber-50/70 border border-amber-200 p-8 rounded-3xl text-center">
          <AlertCircle size={32} className="mx-auto text-amber-600 mb-2" />
          <h3 className="text-lg font-bold text-gray-900">
            {lang === 'hi' ? 'मंडी मूल्य रिकॉर्ड उपलब्ध नहीं' : 'No Mandi Price Records Found'}
          </h3>
          <p className="text-gray-700 text-sm max-w-md mx-auto mt-1">
            {data?.message || (lang === 'hi'
              ? `${district} में ${commodity} के लिए कोई हालिया भाव रिकॉर्ड नहीं मिला। रुझान तय नहीं किया जा सकता।`
              : `No recent records for ${commodity} in ${district}. Price trend cannot be determined.`)}
          </p>
        </div>
      )}

      {/* Insufficient History (< 2 points) */}
      {!loading && !error && !isNoData && isInsufficient && (
        <div className="bg-blue-50/70 border border-blue-200 p-6 rounded-3xl text-left">
          <div className="flex items-start gap-3">
            <Info size={24} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-blue-900 text-base">
                {lang === 'hi' ? 'सीमित ऐतिहासिक डेटा (Insufficient History)' : 'Insufficient Historical Data'}
              </h3>
              <p className="text-blue-800 text-sm mt-1">
                {trend?.explanation || data?.message || (lang === 'hi'
                  ? `इस अवधि में केवल ${trend?.dataPoints || 1} रिपोर्टेड तारीख उपलब्ध है। रुझान की गणना के लिए कम से कम 2 अलग-अलग तिथियों के भाव आवश्यक हैं।`
                  : `Only ${trend?.dataPoints || 1} recorded date available in this timeframe. Trend requires at least 2 distinct dates.`)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Valid Trend Display */}
      {!loading && !error && !isNoData && !isInsufficient && trend && trend.hasData && (
        <div className="space-y-6">
          {/* Prominent Written Trend Summary Card */}
          <div className={`p-6 rounded-3xl border shadow-sm ${
            isRising
              ? 'bg-emerald-50/80 border-emerald-300'
              : isFalling
              ? 'bg-rose-50/80 border-rose-300'
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                {isRising && <TrendingUp size={24} className="text-emerald-700" />}
                {isFalling && <TrendingDown size={24} className="text-rose-700" />}
                {isStable && <Minus size={24} className="text-gray-700" />}
                <span className="font-black text-xl text-gray-900">
                  {isRising ? (lang === 'hi' ? 'भाव बढ़ा (Rising)' : 'Price Increased') :
                   isFalling ? (lang === 'hi' ? 'भाव घटा (Falling)' : 'Price Decreased') :
                   (lang === 'hi' ? 'भाव स्थिर रहा (Stable)' : 'Price Stable')}
                </span>
              </div>

              <div className="text-xs font-semibold px-3 py-1 bg-white rounded-full border shadow-xs text-gray-700 flex items-center gap-1.5">
                <Calendar size={13} className="text-[#166534]" />
                <span>
                  {trend.startDate} से {trend.latestDate}
                </span>
              </div>
            </div>

            {/* Explanation text */}
            <p className="text-gray-800 text-base md:text-lg font-medium leading-relaxed">
              {trend.explanation}
            </p>

            {/* Statistics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-black/10">
              <div className="bg-white/80 p-3 rounded-xl border border-black/5">
                <span className="text-xs text-gray-500 font-semibold block">{lang === 'hi' ? 'शुरुआती भाव' : 'Start Price'}</span>
                <span className="text-lg font-bold text-gray-800 block">₹{trend.startPrice?.toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-black/5">
                <span className="text-xs text-gray-500 font-semibold block">{lang === 'hi' ? 'नवीनतम भाव' : 'Latest Price'}</span>
                <span className="text-lg font-extrabold text-[#166534] block">₹{trend.latestPrice?.toLocaleString('en-IN')}</span>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-black/5">
                <span className="text-xs text-gray-500 font-semibold block">{lang === 'hi' ? 'मूल्य परिवर्तन' : 'Change'}</span>
                <span className={`text-lg font-black block ${
                  isRising ? 'text-emerald-700' : isFalling ? 'text-rose-700' : 'text-gray-800'
                }`}>
                  {trend.priceChange > 0 ? `+₹${trend.priceChange}` : `₹${trend.priceChange}`}
                  <span className="text-xs ml-1 font-semibold">({trend.percentChange}%)</span>
                </span>
              </div>

              <div className="bg-white/80 p-3 rounded-xl border border-black/5">
                <span className="text-xs text-gray-500 font-semibold block">{lang === 'hi' ? 'रिकॉर्ड दिन' : 'Observed Points'}</span>
                <span className="text-lg font-bold text-gray-800 block">{trend.dataPoints} {lang === 'hi' ? 'दिन' : 'days'}</span>
              </div>
            </div>
          </div>

          {/* Interactive Agricultural Price Trend Chart (Smooth Line & Bar Views) */}
          <PriceTrendChart
            calendarSeries={calendarSeries}
            lang={lang}
            commodity={commodity}
            district={district}
          />

          {/* Historical Table */}
          {calendarSeries.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm">
                {lang === 'hi' ? 'तारीख वार सरकारी अवलोकन' : 'Date-wise Observations'}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm">
                  <thead className="bg-[#0f3d24] text-white uppercase font-bold">
                    <tr>
                      <th className="py-2.5 px-4">{lang === 'hi' ? 'तारीख (Date)' : 'Date'}</th>
                      <th className="py-2.5 px-4">{lang === 'hi' ? 'स्थिति' : 'Status'}</th>
                      <th className="py-2.5 px-4 text-right">{lang === 'hi' ? 'मॉडल भाव (₹/क्विंटल)' : 'Modal Price (₹/Qtl)'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calendarSeries.map((row, i) => (
                      <tr key={i} className={row.modalPrice ? 'hover:bg-gray-50' : 'bg-gray-50/50 text-gray-400 italic'}>
                        <td className="py-2.5 px-4 font-semibold text-gray-800">{row.date}</td>
                        <td className="py-2.5 px-4">
                          {row.modalPrice ? (
                            <span className="text-emerald-700 font-bold">दर्ज (Reported)</span>
                          ) : (
                            <span className="text-gray-400">डाटा अनुपलब्ध / बंद</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-gray-900">
                          {row.modalPrice ? `₹${Number(row.modalPrice).toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
