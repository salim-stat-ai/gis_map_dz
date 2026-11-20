/**
 * GIS Map – Scenario Simulation Center (National Foresight 2030)
 * Optimistic, Baseline, and Pessimistic Dynamic Trajectories
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState } from 'react';
import { ScenarioPathway, WilayaRecord } from '../types';
import { generateAllPathways, DEFAULT_SCENARIO_DRIVERS, ScenarioDriverSettings } from '../engines/scenario';
import { GitBranch, Sliders, Droplets, Wheat, Building2, Factory, RefreshCw, HeartPulse, ShieldAlert, TrainFront } from 'lucide-react';

interface ScenarioCenterProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  lang: 'ar' | 'en';
}

export const ScenarioCenter: React.FC<ScenarioCenterProps> = ({
  wilayas,
  selectedWilaya,
  onSelectWilaya,
  lang
}) => {
  const isAr = lang === 'ar';

  const [drivers, setDrivers] = useState<ScenarioDriverSettings>({
    ...DEFAULT_SCENARIO_DRIVERS.baseline
  });
  const [selectedHorizonYear, setSelectedHorizonYear] = useState<number>(2030);

  // Generate 3 pathways based on base settings + custom modifications
  const pathways: ScenarioPathway[] = generateAllPathways(selectedWilaya, {
    baseline: drivers
  });

  const resetToDefaults = () => {
    setDrivers({ ...DEFAULT_SCENARIO_DRIVERS.baseline });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm mb-1">
              <GitBranch className="w-4 h-4" />
              <span>{isAr ? 'محرك محاكاة السيناريوهات الاستشرافية 2030' : '2030 Scenario Simulation Engine'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'المسارات الثلاثة: المتفائل، المرجعي، والمتشائم' : 'Three Trajectories: Optimistic, Baseline & Pessimistic'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'محاكاة ديناميكية متصلة بالنموذج الكمي تُظهر أثر تغير السكان والمناخ ومشاريع التحلية والسقي الذكي على مستقبل الولاية.'
                : 'Interactive dynamic simulator assessing multi-year trajectories under climate shifts, demographic pressure, and infrastructure investments.'}
            </p>
          </div>

          {/* Wilaya & Year Selector */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedWilaya.num}
              onChange={(e) => {
                const w = wilayas.find(x => x.num === Number(e.target.value));
                if (w) onSelectWilaya(w);
              }}
              className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
            >
              {wilayas.map(w => (
                <option key={w.num} value={w.num}>
                  {w.num}. {isAr ? w.n : w.en}
                </option>
              ))}
            </select>

            <div className="bg-[#121F3D] border border-white/15 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">{isAr ? 'السنة المستهدفة:' : 'Target:'}</span>
              <b className="text-amber-400 font-mono text-sm">{selectedHorizonYear}</b>
              <input
                type="range"
                min="2026"
                max="2035"
                value={selectedHorizonYear}
                onChange={(e) => setSelectedHorizonYear(Number(e.target.value))}
                className="w-16 accent-amber-400 h-1 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Driver Controls Box */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">
              {isAr ? 'لوحة تحكم فرضيات ومحركات السيناريو المرجعي (Drivers & Assumptions)' : 'Scenario Drivers & Policy Assumptions'}
            </h2>
          </div>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg transition cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>{isAr ? 'إعادة ضبط للافتراضي' : 'Reset Defaults'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pop Growth */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'معدل نمو السكان السنوي' : 'Pop Growth Rate'}</span>
              <b className="text-sky-400 font-mono">+{drivers.popGrowthRatePct}%</b>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={drivers.popGrowthRatePct}
              onChange={(e) => setDrivers({ ...drivers, popGrowthRatePct: Number(e.target.value) })}
              className="w-full accent-sky-400 h-1.5 cursor-pointer"
            />
          </div>

          {/* Climate Rain Change */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'تغير التساقط السنوي' : 'Rainfall Anomaly'}</span>
              <b className={`font-mono ${drivers.climateRainChangePct < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {drivers.climateRainChangePct > 0 ? `+${drivers.climateRainChangePct}%` : `${drivers.climateRainChangePct}%`}
              </b>
            </div>
            <input
              type="range"
              min="-8.0"
              max="4.0"
              step="0.2"
              value={drivers.climateRainChangePct}
              onChange={(e) => setDrivers({ ...drivers, climateRainChangePct: Number(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 cursor-pointer"
            />
          </div>

          {/* Irrigation Efficiency */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'كفاءة السقي بالتقطير' : 'Drip Irrigation Eff.'}</span>
              <b className="text-emerald-400 font-mono">{drivers.irrigationEfficiencyPct}%</b>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="1"
              value={drivers.irrigationEfficiencyPct}
              onChange={(e) => setDrivers({ ...drivers, irrigationEfficiencyPct: Number(e.target.value) })}
              className="w-full accent-emerald-400 h-1.5 cursor-pointer"
            />
          </div>

          {/* Desalination Capacity */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'طاقة التحلية الإضافية' : 'Desalination Added'}</span>
              <b className="text-purple-400 font-mono">+{drivers.desalinationCapexMillionM3} M m³</b>
            </div>
            <input
              type="range"
              min="0"
              max="800"
              step="25"
              value={drivers.desalinationCapexMillionM3}
              onChange={(e) => setDrivers({ ...drivers, desalinationCapexMillionM3: Number(e.target.value) })}
              className="w-full accent-purple-400 h-1.5 cursor-pointer"
            />
          </div>

          {/* Urban Zoning Strictness */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'صرامة المخطط التوجيهي' : 'Zoning Strictness'}</span>
              <b className="text-amber-400 font-mono">{drivers.urbanZoningStrictness}/100</b>
            </div>
            <input
              type="range"
              min="10"
              max="95"
              step="5"
              value={drivers.urbanZoningStrictness}
              onChange={(e) => setDrivers({ ...drivers, urbanZoningStrictness: Number(e.target.value) })}
              className="w-full accent-amber-400 h-1.5 cursor-pointer"
            />
          </div>

          {/* Health Infrastructure Investment */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'الاستثمار الصحي والمستشفيات' : 'Health Infra Capex'}</span>
              <b className="text-rose-400 font-mono">+{drivers.healthInfraInvestmentPct}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              step="2"
              value={drivers.healthInfraInvestmentPct}
              onChange={(e) => setDrivers({ ...drivers, healthInfraInvestmentPct: Number(e.target.value) })}
              className="w-full accent-rose-400 h-1.5 cursor-pointer"
            />
          </div>

          {/* Hazard Mitigation Strictness */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'الوقاية من الأخطار (زلازل/حرائق)' : 'Hazard Mitigation (RPA)'}</span>
              <b className="text-orange-400 font-mono">{drivers.hazardMitigationStrictness}/100</b>
            </div>
            <input
              type="range"
              min="15"
              max="95"
              step="5"
              value={drivers.hazardMitigationStrictness}
              onChange={(e) => setDrivers({ ...drivers, hazardMitigationStrictness: Number(e.target.value) })}
              className="w-full accent-orange-400 h-1.5 cursor-pointer"
            />
          </div>

          {/* Rail & Transport Expansion */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">{isAr ? 'توسعة السكك والنقل' : 'Rail & Transit Capex'}</span>
              <b className="text-cyan-400 font-mono">+{drivers.transportRailExpansionPct}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="2"
              value={drivers.transportRailExpansionPct}
              onChange={(e) => setDrivers({ ...drivers, transportRailExpansionPct: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Pathways Comparison Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {pathways.map((path) => {
          const impact = path.impacts[selectedHorizonYear];
          const isOpt = path.id === 'optimistic';
          const isPess = path.id === 'pessimistic';

          const cardTheme = isOpt
            ? 'border-emerald-500/40 bg-emerald-950/10'
            : isPess
            ? 'border-rose-500/40 bg-rose-950/10'
            : 'border-sky-500/40 bg-sky-950/10';

          const titleColor = isOpt ? 'text-emerald-400' : isPess ? 'text-rose-400' : 'text-sky-400';

          return (
            <div
              key={path.id}
              className={`border rounded-2xl p-5 shadow-xl space-y-4 transition-transform hover:-translate-y-1 ${cardTheme}`}
            >
              <div className="border-b border-white/10 pb-3">
                <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${titleColor}`}>
                  {isAr
                    ? path.id === 'optimistic'
                      ? 'المسار المتفائل'
                      : path.id === 'pessimistic'
                      ? 'المسار المتشائم'
                      : 'المسار المرجعي'
                    : path.id}
                </span>
                <h3 className="font-extrabold text-base text-white mt-0.5">
                  {isAr ? path.nameAr : path.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {isAr ? path.descriptionAr : path.description}
                </p>
              </div>

              {/* Multi-indicator Metrics Box for Horizon Year */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center bg-[#091224] p-2.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isAr ? `العجز المائي (${selectedHorizonYear})` : `Water Deficit (${selectedHorizonYear})`}</span>
                  </span>
                  <b className={`font-mono text-sm ${impact.waterDeficit < -25 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {impact.waterDeficit}
                  </b>
                </div>

                <div className="flex justify-between items-center bg-[#091224] p-2.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Wheat className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isAr ? 'احتمال إجهاد الجفاف' : 'Crop Drought Risk'}</span>
                  </span>
                  <b className={`font-mono text-sm ${impact.droughtRiskPct > 60 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {impact.droughtRiskPct}%
                  </b>
                </div>

                <div className="flex justify-between items-center bg-[#091224] p-2.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Building2 className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isAr ? 'التوسع العمراني التراكمي' : 'Urban Expansion'}</span>
                  </span>
                  <b className="font-mono text-sm text-purple-400">+{impact.urbanGrowthPct}%</b>
                </div>

                <div className="flex justify-between items-center bg-[#091224] p-2.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <Factory className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isAr ? 'مؤشر الإنتاج الصناعي' : 'Industrial Index'}</span>
                  </span>
                  <b className="font-mono text-sm text-emerald-400">{impact.industrialCapacityIndex}/100</b>
                </div>

                <div className="flex justify-between items-center bg-[#091224] p-2.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                    <span>{isAr ? 'التغطية الصحية المتوقعة' : 'Health Coverage'}</span>
                  </span>
                  <b className="font-mono text-sm text-rose-300">{impact.healthCoveragePct}%</b>
                </div>

                <div className="flex justify-between items-center bg-[#091224] p-2.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                    <span>{isAr ? 'مؤشر الأخطار الطبيعية' : 'Hazard Exposure'}</span>
                  </span>
                  <b className={`font-mono text-sm ${impact.hazardRiskScore > 55 ? 'text-rose-400' : 'text-orange-300'}`}>
                    {impact.hazardRiskScore}/100
                  </b>
                </div>

                <div className="flex justify-between items-center bg-[#091224] p-2.5 rounded-lg border border-white/5">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <TrainFront className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isAr ? 'ربط النقل والسكك' : 'Transport & Rail'}</span>
                  </span>
                  <b className="font-mono text-sm text-cyan-400">{impact.transportConnectivityScore}/100</b>
                </div>
              </div>

              {/* Key Assumptions */}
              <div className="text-[11px] space-y-1 text-slate-400 border-t border-white/10 pt-3">
                <span className="font-bold text-slate-300 block">{isAr ? 'الافتراضات الأساسية للمسار:' : 'Core Assumptions:'}</span>
                {(isAr ? path.assumptionsAr : path.assumptions).map((a, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span>{a}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
