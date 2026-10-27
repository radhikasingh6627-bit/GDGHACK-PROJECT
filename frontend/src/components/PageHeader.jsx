import React from 'react';

export default function PageHeader({ title, subtitle, badge }) {
  return (
    <div className="mb-6 pb-4 border-b border-gray-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#0f3d24] tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-gray-600 mt-1 text-sm md:text-base font-normal">
              {subtitle}
            </p>
          )}
        </div>
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs md:text-sm font-semibold rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {badge}
          </div>
        )}
      </div>
    </div>
  );
}
