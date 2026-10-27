import React from 'react';

/**
 * Reusable MandiDarpan Logo component
 * Requirement:
 * - Render 'Mandi' in white
 * - Render 'Darpan' in green
 * - Place both on a dark-green background for crystal-clear contrast
 */
export default function Logo({ size = 'default', showTagline = false }) {
  const isLarge = size === 'large';

  return (
    <div className="flex items-center gap-3">
      {/* Dark green badge container */}
      <div className={`bg-[#0f3d24] shadow-md border border-[#1e5836] rounded-xl flex items-center justify-center font-extrabold tracking-tight select-none transition-transform hover:scale-[1.02] ${
        isLarge ? 'px-4 py-2.5 text-2xl md:text-3xl' : 'px-3.5 py-1.5 text-xl'
      }`}>
        <span className="text-white drop-shadow-sm font-black mr-0.5">Mandi</span>
        <span className="text-[#22c55e] drop-shadow-sm font-black">Darpan</span>
        <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-[#166534] text-emerald-200 font-semibold uppercase tracking-wider hidden sm:inline-block">
          मंडी दर्पण
        </span>
      </div>

      {showTagline && (
        <span className="text-xs text-gray-500 font-medium hidden md:block">
          किसान सेवा केंद्र
        </span>
      )}
    </div>
  );
}
