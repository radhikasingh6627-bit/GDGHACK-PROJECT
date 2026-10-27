import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart2, LineChart, Calendar, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/**
 * High-end Interactive Agricultural Price Trend Chart
 * Supports both smooth SVG curved area/line chart and normalized bar chart views.
 */
export default function PriceTrendChart({ calendarSeries = [], lang = 'hi', commodity = '', district = '' }) {
  const [chartType, setChartType] = useState('line'); // 'line' | 'bar'
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Filter valid numeric prices
  const validPoints = calendarSeries
    .map((item, index) => ({
      ...item,
      originalIndex: index,
      modalPrice: item.modalPrice !== null && !isNaN(Number(item.modalPrice)) ? Number(item.modalPrice) : null
    }))
    .filter(pt => pt.modalPrice !== null);

  if (calendarSeries.length === 0 || validPoints.length === 0) {
    return null;
  }

  // Calculate scaled min, max, and average
  const prices = validPoints.map(p => p.modalPrice);
  const minVal = Math.min(...prices);
  const maxVal = Math.max(...prices);
  const avgVal = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const spread = maxVal - minVal;

  // Visual buffer for dynamic Y-axis scaling (never flat)
  const buffer = spread === 0 ? Math.round(minVal * 0.05) : Math.max(15, Math.round(spread * 0.25));
  const yMin = Math.max(0, minVal - buffer);
  const yMax = maxVal + buffer;
  const yRange = yMax - yMin || 1;

  // SVG Chart dimensions
  const width = 800;
  const height = 300;
  const paddingLeft = 65;
  const paddingRight = 40;
  const paddingTop = 40;
  const paddingBottom = 45;
  const plotWidth = width - paddingLeft - paddingRight;
  const plotHeight = height - paddingTop - paddingBottom;

  // Map each calendar item to coordinate space
  const totalCount = calendarSeries.length;
  const stepX = totalCount > 1 ? plotWidth / (totalCount - 1) : plotWidth / 2;

  const points = calendarSeries.map((item, idx) => {
    const rawPrice = item.modalPrice !== null && !isNaN(Number(item.modalPrice)) ? Number(item.modalPrice) : null;
    const x = paddingLeft + idx * stepX;
    const y = rawPrice !== null ? paddingTop + plotHeight - ((rawPrice - yMin) / yRange) * plotHeight : null;
    return {
      date: item.date,
      price: rawPrice,
      x,
      y,
      hasPrice: rawPrice !== null
    };
  });

  // Build SVG path with smooth cubic bezier curve
  const validCoords = points.filter(p => p.hasPrice);
  let linePath = '';
  let areaPath = '';

  if (validCoords.length > 0) {
    linePath = `M ${validCoords[0].x} ${validCoords[0].y}`;
    for (let i = 0; i < validCoords.length - 1; i++) {
      const p0 = validCoords[i === 0 ? 0 : i - 1];
      const p1 = validCoords[i];
      const p2 = validCoords[i + 1];
      const p3 = validCoords[i + 2] || p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      linePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const firstX = validCoords[0].x;
    const lastX = validCoords[validCoords.length - 1].x;
    const bottomY = paddingTop + plotHeight;
    areaPath = `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }

  // Y-axis tick values (4 steps)
  const yTicks = [
    yMin,
    Math.round(yMin + yRange * 0.33),
    Math.round(yMin + yRange * 0.66),
    yMax
  ];

  const highestPoint = validPoints.reduce((prev, curr) => (curr.modalPrice > prev.modalPrice ? curr : prev), validPoints[0]);
  const lowestPoint = validPoints.reduce((prev, curr) => (curr.modalPrice < prev.modalPrice ? curr : prev), validPoints[0]);

  return (
    <div className="bg-white rounded-3xl border border-gray-200/90 shadow-md p-5 md:p-7 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-50 rounded-xl text-[#166534]">
              {chartType === 'line' ? <TrendingUp size={20} /> : <BarChart2 size={20} />}
            </span>
            <h3 className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
              {lang === 'hi' ? `${commodity || 'फसल'} मूल्य रुझान ग्राफ` : `${commodity || 'Crop'} Price Trend Graph`}
            </h3>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-10">
            {lang === 'hi'
              ? `${district} APMC मंडी के प्रमाणित दैनिक भाव (₹ प्रति क्विंटल)`
              : `Authentic daily APMC mandi rates for ${district} (₹ per quintal)`}
          </p>
        </div>

        {/* View Switcher: Line vs Bar */}
        <div className="inline-flex items-center p-1 bg-gray-100 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              chartType === 'line'
                ? 'bg-[#166534] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
            }`}
          >
            <LineChart size={14} />
            <span>{lang === 'hi' ? 'लाइन ग्राफ' : 'Line Curve'}</span>
          </button>
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              chartType === 'bar'
                ? 'bg-[#166534] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/70'
            }`}
          >
            <BarChart2 size={14} />
            <span>{lang === 'hi' ? 'बार चार्ट' : 'Bar Chart'}</span>
          </button>
        </div>
      </div>

      {/* Highlights Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-bold">
            <span>{lang === 'hi' ? 'उच्चतम भाव' : 'Highest'}</span>
            <ArrowUpRight size={16} />
          </div>
          <div className="mt-1">
            <span className="text-lg md:text-xl font-black text-emerald-900">₹{highestPoint.modalPrice?.toLocaleString('en-IN')}</span>
            <span className="block text-[11px] text-emerald-700/80 truncate">{highestPoint.date}</span>
          </div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-800 text-xs font-bold">
            <span>{lang === 'hi' ? 'न्यूनतम भाव' : 'Lowest'}</span>
            <ArrowDownRight size={16} />
          </div>
          <div className="mt-1">
            <span className="text-lg md:text-xl font-black text-amber-900">₹{lowestPoint.modalPrice?.toLocaleString('en-IN')}</span>
            <span className="block text-[11px] text-amber-700/80 truncate">{lowestPoint.date}</span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-700 text-xs font-bold">
            <span>{lang === 'hi' ? 'औसत भाव' : 'Average'}</span>
            <Award size={15} className="text-[#166534]" />
          </div>
          <div className="mt-1">
            <span className="text-lg md:text-xl font-black text-gray-900">₹{avgVal.toLocaleString('en-IN')}</span>
            <span className="block text-[11px] text-gray-500">
              {validPoints.length} {lang === 'hi' ? 'दिनों का औसत' : 'days avg'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="relative pt-2">
        {chartType === 'line' ? (
          /* SVG Line & Area Curve */
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto min-w-[550px] overflow-visible select-none"
            >
              <defs>
                {/* Area Gradient Fill */}
                <linearGradient id="priceTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.45" />
                  <stop offset="70%" stopColor="#166534" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#166534" stopOpacity="0.0" />
                </linearGradient>

                {/* Line Gradient */}
                <linearGradient id="priceLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#15803d" />
                  <stop offset="50%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#166534" />
                </linearGradient>

                {/* Soft Drop Shadow for Point Markers */}
                <filter id="pointShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
                </filter>
              </defs>

              {/* Horizontal Gridlines & Y-Axis Labels */}
              {yTicks.map((val, idx) => {
                const yPos = paddingTop + plotHeight - ((val - yMin) / yRange) * plotHeight;
                return (
                  <g key={idx}>
                    <line
                      x1={paddingLeft}
                      y1={yPos}
                      x2={width - paddingRight}
                      y2={yPos}
                      stroke="#f1f5f9"
                      strokeWidth="1.5"
                      strokeDasharray={idx === 0 ? 'none' : '4 4'}
                    />
                    <text
                      x={paddingLeft - 12}
                      y={yPos + 4}
                      textAnchor="end"
                      fontSize="11"
                      fontWeight="600"
                      fill="#64748b"
                      fontFamily="sans-serif"
                    >
                      ₹{val}
                    </text>
                  </g>
                );
              })}

              {/* Filled Area under Curve */}
              {areaPath && (
                <path d={areaPath} fill="url(#priceTrendGradient)" />
              )}

              {/* Smooth Trend Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="url(#priceLineGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Hover Crosshair Guide */}
              {hoveredPoint && hoveredPoint.hasPrice && (
                <g pointerEvents="none">
                  <line
                    x1={hoveredPoint.x}
                    y1={paddingTop}
                    x2={hoveredPoint.x}
                    y2={paddingTop + plotHeight}
                    stroke="#166534"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="8"
                    fill="#22c55e"
                    opacity="0.3"
                  />
                  <circle
                    cx={hoveredPoint.x}
                    cy={hoveredPoint.y}
                    r="5"
                    fill="#166534"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </g>
              )}

              {/* Interactive Data Points and Date Labels */}
              {points.map((pt, idx) => {
                if (!pt.hasPrice) {
                  // Mandi Closed gap marker
                  return (
                    <g key={idx}>
                      <text
                        x={pt.x}
                        y={paddingTop + plotHeight + 20}
                        textAnchor="middle"
                        fontSize="10"
                        fontWeight="500"
                        fill="#94a3b8"
                      >
                        {pt.date?.slice(5)}
                      </text>
                      <text
                        x={pt.x}
                        y={paddingTop + plotHeight - 10}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                        fontStyle="italic"
                      >
                        बंद
                      </text>
                    </g>
                  );
                }

                const isHighest = pt.price === maxVal;
                const isHovered = hoveredPoint?.date === pt.date;

                return (
                  <g
                    key={idx}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Invisible larger hover hotspot */}
                    <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />

                    {/* Visible point circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? '6' : isHighest ? '5' : '4'}
                      fill={isHighest ? '#15803d' : '#22c55e'}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? '2.5' : '2'}
                      filter="url(#pointShadow)"
                      className="transition-all duration-200"
                    />

                    {/* Price floating above peak */}
                    {isHighest && !isHovered && (
                      <g>
                        <rect
                          x={pt.x - 24}
                          y={pt.y - 26}
                          width="48"
                          height="18"
                          rx="6"
                          fill="#166534"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 13}
                          textAnchor="middle"
                          fontSize="10"
                          fontWeight="bold"
                          fill="#ffffff"
                        >
                          ₹{pt.price}
                        </text>
                      </g>
                    )}

                    {/* X-axis date label */}
                    <text
                      x={pt.x}
                      y={paddingTop + plotHeight + 22}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={isHovered ? '700' : '500'}
                      fill={isHovered ? '#0f3d24' : '#64748b'}
                      fontFamily="sans-serif"
                    >
                      {pt.date?.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        ) : (
          /* Dynamic Bar Chart View with Enhanced Contrast */
          <div className="pt-4 pb-2">
            <div className="flex items-end gap-3 md:gap-4 h-56 border-b border-gray-200 pb-2 px-2 overflow-x-auto">
              {calendarSeries.map((item, idx) => {
                const hasPrice = item.modalPrice !== null && !isNaN(Number(item.modalPrice));
                const price = hasPrice ? Number(item.modalPrice) : null;
                // Scale bar heights relative to yRange for clear visual contrast
                const heightPercent = hasPrice ? Math.max(18, Math.round(((price - yMin) / yRange) * 100)) : 0;
                const isHovered = hoveredPoint?.date === item.date;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredPoint({ date: item.date, price, hasPrice })}
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="flex-1 min-w-[42px] flex flex-col items-center justify-end h-full group cursor-pointer"
                  >
                    {hasPrice ? (
                      <>
                        <span className={`text-[11px] font-black mb-1.5 transition ${
                          isHovered ? 'text-[#166534] scale-110' : 'text-gray-700'
                        }`}>
                          ₹{price}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full max-w-[36px] rounded-t-xl transition-all duration-300 shadow-sm ${
                            isHovered
                              ? 'bg-gradient-to-t from-[#0f3d24] to-[#22c55e] scale-y-105'
                              : 'bg-gradient-to-t from-[#166534] to-[#4ade80]'
                          }`}
                        />
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-end pb-2">
                        <span className="text-[10px] text-gray-400 italic mb-1">बंद</span>
                        <div className="w-full max-w-[36px] h-2 bg-gray-200 rounded" />
                      </div>
                    )}
                    <span className={`text-[11px] mt-2 truncate w-full text-center ${
                      isHovered ? 'font-bold text-[#0f3d24]' : 'font-medium text-gray-500'
                    }`}>
                      {item.date?.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && hoveredPoint.hasPrice && (
          <div className="mt-3 bg-gradient-to-r from-[#0f3d24] to-[#166534] text-white py-2.5 px-4 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-emerald-300" />
              <span>{lang === 'hi' ? 'तारीख:' : 'Date:'} <strong>{hoveredPoint.date}</strong></span>
            </div>
            <div className="flex items-center gap-3">
              <span>{lang === 'hi' ? 'मॉडल भाव:' : 'Modal Rate:'}</span>
              <span className="text-sm font-black text-[#22c55e] bg-white/10 px-2 py-0.5 rounded-lg">
                ₹{hoveredPoint.price?.toLocaleString('en-IN')} / क्विंटल
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Chart Footer Note */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-gray-400 border-t border-gray-100">
        <span>* ग्राफ का Y-Axis न्यूनतम और अधिकतम दर के अनुसार गतिशील रूप से स्केल किया गया है।</span>
        <span className="font-semibold text-gray-600">स्रोत: Agmarknet APMC Records</span>
      </div>
    </div>
  );
}
