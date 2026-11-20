/**
 * GIS Map – Navigation Tabs Component
 * Smooth switching between the 9 core analytical modules
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Map,
  TrendingUp,
  Activity,
  GitBranch,
  Bot,
  Landmark,
  AlertOctagon,
  Compass,
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface TabItem {
  id: string;
  labelEn: string;
  labelAr: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
}

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  lang: 'ar' | 'en';
  criticalAlertsCount?: number;
}

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  lang,
  criticalAlertsCount = 0
}) => {
  const isAr = lang === 'ar';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const tabs: TabItem[] = [
    {
      id: 'map',
      labelEn: 'GIS Map & Layers',
      labelAr: 'الخريطة والطبقات',
      icon: <Map className="w-4 h-4" />,
      color: 'emerald'
    },
    {
      id: 'quantitative',
      labelEn: 'Quantitative Center',
      labelAr: 'مركز الاستشراف الكمي',
      icon: <TrendingUp className="w-4 h-4" />,
      badge: 'ARIMA/ML',
      color: 'sky'
    },
    {
      id: 'spatial',
      labelEn: 'Spatial Analysis Lab',
      labelAr: 'مختبر التحليل المكاني',
      icon: <Activity className="w-4 h-4" />,
      badge: "Moran's I",
      color: 'purple'
    },
    {
      id: 'scenario',
      labelEn: 'Scenario Simulation',
      labelAr: 'محاكاة السيناريوهات',
      icon: <GitBranch className="w-4 h-4" />,
      badge: '3 Pathways',
      color: 'amber'
    },
    {
      id: 'agents',
      labelEn: '7 AI Agents Team',
      labelAr: 'فريق الوكلاء السبعة',
      icon: <Bot className="w-4 h-4" />,
      color: 'teal'
    },
    {
      id: 'council',
      labelEn: 'AI Council Chamber',
      labelAr: 'مجلس الذكاء الاصطناعي',
      icon: <Landmark className="w-4 h-4" />,
      badge: '12-Steps',
      color: 'emerald'
    },
    {
      id: 'earlywarning',
      labelEn: 'Early Warning',
      labelAr: 'الإنذار المبكر',
      icon: <AlertOctagon className="w-4 h-4" />,
      badge: criticalAlertsCount > 0 ? `${criticalAlertsCount}` : undefined,
      color: 'red'
    },
    {
      id: 'foresight2030',
      labelEn: 'National Foresight 2030',
      labelAr: 'الاستشراف الوطني 2030',
      icon: <Compass className="w-4 h-4" />,
      badge: '🇩🇿 2030',
      color: 'gold'
    },
    {
      id: 'import',
      labelEn: 'Data Import & Lineage',
      labelAr: 'استيراد وإدارة البيانات',
      icon: <Database className="w-4 h-4" />,
      color: 'blue'
    }
  ];

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 4) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }
    const pos = Math.abs(el.scrollLeft);
    setCanScrollPrev(pos > 6);
    setCanScrollNext(pos < maxScroll - 6);
  };

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener('resize', updateScrollButtons);
    return () => window.removeEventListener('resize', updateScrollButtons);
  }, [lang, activeTab]);

  useEffect(() => {
    const btn = scrollRef.current?.querySelector(`[data-nav-tab="${activeTab}"]`) as HTMLElement | null;
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
  }, [activeTab]);

  const scrollByStep = (direction: 'prev' | 'next') => {
    const el = scrollRef.current;
    if (!el) return;
    const delta = 260;
    const signed = isAr
      ? direction === 'next' ? -delta : delta
      : direction === 'next' ? delta : -delta;
    el.scrollBy({ left: signed, behavior: 'smooth' });
  };

  return (
    <div className="bg-[#091224] border-b border-white/10 px-2 sm:px-4 pt-2 pb-1">
      <div className="max-w-7xl mx-auto relative flex items-center gap-1.5">
        {canScrollPrev && (
          <button
            type="button"
            onClick={() => scrollByStep('prev')}
            aria-label={isAr ? 'التمرير للبداية' : 'Scroll tabs left'}
            className="shrink-0 p-1.5 rounded-lg bg-[#101D38] hover:bg-[#17294F] border border-emerald-500/35 text-emerald-300 shadow cursor-pointer transition"
          >
            {isAr ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollButtons}
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && scrollRef.current) {
              const el = scrollRef.current;
              if (el.scrollWidth > el.clientWidth) {
                el.scrollLeft += isAr ? -e.deltaY : e.deltaY;
              }
            }
          }}
          className="flex-1 overflow-x-auto nav-scrollbar pb-2"
        >
          <div className="flex items-center gap-1.5 min-w-max">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  data-nav-tab={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600/30 to-sky-600/30 text-white border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                    {tab.icon}
                  </span>
                  <span>{isAr ? tab.labelAr : tab.labelEn}</span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded-full ${
                        tab.id === 'earlywarning' && criticalAlertsCount > 0
                          ? 'bg-rose-500 text-white animate-pulse'
                          : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {canScrollNext && (
          <button
            type="button"
            onClick={() => scrollByStep('next')}
            aria-label={isAr ? 'التمرير لبقية التبويبات' : 'Scroll tabs right'}
            className="shrink-0 p-1.5 rounded-lg bg-[#101D38] hover:bg-[#17294F] border border-emerald-500/35 text-emerald-300 shadow cursor-pointer transition"
          >
            {isAr ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};
