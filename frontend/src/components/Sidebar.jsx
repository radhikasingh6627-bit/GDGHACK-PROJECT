import React from 'react';
import { Home, Store, TrendingUp, Scale, Compass, Bot, Bell, X } from 'lucide-react';
import Logo from './Logo';
import { useLanguage } from '../context/LanguageContext';

export default function Sidebar({ activePage, setActivePage, isOpen, onClose }) {
  const { t } = useLanguage();

  const navItems = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'live', label: t.nav.livePrices, icon: Store },
    { id: 'trends', label: t.nav.trends, icon: TrendingUp },
    { id: 'compare', label: t.nav.compare, icon: Scale },
    { id: 'nearest', label: t.nav.nearest, icon: Compass },
    { id: 'alerts', label: t.nav.alerts || 'व्हाट्सएप अलर्ट', icon: Bell },
    { id: 'assistant', label: t.nav.assistant, icon: Bot, isSpecial: true },
  ];

  const handleNavClick = (itemId) => {
    if (itemId === 'alerts') {
      setActivePage('home');
      setTimeout(() => {
        const el = document.getElementById('whatsapp-alerts');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      setActivePage(itemId);
    }
    if (onClose) onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <Logo size="default" />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            मुख्य मेन्यू / Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all duration-150 text-left ${
                  isActive
                    ? 'bg-[#166534] text-white shadow-sm'
                    : 'text-gray-700 hover:bg-emerald-50 hover:text-[#166534]'
                }`}
              >
                <Icon
                  size={19}
                  className={isActive ? 'text-white' : item.isSpecial ? 'text-emerald-600' : 'text-gray-500'}
                />
                <span className="flex-1">{item.label}</span>
                {item.isSpecial && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 text-[#166534]'
                  }`}>
                    Gemma 4
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info in sidebar */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/70">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-900 leading-snug">
            <p className="font-bold mb-0.5">🌾 किसान हेल्पलाइन</p>
            <p className="text-emerald-800 text-[11px]">Agmarknet डेटा आधारित सेवा। निःशुल्क व सुरक्षित।</p>
          </div>
        </div>
      </aside>
    </>
  );
}
