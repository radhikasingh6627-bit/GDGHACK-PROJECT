import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingIndicator({ message = 'लोड हो रहा है... / Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
        <Loader2 className="w-8 h-8 text-[#166534] animate-spin" />
      </div>
      <p className="text-gray-800 font-semibold text-lg">{message}</p>
      <p className="text-gray-500 text-sm mt-1">सरकारी एपीआई (data.gov.in) से डेटा प्राप्त किया जा रहा है...</p>
    </div>
  );
}
