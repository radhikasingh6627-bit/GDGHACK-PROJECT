import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ErrorMessage({ title, message, hint, onRetry }) {
  const { t } = useLanguage();

  return (
    <div className="p-6 bg-red-50/80 border border-red-200 rounded-2xl shadow-sm text-left my-4">
      <div className="flex items-start gap-4">
        <div className="p-2.5 bg-red-100 text-red-700 rounded-xl flex-shrink-0 mt-0.5">
          <AlertCircle size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-red-900">
            {title || t.common.errorTitle}
          </h3>
          <p className="text-red-700 text-sm mt-1 leading-relaxed">
            {message || t.common.backendOffline}
          </p>
          {hint && (
            <p className="text-xs text-red-600 bg-red-100/70 p-2.5 rounded-lg mt-3 font-mono border border-red-200">
              💡 {hint}
            </p>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              type="button"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow transition"
            >
              <RotateCcw size={16} />
              <span>{t.common.retry}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
