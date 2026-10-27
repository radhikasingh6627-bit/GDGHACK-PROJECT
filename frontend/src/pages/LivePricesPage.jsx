import React, { useState, useEffect } from 'react';
import { Search, Store, Calendar, MapPin, Tag, RefreshCw, Navigation, ExternalLink } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { useLanguage } from '../context/LanguageContext';
import { POPULAR_CROPS, POPULAR_STATES, SUGGESTED_DISTRICTS, STATE_DISTRICTS_MAP } from '../utils/translations';
import { getTodayPrices } from '../services/api';
import { getGoogleMapsNavigationUrl, getMandiCoords } from '../utils/distance';

export default function LivePricesPage() {
  const { lang } = useLanguage();

  const [commodity, setCommodity] = useState('Wheat');
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Lucknow');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const handleStateChange = (selectedState) => {
    setState(selectedState);
    const districtsForState = STATE_DISTRICTS_MAP[selectedState];
    const defaultDistrict = districtsForState && districtsForState.length > 0 ? districtsForState[0] : '';
    setDistrict(defaultDistrict);
  };

  const currentDistricts = (state && STATE_DISTRICTS_MAP[state]) || SUGGESTED_DISTRICTS;

  const fetchLivePrices = async (customParams = null) => {
    const c = customParams?.commodity ?? commodity;
    const d = customParams?.district !== undefined ? customParams.district : district;
    const s = customParams?.state !== undefined ? customParams.state : state;

    setLoading(true);
    setError(null);

    const res = await getTodayPrices({
      commodity: c,
      district: d,
      state: s,
      limit: 100
    });

    setLoading(false);
    if (!res.success) {
      setError({ message: res.message, hint: res.hint });
      setData(null);
    } else {
      setData(res);
    }
  };

  useEffect(() => {
    fetchLivePrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLivePrices();
  };

  const records = data?.records || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title={lang === 'hi' ? 'ताज़ा मंडी भाव तालिका' : 'Live Mandi Prices Table'}
        subtitle={
          lang === 'hi'
            ? 'विभिन्न मंडियों में आज के न्यूनतम, अधिकतम और मॉडल भाव की विस्तृत सूची।'
            : 'Detailed list of today’s minimum, maximum, and modal prices across mandis.'
        }
        badge="Agmarknet Live"
      />

      {/* Filter Form */}
      <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-200 shadow-sm">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Crop / Commodity */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {lang === 'hi' ? '1. फसल (Crop)' : '1. Commodity / Crop'}
              </label>
              <select
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none transition cursor-pointer"
              >
                {POPULAR_CROPS.map((crop) => (
                  <option key={crop.value} value={crop.value}>
                    {lang === 'hi' ? crop.labelHi : crop.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. State (Pehle State Select Karein) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {lang === 'hi' ? '2. राज्य (State)' : '2. State'}
              </label>
              <select
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none transition cursor-pointer"
              >
                {POPULAR_STATES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {lang === 'hi' ? st.labelHi : st.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. District (Dependent Dropdown for the Selected State) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                {lang === 'hi' ? '3. ज़िला (District)' : '3. District'}
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold text-gray-800 focus:bg-white focus:ring-2 focus:ring-[#166534] outline-none transition cursor-pointer"
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
            </div>
          </div>

          {/* Quick chips matching the chosen state */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-bold text-gray-500">
              {lang === 'hi' ? 'ज़िला त्वरित चयन:' : 'Quick Select District:'}
            </span>
            {currentDistricts.slice(0, 8).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDistrict(d);
                  fetchLivePrices({ district: d });
                }}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                  district.toLowerCase() === d.toLowerCase()
                    ? 'bg-[#166534] text-white border-[#166534]'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{lang === 'hi' ? 'भाव खोजें / Search' : 'Search Live Prices'}</span>
          </button>
        </form>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingIndicator message={lang === 'hi' ? 'ताज़ा भाव लाए जा रहे हैं...' : 'Loading live prices...'} />}
      {error && <ErrorMessage message={error.message} hint={error.hint} onRetry={() => fetchLivePrices()} />}

      {/* Empty State */}
      {!loading && !error && data && data.status === 'no_data' && (
        <EmptyState
          commodity={commodity}
          district={district}
          onSelectDistrict={(d) => {
            setDistrict(d);
            fetchLivePrices({ district: d });
          }}
        />
      )}

      {/* Results Table */}
      {!loading && !error && records.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-gray-50/50">
            <div className="flex items-center gap-2 font-bold text-gray-800 text-base">
              <Store size={20} className="text-[#166534]" />
              <span>
                {commodity} — {district || (lang === 'hi' ? 'सभी ज़िले' : 'All Districts')}
              </span>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-[#166534] text-xs font-bold rounded-full">
              {lang === 'hi' ? `कुल रिकॉर्ड्स: ${records.length}` : `Total Records: ${records.length}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f3d24] text-white text-xs font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">{lang === 'hi' ? 'मंडी (Market)' : 'Market'}</th>
                  <th className="py-3.5 px-4">{lang === 'hi' ? 'ज़िला / राज्य' : 'District / State'}</th>
                  <th className="py-3.5 px-4">{lang === 'hi' ? 'किस्म (Variety)' : 'Variety'}</th>
                  <th className="py-3.5 px-4">{lang === 'hi' ? 'ग्रेड' : 'Grade'}</th>
                  <th className="py-3.5 px-4 text-right">{lang === 'hi' ? 'न्यूनतम (Min)' : 'Min Price'}</th>
                  <th className="py-3.5 px-4 text-right">{lang === 'hi' ? 'अधिकतम (Max)' : 'Max Price'}</th>
                  <th className="py-3.5 px-4 text-right bg-[#166534]">{lang === 'hi' ? 'मॉडल भाव (Modal)' : 'Modal Price'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'hi' ? 'तारीख' : 'Date'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'hi' ? 'नेविगेशन' : 'Navigation'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {records.map((rec, idx) => {
                  const mCoords = getMandiCoords(rec);
                  const mapsUrl = getGoogleMapsNavigationUrl({
                    marketName: rec.market,
                    district: rec.district,
                    destLat: rec.latitude || mCoords?.lat,
                    destLon: rec.longitude || mCoords?.lng
                  });

                  return (
                    <tr key={idx} className="hover:bg-emerald-50/40 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900 flex items-center gap-1.5">
                        <MapPin size={15} className="text-emerald-700 flex-shrink-0" />
                        <span>{rec.market || 'APMC Mandi'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 text-xs">
                        {rec.district}, {rec.state}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-800 font-semibold">
                          {rec.variety || 'FAQ / General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">
                        {rec.grade || 'FAQ'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-700">
                        {rec.minPrice ? `₹${Number(rec.minPrice).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-700">
                        {rec.maxPrice ? `₹${Number(rec.maxPrice).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right bg-emerald-50/50">
                        {rec.modalPrice ? (
                          <span className="font-extrabold text-[#166534] text-base">
                            ₹{Number(rec.modalPrice).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">अनुपलब्ध</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-gray-500 whitespace-nowrap">
                        {rec.arrivalDate || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-[#166534] border border-emerald-200 rounded-lg text-xs font-bold transition hover:scale-105 cursor-pointer whitespace-nowrap"
                          title="गूगल मैप्स पर रास्ता देखें"
                        >
                          <Navigation size={12} />
                          <span>{lang === 'hi' ? 'रास्ता' : 'Map'}</span>
                          <ExternalLink size={10} className="opacity-70" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
