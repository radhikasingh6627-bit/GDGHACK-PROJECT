import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import HomePage from './pages/HomePage';
import LivePricesPage from './pages/LivePricesPage';
import PriceTrendsPage from './pages/PriceTrendsPage';
import CompareMandisPage from './pages/CompareMandisPage';
import NearestMandiPage from './pages/NearestMandiPage';
import AiAssistantPage from './pages/AiAssistantPage';
import { useLanguage } from './context/LanguageContext';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { lang } = useLanguage();

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage onNavigate={(pageId) => setActivePage(pageId)} />;
      case 'live':
        return <LivePricesPage onNavigate={(pageId) => setActivePage(pageId)} />;
      case 'trends':
        return <PriceTrendsPage onNavigate={(pageId) => setActivePage(pageId)} />;
      case 'compare':
        return <CompareMandisPage onNavigate={(pageId) => setActivePage(pageId)} />;
      case 'nearest':
        return <NearestMandiPage onNavigate={(pageId) => setActivePage(pageId)} />;
      case 'assistant':
        return <AiAssistantPage onNavigate={(pageId) => setActivePage(pageId)} />;
      default:
        return <HomePage onNavigate={(pageId) => setActivePage(pageId)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] text-gray-900 flex flex-col antialiased">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* 2. Main Content Area (offset on lg screens by sidebar width) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Topbar Header */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content View */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>

        {/* Farmer-friendly Footer */}
        <footer className="border-t border-gray-200 bg-white py-6 px-4 md:px-8 text-center text-xs text-gray-500">
          <div className="max-w-4xl mx-auto space-y-1">
            <p className="font-semibold text-gray-700">
              {lang === 'hi'
                ? 'MandiDarpan (मंडी दर्पण) • भारत सरकार के Agmarknet (data.gov.in) आंकड़ों पर आधारित'
                : 'MandiDarpan • Powered by Agmarknet (data.gov.in) authentic mandi data'}
            </p>
            <p className="text-gray-400">
              {lang === 'hi'
                ? 'सभी अधिकार सुरक्षित। कोई भी मूल्य मनगढ़ंत नहीं है, केवल सत्यापित सरकारी आंकड़े प्रदर्शित किए जाते हैं।'
                : 'All rights reserved. No invented prices or synthetic dates; strictly grounded data.'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
