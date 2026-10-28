import React, { useState, useEffect } from 'react';
import { Compass, MapPin, Navigation, RefreshCw, Car, Clock, ExternalLink } from 'lucide-react';
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

export default function NearestMandiPage() {
  const { lang } = useLanguage();

  const [commodity, setCommodity] = useState('Wheat');
  const [state, setState] = useState('Uttar Pradesh');
  const [district, setDistrict] = useState('Lucknow');

  // GPS coordinates state
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

  const fetchMarkets = async (customParams = null) => {
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
      userLon: lon,
      sortBy: 'distance'
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
    fetchMarkets();
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
        // Search nearest mandis to the user's GPS coordinates without restricting to one empty district
        fetchMarkets({ lat: userCoords.latitude, lon: userCoords.longitude, district: '' });
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

  const mandis = data?.mandis || [];

  // Compute exact by-road routes using OSRM when mandis or coords change
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
      const mandiCoords = (m.latitude && m.longitude)
        ? { lat: Number(m.latitude), lng: Number(m.longitude) }
        : getMandiCoords(m);

      if (mandiCoords && oLat && oLon) {
        const route = await fetchRoadDistance(oLat, oLon, mandiCoords.lat, mandiCoords.lng);
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader
        title={lang === 'hi' ? 'नज़दीकी मंडी दूरी व भाव' : 'Nearest Mandi & Distance'}
        subtitle={
          lang === 'hi'
            ? 'अपने खेत से वास्तविक सड़क दूरी (By-Road) और 1-क्लिक गूगल मैप्स नेविगेशन।'
            : 'Find nearby APMC markets with real-world road distances and 1-click Google Maps navigation.'
        }
        badge="Road Routing & Google Maps"
      />

      {/* GPS Location Permission Banner */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#166534] flex items-center justify-center flex-shrink-0">
            <Navigation size={22} />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {lang === 'hi' ? 'अपने खेत / गाँव की लाइव लोकेशन' : 'Your Farm / Field Location'}
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              {coords
                ? (lang === 'hi'
                    ? `सत्यापित GPS लोकेशन सक्रिय: अक्षांश ${coords.latitude.toFixed(4)}, देशांतर ${coords.longitude.toFixed(4)}`
                    : `GPS Detected: Lat ${coords.latitude.toFixed(4)}, Lon ${coords.longitude.toFixed(4)}`)
                : (lang === 'hi'
                    ? `${district || 'ज़िला'} केंद्र से दूरी की गणना की जा रही है। सटीक खेत से दूरी के लिए नीचे बटन दबाएं।`
                    : `Calculating from ${district || 'district'} center. Click button to detect exact farm GPS.`)}
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

      {/* Filter Selector with State & Dependent District Dropdowns */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          {/* Commodity */}
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

          {/* State */}
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

          {/* District Dropdown */}
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

          <button
            onClick={() => fetchMarkets()}
            disabled={loading}
            className="w-full px-6 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white font-bold rounded-xl text-sm shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Compass size={16} />}
            <span>{lang === 'hi' ? 'मंडियां खोजें' : 'Find Mandis'}</span>
          </button>
        </div>

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
                fetchMarkets({ district: d });
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

      {loading && <LoadingIndicator message={lang === 'hi' ? 'मंडियों की जानकारी लोड हो रही है...' : 'Loading market details...'} />}
      {error && <ErrorMessage message={error.message} hint={error.hint} onRetry={() => fetchMarkets()} />}

      {/* Empty State when no mandis matched */}
      {!loading && !error && mandis.length === 0 && (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <MapPin size={24} />
          </div>
          <h3 className="text-base font-bold text-gray-800">
            {lang === 'hi' ? 'कोई मंडी नहीं मिली' : 'No Mandis Found'}
          </h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
            {lang === 'hi'
              ? `"${commodity}" के लिए ${district ? `ज़िला "${district}" में` : 'चुने गए फ़िल्टर में'} आज कोई मंडी भाव दर्ज नहीं है। कृपया सभी ज़िले चुनकर देखें या खेत की लाइव लोकेशन लें।`
              : `No reported prices for "${commodity}" in ${district ? `"${district}"` : 'selected filters'} today. Try viewing all districts or detect GPS.`}
          </p>
          <button
            onClick={() => { setDistrict(''); fetchMarkets({ district: '' }); }}
            className="mt-4 px-5 py-2.5 bg-[#166534] hover:bg-[#0f3d24] text-white text-xs font-bold rounded-xl shadow cursor-pointer transition"
          >
            {lang === 'hi' ? 'सभी निकटतम मंडियां देखें' : 'View All Nearby Mandis'}
          </button>
        </div>
      )}

      {/* Markets List with Exact Road Distance & Google Maps Navigation */}
      {!loading && !error && mandis.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-gray-800 text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Car size={18} className="text-[#166534]" />
              <span>{lang === 'hi' ? 'सड़क मार्ग दूरी एवं नेविगेशन सूची' : 'Road Routing & Navigation List'}</span>
            </span>
            <span className="text-xs text-gray-500 font-semibold">
              {lang === 'hi' ? `कुल मंडियां: ${mandis.length}` : `Total: ${mandis.length}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0f3d24] text-white text-xs uppercase font-bold">
                <tr>
                  <th className="py-3.5 px-4">{lang === 'hi' ? 'मंडी का नाम' : 'Market'}</th>
                  <th className="py-3.5 px-4">{lang === 'hi' ? 'ज़िला' : 'District'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'hi' ? 'सड़क मार्ग दूरी व समय' : 'Road Distance & Time'}</th>
                  <th className="py-3.5 px-4 text-right bg-[#166534]">{lang === 'hi' ? 'मॉडल भाव' : 'Modal Price'}</th>
                  <th className="py-3.5 px-4 text-center">{lang === 'hi' ? 'गूगल मैप्स नेविगेशन' : 'Navigation'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {mandis.map((m, idx) => {
                  const key = `${m.market}_${m.district}`;
                  const roadRoute = roadRoutes[key];
                  const mandiCoords = (m.latitude && m.longitude)
                    ? { lat: Number(m.latitude), lng: Number(m.longitude) }
                    : getMandiCoords(m);

                  const mapsUrl = getGoogleMapsNavigationUrl({
                    marketName: m.market,
                    district: m.district,
                    destLat: m.latitude || mandiCoords?.lat,
                    destLon: m.longitude || mandiCoords?.lng,
                    userLat: coords?.latitude,
                    userLon: coords?.longitude
                  });

                  return (
                    <tr key={idx} className="hover:bg-gray-50/80 transition">
                      {/* 1. Mandi Market */}
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-[#166534] flex-shrink-0" />
                          <span>{m.market}</span>
                        </div>
                      </td>

                      {/* 2. District */}
                      <td className="py-3.5 px-4 text-gray-600 text-xs font-semibold">
                        {m.district}
                      </td>

                      {/* 3. By-Road Distance & Time (from OSRM) */}
                      <td className="py-3.5 px-4 text-center">
                        {roadRoute ? (
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className="px-2.5 py-0.5 bg-emerald-100 text-[#166534] rounded-lg text-xs font-black flex items-center gap-1 shadow-xs">
                              <Car size={13} />
                              <span>{roadRoute.roadDistanceKm} km</span>
                            </span>
                            <span className="text-[11px] text-gray-600 font-semibold flex items-center gap-1">
                              <Clock size={11} className="text-gray-400" />
                              <span>{roadRoute.durationFormatted}</span>
                            </span>
                            <span className="text-[9px] text-emerald-800 font-semibold uppercase tracking-wider">
                              {roadRoute.isExactRoad ? 'सड़क मार्ग (By Road)' : 'अनुमानित सड़क दूरी'}
                            </span>
                          </div>
                        ) : m.distanceKm ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-800 rounded-lg text-xs font-bold">
                              ~{(Number(m.distanceKm) * 1.25).toFixed(1)} km
                            </span>
                            <span className="text-[10px] text-gray-400">सड़क अनुमान</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">
                            दूरी गणना जारी...
                          </span>
                        )}
                      </td>

                      {/* 4. Modal Price */}
                      <td className="py-3.5 px-4 text-right bg-emerald-50/40">
                        {m.modalPrice ? (
                          <div>
                            <span className="font-extrabold text-[#166534] text-base">
                              ₹{Number(m.modalPrice).toLocaleString('en-IN')}
                            </span>
                            <span className="block text-[10px] text-gray-500">/ क्विंटल</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">अनुपलब्ध</span>
                        )}
                      </td>

                      {/* 5. 1-Click Google Maps Navigation Button */}
                      <td className="py-3.5 px-4 text-center">
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
      )}
    </div>
  );
}
