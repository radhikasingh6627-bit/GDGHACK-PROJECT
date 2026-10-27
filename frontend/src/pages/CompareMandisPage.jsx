import React, { useState, useEffect } from 'react';
import {
  Scale,
  Award,
  Info,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Car,
  Clock,
  ExternalLink,
  MapPin,
  BarChart2
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorMessage from '../components/ErrorMessage';
import { useLanguage } from '../context/LanguageContext';
import {
  POPULAR_CROPS,
  POPULAR_STATES,
  STATE_DISTRICTS_MAP,
  SUGGESTED_DISTRICTS
} from '../utils/translations';
import { compareMandis } from '../services/api';
import {
  fetchRoadDistance,
  getGoogleMapsNavigationUrl,
  getMandiCoords,
  MANDI_COORDINATES
} from '../utils/distance';

export default function CompareMandisPage() {
  const { lang } = useLanguage();

  const [commodity, setCommodity] = useState('Tomato');
  const [state, setState] = useState('Punjab');
  const [district, setDistrict] = useState('Ludhiana');

  // GPS / Location state
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const [roadRoutes, setRoadRoutes] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Available districts based on chosen state
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

  const fetchComparison = async (customParams = null) => {
    const c = customParams?.commodity ?? commodity;
    const d = customParams?.district !== undefined ? customParams.district : district;
    const s = customParams?.state !== undefined ? customParams.state : state;
    const lat = customParams?.lat !== undefined ? customParams.lat : (coords?.latitude ?? null);
    const lon = customParams?.lon !== undefined ? customParams.lon : (coords?.longitude ?? null);

    setLoading(true);
    setError(null);

    const res = await compareMandis({
      commodity: c,
      district: d,
      state: s,
      userLat: lat,
      userLon: lon
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
    fetchComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocError(lang === 'hi' ? 'ब्राउज़र में लोकेशन सेवा उपलब्ध नहीं है।' : 'Geolocation not supported in browser.');
      return;
    }

    setLocating(true);
    setLocError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        };
        setCoords(userCoords);
        setLocating(false);
        fetchComparison({ lat: userCoords.latitude, lon: userCoords.longitude });
      },
      () => {
        setLocating(false);
        setLocError(
          lang === 'hi'
            ? 'लोकेशन की अनुमति नहीं मिली या सिग्नल उपलब्ध नहीं है।'
            : 'Location permission denied or unavailable.'
        );
      },
      { timeout: 8000 }
    );
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchComparison();
  };

  const basis = data?.comparisonBasis;
  const bestMandi = data?.bestMandi;
  const mandis = data?.mandis || [];
  const comparisonMessage = data?.comparisonMessage || data?.message;
  const isNoData = data?.status === 'no_data' || (data?.success && mandis.length === 0);

  // Compute exact by-road routes using free OSRM engine when mandis change
  useEffect(() => {
    if (!mandis || mandis.length === 0) return;

    const origin =
      coords ||
      (district ? MANDI_COORDINATES[district.toLowerCase().trim()] : null) ||
      { lat: 26.8467, lng: 80.9462 };

    const oLat = origin.latitude || origin.lat;
    const oLon = origin.longitude || origin.lng;

    let isMounted = true;
    mandis.forEach(async (m) => {
      const mCoords = getMandiCoords(m);
      if (mCoords && oLat && oLon) {
        const route = await fetchRoadDistance(oLat, oLon, mCoords.lat, mCoords.lng);
        if (isMounted && route) {
          const key = `${m.market}_${m.district}`;
          setRoadRoutes((prev) => ({
            ...prev,
            [key]: route
          }));
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [mandis, coords, district]);

  // Coordinates and maps URL for best mandi
  const bestMandiCoords = bestMandi ? getMandiCoords(bestMandi) : null;
  const bestMandiRoute = bestMandi ? roadRoutes[`${bestMandi.market}_${bestMandi.district}`] : null;
  const bestMandiMapsUrl = bestMandi
    ? getGoogleMapsNavigationUrl({
        marketName: bestMandi.market,
        district: bestMandi.district,
        destLat: bestMandi.latitude || bestMandiCoords?.lat,
        destLon: bestMandi.longitude || bestMandiCoords?.lng,
        userLat: coords?.latitude,
        userLon: coords?.longitude
      })
    : '#';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title={lang === 'hi' ? 'मंडियों की मूल्य तुलना' : 'Mandi Price Comparison'}
        subtitle={
          lang === 'hi'
            ? 'समान किस्म और ग्रेड (Like-for-Like) के आधार पर मंडियों के भाव, वास्तविक सड़क दूरी (By-Road) और गूगल मैप्स नेविगेशन।'
            : 'Strict like-for-like comparison maintaining variety/grade consistency, road driving distance, and Google Maps navigation.'
        }
        badge="Road Routing & Google Maps"
      />

      {/* GPS Location & Live Farm Tracking Banner */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center flex-shrink-0">
            <Navigation size={22} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {lang === 'hi' ? 'खेत / गाँव से सड़क दूरी की गणना' : 'Farm Road Distance & Navigation'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {coords
                ? (lang === 'hi'
                    ? `सत्यापित GPS लोकेशन सक्रिय: Lat ${coords.latitude.toFixed(4)}, Lon ${coords.longitude.toFixed(4)}`
                    : `GPS Detected: Lat ${coords.latitude.toFixed(4)}, Lon ${coords.longitude.toFixed(4)}`)
                : (lang === 'hi'
                    ? `${district || 'ज़िला'} केंद्र से वास्तविक सड़क दूरी व समय निकाला जा रहा है। अपने खेत से सटीक दूरी के लिए बटन दबाएं।`
                    : `Calculating real road distance from ${district || 'district'} center. Click to use your exact GPS.`)}
            </p>
            {locError && <p className="text-xs text-rose-600 mt-1 font-semibold">{locError}</p>}
          </div>
        </div>

        <button
          onClick={handleGetLocation}
          disabled={locating}
          className="px-5 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold text-sm rounded-xl shadow transition flex items-center gap-2 cursor-pointer disabled:opacity-60 whitespace-nowrap"
        >
          {locating ? <RefreshCw size={16} className="animate-spin" /> : <Navigation size={16} />}
          <span>{lang === 'hi' ? 'खेत की लाइव लोकेशन लें' : 'Detect My GPS'}</span>
        </button>
      </div>

      {/* Filter Form with State & District Dropdowns */}
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

          {/* Compare Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Scale size={16} />}
            <span>{lang === 'hi' ? 'तुलना करें' : 'Compare Mandis'}</span>
          </button>
        </form>

        {/* Quick District Chips */}
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
                fetchComparison({ district: d });
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

      {loading && <LoadingIndicator message={lang === 'hi' ? 'मंडियों की तुलना की जा रही है...' : 'Comparing mandis...'} />}
      {error && <ErrorMessage message={error.message} hint={error.hint} onRetry={() => fetchComparison()} />}

      {/* No Data State */}
      {!loading && !error && isNoData && (
        <div className="bg-amber-50/70 border border-amber-200 p-8 rounded-3xl text-center">
          <AlertCircle size={32} className="mx-auto text-amber-600 mb-2" />
          <h3 className="text-lg font-bold text-gray-900">
            {lang === 'hi' ? 'कोई तुलना योग्य मंडी नहीं मिली' : 'No Comparable Mandis Found'}
          </h3>
          <p className="text-gray-700 text-sm max-w-md mx-auto mt-1">
            {comparisonMessage || (lang === 'hi'
              ? `${district} में ${commodity} के लिए आज कोई रिकॉर्ड उपलब्ध नहीं है।`
              : `No recorded mandis for ${commodity} in ${district} today.`)}
          </p>
        </div>
      )}

      {/* Comparison Basis & Results */}
      {!loading && !error && !isNoData && mandis.length > 0 && (
        <div className="space-y-6">
          {/* Comparison Basis Notice Card */}
          {basis && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-sm">
              <div className="flex flex-wrap items-center gap-2 text-emerald-900 font-bold">
                <CheckCircle2 size={18} className="text-[#166534]" />
                <span>
                  {lang === 'hi' ? 'तुलना का आधार (Comparison Basis):' : 'Comparison Basis:'}
                </span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-300 rounded-lg text-emerald-800">
                  {lang === 'hi' ? 'किस्म:' : 'Variety:'} <strong>{basis.variety}</strong>
                </span>
                <span className="px-2.5 py-0.5 bg-white border border-emerald-300 rounded-lg text-emerald-800">
                  {lang === 'hi' ? 'ग्रेड:' : 'Grade:'} <strong>{basis.grade}</strong>
                </span>
              </div>
              <span className="text-xs text-emerald-700 font-medium">
                {lang === 'hi' ? '* विभिन्न किस्मों या ग्रेड को आपस में नहीं मिलाया गया है' : '* Varieties & grades strictly isolated'}
              </span>
            </div>
          )}

          {/* Best Mandi Highlight with 1-Click Google Maps Turn-by-Turn Navigation */}
          {bestMandi && bestMandi.modalPrice && (
            <div className="bg-gradient-to-r from-[#0f3d24] to-[#166534] text-white p-6 rounded-3xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#22c55e]/20 text-[#22c55e] text-xs font-bold rounded-full mb-1 border border-[#22c55e]/30">
                  <Award size={14} />
                  <span>{lang === 'hi' ? 'सर्वश्रेष्ठ मॉडल भाव वाली मंडी' : 'Highest Modal Price Mandi'}</span>
                </span>
                <h3 className="text-2xl font-black">{bestMandi.market}</h3>
                <p className="text-emerald-100 text-xs">
                  {bestMandi.district}, {bestMandi.state} • तारीख: {bestMandi.arrivalDate}
                </p>

                {/* By-Road distance badge */}
                {bestMandiRoute && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-emerald-200">
                    <span className="px-2.5 py-0.5 bg-emerald-800/80 rounded-md font-bold flex items-center gap-1">
                      <Car size={13} className="text-[#22c55e]" />
                      <span>{bestMandiRoute.roadDistanceKm} km सड़क मार्ग</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-emerald-300" />
                      <span>~{bestMandiRoute.durationFormatted}</span>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start md:items-end gap-3">
                <div className="text-left md:text-right">
                  <span className="text-xs text-emerald-200 font-bold block">
                    {lang === 'hi' ? 'मॉडल भाव (औसत दर)' : 'Reported Modal Price'}
                  </span>
                  <span className="text-3xl md:text-4xl font-black text-[#22c55e]">
                    ₹{Number(bestMandi.modalPrice).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-emerald-200 block">/ क्विंटल</span>
                </div>

                {/* 1-Click Google Maps Navigation Button */}
                <a
                  href={bestMandiMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-white hover:bg-emerald-50 text-[#0f3d24] font-extrabold text-xs md:text-sm rounded-xl shadow transition flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
                >
                  <Navigation size={16} className="text-[#166534]" />
                  <span>{lang === 'hi' ? 'गूगल मैप्स पर सीधा रास्ता देखें' : 'Navigate on Google Maps'}</span>
                  <ExternalLink size={13} className="text-gray-500" />
                </a>
              </div>
            </div>
          )}

          {/* Comparison Message */}
          {comparisonMessage && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center gap-2">
              <Info size={16} className="text-blue-600 flex-shrink-0" />
              <span>{comparisonMessage}</span>
            </div>
          )}

          {/* Visual Mandi Price Comparison Graph */}
          {mandis.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart2 size={20} className="text-[#166534]" />
                  <h3 className="font-extrabold text-gray-900 text-base md:text-lg">
                    {lang === 'hi' ? 'मंडियों का भाव तुलनात्मक ग्राफ' : 'Visual Mandi Price Comparison'}
                  </h3>
                </div>
                <span className="text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {lang === 'hi' ? 'सीधे तुलना करें • कौन सी मंडी सबसे बेहतर है' : 'Instant Comparison • Find Best APMC'}
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {(() => {
                  const maxPrice = Math.max(...mandis.map((m) => Number(m.modalPrice) || 0));
                  return mandis.slice(0, 6).map((m, idx) => {
                    const price = Number(m.modalPrice) || 0;
                    const pct = maxPrice > 0 ? Math.round((price / maxPrice) * 100) : 0;
                    const isTop = m.isTiedBest || price === maxPrice;
                    const diff = maxPrice - price;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                          <span className="flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-none">
                            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-[10px] flex-shrink-0">
                              {idx + 1}
                            </span>
                            <span className={isTop ? 'text-[#166534] font-black' : ''}>{m.market}</span>
                            <span className="text-[11px] text-gray-500 font-semibold">({m.district})</span>
                            {isTop && (
                              <span className="px-1.5 py-0.5 bg-[#166534] text-white rounded text-[10px] uppercase font-bold">
                                Best
                              </span>
                            )}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className={`text-sm font-black ${isTop ? 'text-[#166534]' : 'text-gray-800'}`}>
                              ₹{price.toLocaleString('en-IN')}
                            </span>
                            {diff > 0 && (
                              <span className="text-[11px] text-rose-500 font-semibold hidden sm:inline">
                                (-₹{diff})
                              </span>
                            )}
                          </span>
                        </div>

                        {/* Visual Bar */}
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isTop
                                ? 'bg-gradient-to-r from-emerald-500 to-[#166534]'
                                : 'bg-gradient-to-r from-emerald-200 to-emerald-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* Mandis Comparison Table with By-Road Distance & 1-Click Navigation */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Car size={18} className="text-[#166534]" />
                <span>{lang === 'hi' ? 'समान आधार वाली मंडियों की सूची व सड़क मार्ग' : 'Comparable Markets List & Driving Routes'}</span>
              </span>
              <span className="text-xs text-gray-500 font-semibold">
                {lang === 'hi' ? `कुल मंडियां: ${mandis.length}` : `Total Markets: ${mandis.length}`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#0f3d24] text-white text-xs uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">{lang === 'hi' ? 'मंडी का नाम' : 'Market'}</th>
                    <th className="py-3 px-4">{lang === 'hi' ? 'ज़िला' : 'District'}</th>
                    <th className="py-3 px-4 text-center">{lang === 'hi' ? 'सड़क मार्ग दूरी व समय' : 'Road Distance & Time'}</th>
                    <th className="py-3 px-4">{lang === 'hi' ? 'किस्म / ग्रेड' : 'Variety / Grade'}</th>
                    <th className="py-3 px-4 text-right bg-[#166534]">{lang === 'hi' ? 'मॉडल भाव (₹/क्विंटल)' : 'Modal Price'}</th>
                    <th className="py-3 px-4 text-right">{lang === 'hi' ? 'दायरा' : 'Range'}</th>
                    <th className="py-3 px-4 text-center">{lang === 'hi' ? 'गूगल मैप्स नेविगेशन' : 'Navigation'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {mandis.map((m, idx) => {
                    const key = `${m.market}_${m.district}`;
                    const roadRoute = roadRoutes[key];
                    const mCoords = getMandiCoords(m);
                    const mapsUrl = getGoogleMapsNavigationUrl({
                      marketName: m.market,
                      district: m.district,
                      destLat: m.latitude || mCoords?.lat,
                      destLon: m.longitude || mCoords?.lng,
                      userLat: coords?.latitude,
                      userLon: coords?.longitude
                    });

                    return (
                      <tr key={idx} className={m.isTiedBest ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-gray-50'}>
                        {/* 1. Index */}
                        <td className="py-3 px-4 text-xs text-gray-500">{idx + 1}</td>

                        {/* 2. Market Name */}
                        <td className="py-3 px-4 font-bold text-gray-900">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={15} className="text-[#166534] flex-shrink-0" />
                            <span>{m.market}</span>
                            {m.isTiedBest && (
                              <span className="ml-2 text-[10px] px-2 py-0.5 bg-[#166534] text-white rounded-md uppercase font-bold">
                                Best
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. District */}
                        <td className="py-3 px-4 text-gray-600 text-xs">{m.district}</td>

                        {/* 4. By-Road Distance & Time (from OSRM) */}
                        <td className="py-3 px-4 text-center">
                          {roadRoute ? (
                            <div className="inline-flex flex-col items-center gap-0.5">
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-[#166534] rounded-lg text-xs font-black flex items-center gap-1">
                                <Car size={12} />
                                <span>{roadRoute.roadDistanceKm} km</span>
                              </span>
                              <span className="text-[11px] text-gray-600 font-semibold flex items-center gap-1">
                                <Clock size={10} className="text-gray-400" />
                                <span>{roadRoute.durationFormatted}</span>
                              </span>
                              <span className="text-[9px] text-emerald-800 font-semibold uppercase">
                                {roadRoute.isExactRoad ? 'सड़क मार्ग' : 'सड़क अनुमान'}
                              </span>
                            </div>
                          ) : m.distanceKm ? (
                            <span className="text-xs text-gray-700 font-semibold">
                              ~{(Number(m.distanceKm) * 1.25).toFixed(1)} km
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">गणना जारी...</span>
                          )}
                        </td>

                        {/* 5. Variety / Grade */}
                        <td className="py-3 px-4 text-xs text-gray-700">
                          {m.variety} • {m.grade}
                        </td>

                        {/* 6. Modal Price */}
                        <td className="py-3 px-4 text-right bg-emerald-50/30">
                          {m.modalPrice ? (
                            <span className="font-extrabold text-[#166534] text-base">
                              ₹{Number(m.modalPrice).toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">अनुपलब्ध</span>
                          )}
                        </td>

                        {/* 7. Price Range */}
                        <td className="py-3 px-4 text-right text-xs text-gray-600 whitespace-nowrap">
                          ₹{m.minPrice || '—'} - ₹{m.maxPrice || '—'}
                        </td>

                        {/* 8. 1-Click Google Maps Navigation */}
                        <td className="py-3 px-4 text-center">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#166534] hover:bg-[#0f3d24] text-white rounded-xl text-xs font-bold shadow-xs transition hover:scale-[1.02] cursor-pointer whitespace-nowrap"
                            title="गूगल मैप्स पर सीधा रास्ता देखें"
                          >
                            <Navigation size={13} className="text-emerald-300" />
                            <span>{lang === 'hi' ? 'रास्ता देखें' : 'Directions'}</span>
                            <ExternalLink size={11} className="opacity-70" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
