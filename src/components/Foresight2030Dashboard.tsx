/**
 * GIS Map – National Foresight 2030 Dashboard
 * Holistic cross-sector territorial diagnosis & strategic rebalancing for Algeria
 * © 2026 Salim Slimani & National Foresight System
 */

import React from 'react';
import { WilayaRecord } from '../types';
import { Compass, Droplets, Wheat, Building2, ShoppingCart, Factory, Shield, TrendingUp, Users } from 'lucide-react';

interface Foresight2030DashboardProps {
  wilayas: WilayaRecord[];
  targetYear: number;
  onSelectWilaya: (w: WilayaRecord) => void;
  lang: 'ar' | 'en';
}

export const Foresight2030Dashboard: React.FC<Foresight2030DashboardProps> = ({
  wilayas,
  targetYear,
  onSelectWilaya,
  lang
}) => {
  const isAr = lang === 'ar';
  const horizon = targetYear - 2026;

  // National Aggregations
  const totalPop = Math.round(wilayas.reduce((acc, w) => acc + w.pop, 0));
  const projectedPop2030 = Math.round(totalPop * Math.pow(1.016, horizon));
  const avgDeficit2030 = Math.round(
    wilayas.reduce((acc, w) => acc + (w.waterDef * 10 - (w.pop * 0.035 * horizon) * 0.15 - (w.rain * 0.012 * horizon) * 0.2), 0) / wilayas.length
  );
  const avgDroughtRisk2030 = Math.round(
    wilayas.reduce((acc, w) => acc + Math.max(2, Math.min(98, 100 - (w.soil * 0.5 + w.rain * 0.06 + w.ndvi * 60) + horizon * 2.1)), 0) / wilayas.length
  );
  const avgUrbanGrowth2030 = Math.round(
    wilayas.reduce((acc, w) => acc + ((w.pop / 100) * (w.price / 50000) * horizon * 0.8 + horizon * 1.5), 0) / wilayas.length
  );

  // Top critical wilayas in 2030
  const topThirstWilayas = [...wilayas].sort((a, b) => a.waterDef - b.waterDef).slice(0, 5);
  const topDroughtWilayas = [...wilayas].sort((a, b) => (100 - (b.soil * 0.5 + b.rain * 0.06)) - (100 - (a.soil * 0.5 + a.rain * 0.06))).slice(0, 5);
  const topGrowthWilayas = [...wilayas].sort((a, b) => b.pop * b.price - a.pop * a.price).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm mb-1">
              <Compass className="w-4 h-4" />
              <span>{isAr ? 'لوحة الاستشراف الوطني الجزائر 2030' : 'National Foresight 2030 Observatory'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'الرؤية الوطنية المندمجة للقطاعات الخمسة والتوازن الإقليمي' : 'Integrated 5-Sector Territorial Rebalancing to 2030'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'استشراف كمي شامل يجمع بين الموارد المائية، الفلاحة والأمن الغذائي، التوسع العقاري، التوزيع التجاري، والجاذبية الصناعية عبر 58 ولاية.'
                : 'National cross-sector synthesis bridging water security, food autonomy, urban resilience, supply chain logistics, and industrial capacity.'}
            </p>
          </div>

          <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold text-center">
            <span>🇩🇿 Horizon {targetYear}</span>
          </div>
        </div>
      </div>

      {/* 5-Sector KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold">
            <Droplets className="w-3.5 h-3.5" />
            <span>{isAr ? 'الموارد المائية' : 'Water Resources'}</span>
          </div>
          <b className="text-xl font-mono text-white block">{avgDeficit2030}</b>
          <span className="text-[10px] text-slate-400 block">{isAr ? `متوسط العجز الوطني ${targetYear}` : `National Deficit Index`}</span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
            <Wheat className="w-3.5 h-3.5" />
            <span>{isAr ? 'الفلاحة والأمن الغذائي' : 'Agriculture & Yield'}</span>
          </div>
          <b className="text-xl font-mono text-amber-400 block">{avgDroughtRisk2030}%</b>
          <span className="text-[10px] text-slate-400 block">{isAr ? 'احتمال إجهاد الجفاف' : 'Drought Stress Index'}</span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'العقار والتوسع الحضري' : 'Real Estate & Sprawl'}</span>
          </div>
          <b className="text-xl font-mono text-purple-400 block">+{avgUrbanGrowth2030}%</b>
          <span className="text-[10px] text-slate-400 block">{isAr ? 'توسع الرقعة الحضرية' : 'Urban Expansion'}</span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isAr ? 'التغطية والتموين' : 'Supply Chain'}</span>
          </div>
          <b className="text-xl font-mono text-emerald-400 block">62.8%</b>
          <span className="text-[10px] text-slate-400 block">{isAr ? 'تغطية أسواق الجملة' : 'Wholesale Logistics'}</span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'السكان التقديري' : 'Demographics'}</span>
          </div>
          <b className="text-xl font-mono text-white block">{(projectedPop2030 / 1000).toFixed(1)} M</b>
          <span className="text-[10px] text-slate-400 block">{isAr ? `تعداد السكان في ${targetYear}` : `Projected Population`}</span>
        </div>
      </div>

      {/* Priority Rankings Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Water Hotspots */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-sm border-b border-white/10 pb-2.5">
            <Droplets className="w-4 h-4" />
            <span>{isAr ? `الولايات الأشد عجزاً مائياً (${targetYear})` : `Top Thirst-Risk Wilayas (${targetYear})`}</span>
          </div>
          <div className="space-y-2">
            {topThirstWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => onSelectWilaya(w)}
                className="flex items-center justify-between p-2.5 bg-[#121F3D] rounded-xl border border-white/5 hover:border-sky-500/30 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <b className="text-white">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-rose-400 font-bold">{w.waterDef} def</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agricultural Drought Risk */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm border-b border-white/10 pb-2.5">
            <Wheat className="w-4 h-4" />
            <span>{isAr ? `الولايات الأكثر تعرضاً لخطر الجفاف الفلاحي` : `Top Drought-Exposed Agricultural Wilayas`}</span>
          </div>
          <div className="space-y-2">
            {topDroughtWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => onSelectWilaya(w)}
                className="flex items-center justify-between p-2.5 bg-[#121F3D] rounded-xl border border-white/5 hover:border-amber-500/30 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <b className="text-white">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-amber-400 font-bold">{w.rain} mm/yr</span>
              </div>
            ))}
          </div>
        </div>

        {/* Urban Growth Hotspots */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-sm border-b border-white/10 pb-2.5">
            <Building2 className="w-4 h-4" />
            <span>{isAr ? `الأقطاب الحضرية الأسرع نمواً وضغطاً عقارياً` : `Fastest Urbanizing & High-Density Poles`}</span>
          </div>
          <div className="space-y-2">
            {topGrowthWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => onSelectWilaya(w)}
                className="flex items-center justify-between p-2.5 bg-[#121F3D] rounded-xl border border-white/5 hover:border-purple-500/30 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <b className="text-white">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-purple-400 font-bold">{w.pop}k pop</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
