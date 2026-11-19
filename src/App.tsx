/**
 * GIS Map – Geo-Intelligence & Quantitative Foresight for Algeria 2030
 * Main Application Orchestrator
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState, useEffect } from 'react';
import { SectorKey, WilayaRecord } from './types';
import { INITIAL_WILAYAS } from './engines/dataRegistry';
import { scanNationalEarlyWarnings } from './engines/earlyWarning';

import { Header } from './components/Header';
import { NavigationTabs } from './components/NavigationTabs';
import { GisMapSection } from './components/GisMapSection';
import { QuantitativeCenter } from './components/QuantitativeCenter';
import { SpatialAnalysisLab } from './components/SpatialAnalysisLab';
import { ScenarioCenter } from './components/ScenarioCenter';
import { AgentsCenter } from './components/AgentsCenter';
import { CouncilChamber } from './components/CouncilChamber';
import { EarlyWarningDashboard } from './components/EarlyWarningDashboard';
import { Foresight2030Dashboard } from './components/Foresight2030Dashboard';
import { DataImportStudio } from './components/DataImportStudio';
import { ReportModal } from './components/ReportModal';

export default function App() {
  const [wilayas, setWilayas] = useState<WilayaRecord[]>(INITIAL_WILAYAS);
  // Default wilaya Setif (num: 19)
  const [selectedWilaya, setSelectedWilaya] = useState<WilayaRecord>(() => {
    return INITIAL_WILAYAS.find(w => w.num === 19) || INITIAL_WILAYAS[0];
  });
  const [currentSector, setCurrentSector] = useState<SectorKey>('all');
  const [targetYear, setTargetYear] = useState<number>(2030);
  const [lang, setLang] = useState<'ar' | 'en'>('en');
  const [activeTab, setActiveTab] = useState<string>('map');
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);
  const [mapFocusRequest, setMapFocusRequest] = useState<{ wilayaNum: number; ts: number } | null>(null);

  // Sync document direction and language with state
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const criticalAlerts = scanNationalEarlyWarnings(wilayas, targetYear, lang).filter(
    a => a.severity === 'CRITICAL'
  );

  const handleQuickAiDiagnosis = () => {
    setActiveTab('council');
  };

  const handleViewWilayaOnMap = (w: WilayaRecord) => {
    setSelectedWilaya(w);
    setActiveTab('map');
    setMapFocusRequest({ wilayaNum: w.num, ts: Date.now() });
  };

  const handleMergeWilayas = (merged: WilayaRecord[]) => {
    setWilayas(merged);
    const updatedSelected = merged.find(w => w.num === selectedWilaya.num);
    if (updatedSelected) setSelectedWilaya(updatedSelected);
  };

  const isAr = lang === 'ar';

  return (
    <div className={`min-h-screen bg-[#070D1B] text-[#E2E8F0] flex flex-col font-['Cairo','Inter',sans-serif]`}>
      {/* 1. Header */}
      <Header
        currentSector={currentSector}
        onSectorChange={setCurrentSector}
        selectedWilaya={selectedWilaya}
        wilayas={wilayas}
        onSelectWilaya={handleViewWilayaOnMap}
        targetYear={targetYear}
        onYearChange={setTargetYear}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'ar' ? 'en' : 'ar'))}
        onQuickAiDiagnosis={handleQuickAiDiagnosis}
        onOpenReport={() => setIsReportOpen(true)}
        onNavigateTab={setActiveTab}
      />

      {/* 2. Hero Banner (Faithful to legacy gis_map) */}
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-2 w-full">
        <div className="bg-[#0B152B]/85 border border-white/10 rounded-2xl p-2 sm:p-3 shadow-2xl backdrop-blur-md overflow-hidden">
          {/* Main Hero Banner Image */}
          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-[#070D1B]">
            <img
              src="/assets/banner.svg"
              alt="gis_map — Geo-Intelligence for Algeria"
              className="w-full h-auto max-h-[220px] sm:max-h-[260px] md:max-h-[290px] object-cover sm:object-contain object-left md:object-center"
            />
          </div>

          {/* Slogan & Sector Filter Pills Row */}
          <div className="mt-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 px-1 text-xs text-slate-300">
            <div className="leading-relaxed">
              <span className="font-extrabold text-white">
                {isAr ? 'من الاستجابة للأزمات ← إلى الاستشراف الكمي 2030.' : 'From crisis response → to quantitative forecasting 2030.'}
              </span>{' '}
              {isAr
                ? 'كل تحدٍ اقتصادي وبيئي في الجزائر له عنوان على الأرض. المنصة تدمج البيانات المكانية مع نماذج ARIMA والانحدار والوكلاء السبعة بدقة رياضية.'
                : 'Every socio-economic challenge in Algeria has an address on the ground. gis_map layers real estate, soil, rainfall, dams, and factories with mathematical rigor.'}
            </div>

            {/* Sector Pills */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-xs">
              <span
                onClick={() => { setCurrentSector('all'); setActiveTab('map'); }}
                className={`px-2.5 py-1 rounded-full border cursor-pointer transition font-medium ${currentSector === 'all' ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
              >
                🌐 {isAr ? 'الكل' : 'All'}
              </span>
              <span
                onClick={() => { setCurrentSector('realestate'); setActiveTab('map'); }}
                className={`px-2.5 py-1 rounded-full border cursor-pointer transition font-medium ${currentSector === 'realestate' ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
              >
                🏠 {isAr ? 'السكن' : 'Housing'}
              </span>
              <span
                onClick={() => { setCurrentSector('agri'); setActiveTab('map'); }}
                className={`px-2.5 py-1 rounded-full border cursor-pointer transition font-medium ${currentSector === 'agri' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
              >
                🌾 {isAr ? 'الفلاحة' : 'Farming'}
              </span>
              <span
                onClick={() => { setCurrentSector('water'); setActiveTab('map'); }}
                className={`px-2.5 py-1 rounded-full border cursor-pointer transition font-medium ${currentSector === 'water' ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
              >
                💧 {isAr ? 'المياه' : 'Water'}
              </span>
              <span
                onClick={() => { setCurrentSector('commerce'); setActiveTab('map'); }}
                className={`px-2.5 py-1 rounded-full border cursor-pointer transition font-medium ${currentSector === 'commerce' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
              >
                🛒 {isAr ? 'التجارة' : 'Retail'}
              </span>
              <span
                onClick={() => { setCurrentSector('industry'); setActiveTab('map'); }}
                className={`px-2.5 py-1 rounded-full border cursor-pointer transition font-medium ${currentSector === 'industry' ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'}`}
              >
                🏭 {isAr ? 'الصناعة' : 'Industry'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        lang={lang}
        criticalAlertsCount={criticalAlerts.length}
      />

      {/* 4. Active Main Content Body */}
      <main className="flex-1 pb-12">
        {activeTab === 'map' && (
          <GisMapSection
            wilayas={wilayas}
            selectedWilaya={selectedWilaya}
            onSelectWilaya={setSelectedWilaya}
            currentSector={currentSector}
            onSectorChange={setCurrentSector}
            targetYear={targetYear}
            onYearChange={setTargetYear}
            lang={lang}
            onNavigateTab={setActiveTab}
            onOpenReport={() => setIsReportOpen(true)}
            focusRequest={mapFocusRequest}
          />
        )}

        {activeTab === 'quantitative' && (
          <QuantitativeCenter
            wilayas={wilayas}
            selectedWilaya={selectedWilaya}
            onSelectWilaya={setSelectedWilaya}
            lang={lang}
          />
        )}

        {activeTab === 'spatial' && (
          <SpatialAnalysisLab
            wilayas={wilayas}
            selectedWilaya={selectedWilaya}
            onSelectWilaya={setSelectedWilaya}
            lang={lang}
          />
        )}

        {activeTab === 'scenario' && (
          <ScenarioCenter
            wilayas={wilayas}
            selectedWilaya={selectedWilaya}
            onSelectWilaya={setSelectedWilaya}
            lang={lang}
          />
        )}

        {activeTab === 'agents' && (
          <AgentsCenter
            wilayas={wilayas}
            selectedWilaya={selectedWilaya}
            onSelectWilaya={setSelectedWilaya}
            targetYear={targetYear}
            lang={lang}
          />
        )}

        {activeTab === 'council' && (
          <CouncilChamber
            wilayas={wilayas}
            selectedWilaya={selectedWilaya}
            onSelectWilaya={setSelectedWilaya}
            targetYear={targetYear}
            lang={lang}
          />
        )}

        {activeTab === 'earlywarning' && (
          <EarlyWarningDashboard
            wilayas={wilayas}
            selectedWilaya={selectedWilaya}
            onSelectWilaya={setSelectedWilaya}
            onViewOnMap={handleViewWilayaOnMap}
            targetYear={targetYear}
            lang={lang}
          />
        )}

        {activeTab === 'foresight2030' && (
          <Foresight2030Dashboard
            wilayas={wilayas}
            targetYear={targetYear}
            onSelectWilaya={setSelectedWilaya}
            lang={lang}
          />
        )}

        {activeTab === 'import' && (
          <DataImportStudio
            wilayas={wilayas}
            onMergeWilayas={handleMergeWilayas}
            lang={lang}
            targetYear={targetYear}
          />
        )}
      </main>

      {/* 5. Strategic Report Modal */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        selectedWilaya={selectedWilaya}
        wilayas={wilayas}
        targetYear={targetYear}
        initialLang={lang}
      />

      {/* 6. Official Footer */}
      <footer className="bg-[#050A14] border-t border-white/10 px-4 py-6 text-center text-xs text-slate-400 space-y-2 mt-auto">
        <div className="font-bold text-white text-sm">
          gis_map — Geo-Intelligence & Quantitative Foresight for Algeria 🇩🇿
        </div>
        <p className="max-w-2xl mx-auto text-[11px] text-slate-400">
          {isAr
            ? 'المنصة الوطنية المندمجة للذكاء الجغرافي والاستشراف الكمي 2030. بيانات رسمية ونماذج إحصائية متقدمة — تحقق مع مصالح ONS / ANRH / ONM / DSA.'
            : 'National Geo-Intelligence platform integrating AI, GIS, and Quantitative Forecasting. Cross-check official feeds prior to executive investments.'}
        </p>
        <div className="text-[10px] text-slate-500 pt-1">
          © 2026 Copyright Salim Slimani & National Foresight System. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
