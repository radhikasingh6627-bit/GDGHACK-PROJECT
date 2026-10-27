import React from 'react';
import { PackageSearch, ArrowRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { SUGGESTED_DISTRICTS } from '../utils/translations';

export default function EmptyState({ commodity, district, onSelectDistrict }) {
  const { t } = useLanguage();

  return (
    <div className="p-8 bg-amber-50/60 border border-amber-200/80 rounded-2xl shadow-sm text-center my-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-sm">
        <PackageSearch size={32} />
      </div>

      <h3 className="text-xl font-bold text-gray-900">
        {t.home.noDataTitle}
      </h3>

      <p className="text-gray-700 max-w-lg mx-auto mt-2 text-sm md:text-base leading-relaxed">
        {t.home.noDataDesc}
      </p>

      {(commodity || district) && (
        <div className="inline-block bg-white border border-amber-200 rounded-xl px-4 py-2 mt-4 text-xs md:text-sm text-gray-600 font-medium">
          {commodity && <span className="font-semibold text-gray-800">{commodity}</span>}
          {commodity && district && <span className="mx-2 text-gray-400">•</span>}
          {district && <span>ज़िला: <strong className="text-gray-800">{district}</strong></span>}
        </div>
      )}

      {/* Suggested District Chips */}
      {onSelectDistrict && (
        <div className="mt-6 pt-5 border-t border-amber-200/60 max-w-md mx-auto">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">
            {t.home.suggestedDistricts}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED_DISTRICTS.map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => onSelectDistrict(dist)}
                className="px-3 py-1.5 bg-white hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 shadow-sm transition flex items-center gap-1"
              >
                <span>{dist}</span>
                <ArrowRight size={12} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
