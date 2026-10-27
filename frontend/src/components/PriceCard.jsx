import React from 'react';
import { Calendar, MapPin, Tag, Award, TrendingUp, AlertTriangle, Navigation, ExternalLink } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getGoogleMapsNavigationUrl, getMandiCoords } from '../utils/distance';

export default function PriceCard({ record, isFeatured = true }) {
  const { t, lang } = useLanguage();

  if (!record) return null;

  const {
    market,
    district,
    state,
    commodity,
    variety,
    grade,
    arrivalDate,
    modalPrice,
    minPrice,
    maxPrice,
    latitude,
    longitude
  } = record;

  const hasModalPrice = modalPrice !== null && modalPrice !== undefined && !isNaN(modalPrice);
  const formattedModalPrice = hasModalPrice ? Number(modalPrice).toLocaleString('en-IN') : null;
  const formattedMinPrice = minPrice !== null && minPrice !== undefined ? Number(minPrice).toLocaleString('en-IN') : null;
  const formattedMaxPrice = maxPrice !== null && maxPrice !== undefined ? Number(maxPrice).toLocaleString('en-IN') : null;

  const mCoords = getMandiCoords(record);
  const mapsUrl = getGoogleMapsNavigationUrl({
    marketName: market,
    district,
    destLat: latitude || mCoords?.lat,
    destLon: longitude || mCoords?.lng
  });

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
      isFeatured
        ? 'bg-gradient-to-b from-white to-emerald-50/40 border-emerald-300 shadow-md ring-1 ring-emerald-500/10'
        : 'bg-white border-gray-200 shadow-sm hover:shadow'
    }`}>
      {/* Top Header Badge */}
      <div className="bg-[#0f3d24] text-white px-5 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-[#22c55e]" />
          <span className="font-extrabold text-base md:text-lg tracking-wide">
            {market || 'Mandi APMC'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-semibold bg-[#166534] text-emerald-100 px-3 py-1 rounded-full border border-emerald-600/50">
          <Calendar size={13} className="text-[#22c55e]" />
          <span>{arrivalDate || 'आज'}</span>
        </div>
      </div>

      <div className="p-5 md:p-6">
        {/* Commodity and Variety Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-emerald-100 text-[#166534] font-extrabold text-sm rounded-lg flex items-center gap-1">
            <Tag size={14} />
            {commodity}
          </span>
          {variety && (
            <span className="px-2.5 py-1 bg-gray-100 text-gray-700 font-semibold text-xs rounded-lg">
              {t.home.varietyLabel} <strong className="text-gray-900">{variety}</strong>
            </span>
          )}
          {grade && (
            <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 font-semibold text-xs rounded-lg flex items-center gap-1">
              <Award size={12} />
              {grade}
            </span>
          )}
        </div>

        {/* Location subtitle */}
        <div className="text-xs text-gray-500 mb-5 flex items-center gap-1">
          <span>{district}</span>
          {state && <span>, {state}</span>}
        </div>

        {/* Modal Price Highlight */}
        <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-inner flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {t.home.modalPriceLabel}
            </p>
            {hasModalPrice ? (
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl md:text-4xl font-black text-[#166534]">
                  ₹{formattedModalPrice}
                </span>
                <span className="text-sm font-semibold text-gray-600">
                  {t.home.perQuintal}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-700 text-sm font-medium mt-1">
                <AlertTriangle size={16} />
                <span>मॉडल भाव उपलब्ध नहीं (Min/Max देखें)</span>
              </div>
            )}
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-1 text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/60 font-semibold">
            <TrendingUp size={15} className="text-emerald-600" />
            <span>दैनिक सरकारी भाव</span>
          </div>
        </div>

        {/* Min / Max Range Cards */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/70">
            <span className="text-xs font-semibold text-gray-500 block">
              {t.home.minPriceLabel}
            </span>
            <span className="text-base md:text-lg font-bold text-gray-800 mt-0.5 block">
              {formattedMinPrice ? `₹${formattedMinPrice}` : 'N/A'}
            </span>
          </div>

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/70">
            <span className="text-xs font-semibold text-gray-500 block">
              {t.home.maxPriceLabel}
            </span>
            <span className="text-base md:text-lg font-bold text-gray-800 mt-0.5 block">
              {formattedMaxPrice ? `₹${formattedMaxPrice}` : 'N/A'}
            </span>
          </div>
        </div>

        {/* 1-Click Google Maps Navigation */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-gray-500 font-medium">
            {lang === 'hi' ? 'सीधे मंडी तक पहुंचने का रास्ता:' : 'Direct road directions:'}
          </span>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#166534] hover:bg-[#0f3d24] text-white rounded-xl text-xs font-bold transition shadow-xs hover:scale-[1.02] cursor-pointer"
          >
            <Navigation size={13} className="text-emerald-300" />
            <span>{lang === 'hi' ? 'मैप्स पर रास्ता देखें' : 'Get Directions'}</span>
            <ExternalLink size={11} className="opacity-70" />
          </a>
        </div>
      </div>
    </div>
  );
}
