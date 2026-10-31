/**
 * GIS Map – Navigation Tabs Component
 * Smooth switching between the 9 core analytical modules
 * © 2026 Salim Slimani & National Foresight System
 */

import React from 'react';
import {
  Map,
  TrendingUp,
  Activity,
  GitBranch,
  Bot,
  Landmark,
  AlertOctagon,
  Compass,
  Database
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

  return (
    <div className="bg-[#091224] border-b border-white/10 px-4 py-2 overflow-x-auto no-scrollbar">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 min-w-max">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
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
  );
};
