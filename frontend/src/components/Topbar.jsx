import React, { useEffect, useState } from 'react';
import { Menu, Activity } from 'lucide-react';
import Logo from './Logo';
import LanguageToggle from './LanguageToggle';
import { checkBackendHealth } from '../services/api';

export default function Topbar({ onMenuClick }) {
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then((res) => {
      if (isMounted) {
        setBackendStatus(res.isOnline ? 'online' : 'offline');
      }
    });
    // Check health every 30 seconds
    const interval = setInterval(() => {
      checkBackendHealth().then((res) => {
        if (isMounted) {
          setBackendStatus(res.isOnline ? 'online' : 'offline');
        }
      });
    }, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between">
      {/* Left: Mobile hamburger & Logo */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl text-gray-700 hover:bg-gray-100 lg:hidden focus:outline-none"
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>

        {/* Mobile Logo */}
        <div className="lg:hidden">
          <Logo size="default" />
        </div>

        {/* Desktop title note */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>राष्ट्रीय कृषि बाज़ार (APMC) लाइव डेटा पोर्टल</span>
        </div>
      </div>

      {/* Right: Server health indicator & Language Toggle */}
      <div className="flex items-center gap-3">
        {/* Backend health status badge */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            backendStatus === 'online'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : backendStatus === 'offline'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}
          title={backendStatus === 'online' ? 'Backend operational on port 5001' : 'Backend not reachable on port 5001'}
        >
          <Activity size={12} className={backendStatus === 'online' ? 'text-emerald-600' : 'text-amber-600'} />
          <span>{backendStatus === 'online' ? 'सर्वर ऑनलाइन' : backendStatus === 'offline' ? 'सर्वर ऑफलाइन' : 'जाँच जारी...'}</span>
        </div>

        {/* Language Toggle */}
        <LanguageToggle />
      </div>
    </header>
  );
}
