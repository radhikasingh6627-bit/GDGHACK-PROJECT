import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
      <div className="px-2 text-gray-500 hidden sm:flex items-center gap-1 text-xs font-semibold">
        <Languages size={15} className="text-brand-emerald" />
        <span>भाषा / Lang:</span>
      </div>
      <button
        type="button"
        onClick={() => setLang('hi')}
        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 flex items-center gap-1 ${
          lang === 'hi'
            ? 'bg-[#166534] text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title="हिंदी भाषा चुनें"
      >
        <span>हिंदी</span>
      </button>
      <button
        type="button"
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 flex items-center gap-1 ${
          lang === 'en'
            ? 'bg-[#166534] text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
        }`}
        title="Switch to English"
      >
        <span>English</span>
      </button>
    </div>
  );
}
