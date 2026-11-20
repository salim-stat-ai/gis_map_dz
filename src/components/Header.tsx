/**
 * GIS Map – Header Component
 * Bilingual header with sector filter, wilaya search, horizon slider, and action buttons
 * © 2026 Salim Slimani & National Foresight System
 */

import React from 'react';
import { SectorKey, WilayaRecord } from '../types';
import { Globe, Sparkles, FileText } from 'lucide-react';
import logoSvg from '../../assets/logo.svg';

interface HeaderProps {
  currentSector: SectorKey;
  onSectorChange: (sector: SectorKey) => void;
  selectedWilaya: WilayaRecord;
  wilayas: WilayaRecord[];
  onSelectWilaya: (w: WilayaRecord) => void;
  targetYear: number;
  onYearChange: (year: number) => void;
  lang: 'ar' | 'en';
  onToggleLang: () => void;
  onQuickAiDiagnosis: () => void;
  onOpenReport: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentSector,
  onSectorChange,
  selectedWilaya,
  wilayas,
  onSelectWilaya,
  targetYear,
  onYearChange,
  lang,
  onToggleLang,
  onQuickAiDiagnosis,
  onOpenReport,
  onNavigateTab
}) => {
  const isAr = lang === 'ar';

  return (
    <header className="bg-[#0B152B] border-b border-white/10 px-3 sm:px-4 py-2.5 sm:py-3 sticky top-0 z-50 shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Brand Block */}
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer min-w-0" onClick={() => onNavigateTab('map')}>
            <img
              src={logoSvg}
              alt="gis_map logo"
              className="w-9 h-9 sm:w-11 sm:h-11 object-contain drop-shadow-md transition-transform hover:scale-105 shrink-0"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white font-['Sora']">
                  gis_map 🗺️
                </span>
                <span className="text-white/40 hidden sm:inline">—</span>
                <span className="text-xs sm:text-sm font-semibold text-slate-300 truncate">
                  {isAr ? 'الذكاء الجغرافي والاستشراف الوطني للجزائر' : 'Geo-Intelligence for Algeria'}
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full">
                  2030
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden md:block">
                {isAr
                  ? 'انظر المشكلة على الخريطة، تجد الحل بالبيانات والنماذج الكمية.'
                  : 'See the problem on the map, find the solution with quantitative AI.'}
              </p>
            </div>
          </div>

          {/* Mobile quick language switch beside brand on very small viewports */}
          <button
            onClick={onToggleLang}
            className="sm:hidden flex items-center gap-1 bg-[#101D38] hover:bg-[#182B52] text-slate-300 border border-white/15 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'EN' : 'العربية'}</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full xl:w-auto">
          {/* Sector Selector */}
          <div className="relative col-span-1">
            <select
              value={currentSector}
              onChange={(e) => onSectorChange(e.target.value as SectorKey)}
              className="w-full sm:w-auto bg-[#101D38] text-slate-200 border border-white/15 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-emerald-500 hover:bg-[#152649] transition cursor-pointer"
            >
              <option value="all">{isAr ? 'جميع القطاعات التسعة' : 'All 9 Sectors'}</option>
              <option value="realestate">{isAr ? '🏠 العقار والسكن' : '🏠 Real Estate'}</option>
              <option value="agri">{isAr ? '🌾 الفلاحة والمحاصيل' : '🌾 Agriculture'}</option>
              <option value="water">{isAr ? '💧 الموارد المائية' : '💧 Water'}</option>
              <option value="commerce">{isAr ? '🛒 التغطية التجارية' : '🛒 Retail'}</option>
              <option value="industry">{isAr ? '🏭 الصناعة والطاقة' : '🏭 Industry'}</option>
              <option value="health">{isAr ? '🏥 الصحة والمستشفيات' : '🏥 Health'}</option>
              <option value="hazards">{isAr ? '🌋 الأخطار الطبيعية' : '🌋 Natural Hazards'}</option>
              <option value="transport">{isAr ? '🚆 النقل والسكك الحديدية' : '🚆 Transport'}</option>
              <option value="tourism">{isAr ? '🏖️ السياحة والتراث' : '🏖️ Tourism & Heritage'}</option>
            </select>
          </div>

          {/* Wilaya Dropdown */}
          <div className="relative col-span-1 sm:min-w-[180px]">
            <select
              value={selectedWilaya.num}
              onChange={(e) => {
                const found = wilayas.find(w => w.num === Number(e.target.value));
                if (found) onSelectWilaya(found);
              }}
              className="w-full bg-[#101D38] text-slate-200 border border-white/15 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-sky-500 hover:bg-[#152649] transition cursor-pointer"
            >
              {wilayas.map((w) => (
                <option key={w.num} value={w.num}>
                  {w.num}. {isAr ? `${w.n} (${w.en})` : `${w.en} · ${w.n}`}
                </option>
              ))}
            </select>
          </div>

          {/* Target Horizon Slider Pill */}
          <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-start gap-2 bg-[#101D38] border border-white/15 rounded-lg px-3 py-1.5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">{isAr ? 'الأفق:' : 'Horizon:'}</span>
              <span className="font-extrabold text-amber-400">{targetYear}</span>
            </div>
            <input
              type="range"
              min="2026"
              max="2035"
              value={targetYear}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="w-24 sm:w-16 accent-amber-400 cursor-pointer h-1.5"
            />
          </div>

          {/* AI Quick Diagnosis Button */}
          <button
            onClick={onQuickAiDiagnosis}
            className="col-span-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-md hover:shadow-emerald-900/30 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{isAr ? 'تشخيص الذكاء الاصطناعي' : 'Run AI Analysis'}</span>
          </button>

          {/* Report Button */}
          <button
            onClick={onOpenReport}
            className="col-span-1 flex items-center justify-center gap-1.5 bg-[#172545] hover:bg-[#1E315C] text-slate-200 border border-white/15 font-semibold text-xs px-3 py-1.5 rounded-lg transition cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">{isAr ? 'تقرير استراتيجي' : 'Report / تقرير'}</span>
          </button>

          {/* Language Toggle (Desktop/Tablet) */}
          <button
            onClick={onToggleLang}
            className="hidden sm:flex items-center gap-1 bg-[#101D38] hover:bg-[#182B52] text-slate-300 border border-white/15 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>{isAr ? 'EN' : 'العربية'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
