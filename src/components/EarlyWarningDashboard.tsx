/**
 * GIS Map – National Early Warning System (NEWS) Dashboard
 * Continuous multi-threat surveillance & threshold triage across 58 wilayas
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState } from 'react';
import { EarlyWarningAlert, WilayaRecord } from '../types';
import { scanNationalEarlyWarnings } from '../engines/earlyWarning';
import { AlertOctagon, ShieldAlert, Droplets, Wheat, Waves, ShoppingBag, Eye, CheckCircle } from 'lucide-react';

interface EarlyWarningDashboardProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  targetYear: number;
  lang: 'ar' | 'en';
}

export const EarlyWarningDashboard: React.FC<EarlyWarningDashboardProps> = ({
  wilayas,
  onSelectWilaya,
  targetYear,
  lang
}) => {
  const isAr = lang === 'ar';

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const allAlerts = scanNationalEarlyWarnings(wilayas, targetYear, lang);

  const filteredAlerts = allAlerts.filter(a => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const criticalCount = allAlerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = allAlerts.filter(a => a.severity === 'HIGH').length;
  const mediumCount = allAlerts.filter(a => a.severity === 'MEDIUM').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 font-extrabold text-sm mb-1">
              <AlertOctagon className="w-4 h-4 animate-pulse" />
              <span>{isAr ? 'نظام الإنذار المبكر الوطني (National Early Warning)' : 'National Multi-Hazard Early Warning System'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'رصد الاختلالات، بؤر الإجهاد المائي، والمخاطر المناخية' : 'Real-Time Stress Detection & Operational Alerts'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'مراقبة هيدرولوجية، مناخية، وتجارية دقيقة تنبه أجهزة الدولة قبل وقوع الأزمة مع توثيق طريقة الحساب وهامش عدم اليقين.'
                : 'Proactive detection of groundwater depletion, agricultural drought, flood bed encroachment, and retail shortages.'}
            </p>
          </div>

          {/* Quick Severity Counters */}
          <div className="flex items-center gap-2">
            <div className="bg-rose-950/30 border border-rose-500/40 px-3 py-1.5 rounded-xl text-center">
              <b className="text-rose-400 font-mono text-base block">{criticalCount}</b>
              <span className="text-[10px] text-rose-300 uppercase font-bold">{isAr ? 'حرج' : 'Critical'}</span>
            </div>
            <div className="bg-amber-950/30 border border-amber-500/40 px-3 py-1.5 rounded-xl text-center">
              <b className="text-amber-400 font-mono text-base block">{highCount}</b>
              <span className="text-[10px] text-amber-300 uppercase font-bold">{isAr ? 'مرتفع' : 'High'}</span>
            </div>
            <div className="bg-sky-950/30 border border-sky-500/40 px-3 py-1.5 rounded-xl text-center">
              <b className="text-sky-400 font-mono text-base block">{mediumCount}</b>
              <span className="text-[10px] text-sky-300 uppercase font-bold">{isAr ? 'متوسط' : 'Medium'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#0D172E] border border-white/10 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 font-medium">{isAr ? 'القطاع المهدد:' : 'Hazard Category:'}</span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${categoryFilter === 'all' ? 'bg-white/20 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {isAr ? 'الكل' : 'All'}
          </button>
          <button
            onClick={() => setCategoryFilter('water')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'water' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Droplets className="w-3 h-3" />
            <span>{isAr ? 'مياه وعطش' : 'Water'}</span>
          </button>
          <button
            onClick={() => setCategoryFilter('drought')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'drought' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Wheat className="w-3 h-3" />
            <span>{isAr ? 'جفاف فلاحي' : 'Drought'}</span>
          </button>
          <button
            onClick={() => setCategoryFilter('flood')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'flood' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Waves className="w-3 h-3" />
            <span>{isAr ? 'فيضانات وعقار' : 'Flood'}</span>
          </button>
          <button
            onClick={() => setCategoryFilter('commerce')}
            className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'commerce' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <ShoppingBag className="w-3 h-3" />
            <span>{isAr ? 'فجوة تجارية' : 'Retail Gap'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">{isAr ? 'مستوى الخطورة:' : 'Severity:'}</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-[#121F3D] text-slate-200 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
          >
            <option value="all">{isAr ? 'جميع المستويات' : 'All Severities'}</option>
            <option value="CRITICAL">{isAr ? 'حرج (Critical)' : 'Critical'}</option>
            <option value="HIGH">{isAr ? 'مرتفع (High)' : 'High'}</option>
            <option value="MEDIUM">{isAr ? 'متوسط (Medium)' : 'Medium'}</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAlerts.map((alert) => {
          const isCrit = alert.severity === 'CRITICAL';
          const isHigh = alert.severity === 'HIGH';

          const cardBorder = isCrit
            ? 'border-rose-500/50 bg-rose-950/15'
            : isHigh
            ? 'border-amber-500/40 bg-amber-950/15'
            : 'border-white/10 bg-[#0D172E]';

          return (
            <div
              key={alert.id}
              className={`border rounded-2xl p-4 shadow-xl space-y-3 transition-transform hover:-translate-y-1 ${cardBorder}`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full animate-ping inline-block bg-rose-500" />
                  <b className="text-white text-sm">
                    {alert.wilayaNum}. {isAr ? alert.wilayaAr : alert.wilayaEn}
                  </b>
                </div>

                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isCrit
                      ? 'bg-rose-500 text-white'
                      : isHigh
                      ? 'bg-amber-500 text-black'
                      : 'bg-sky-500 text-white'
                  }`}
                >
                  {alert.severity}
                </span>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAr ? 'المؤشر المرصود:' : 'Trigger Metric:'}</span>
                  <b className="text-slate-200">{alert.metric}</b>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{isAr ? 'القيمة / العتبة الحرجة:' : 'Observed / Threshold:'}</span>
                  <b className="text-rose-400 font-mono">{alert.currentValue} / {alert.criticalThreshold}</b>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>{isAr ? 'هامش عدم اليقين:' : 'Uncertainty:'}</span>
                  <span>{alert.uncertaintyMargin}</span>
                </div>
              </div>

              {/* Calculation Method */}
              <div className="bg-[#091224] p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300 block">{isAr ? 'طريقة الحساب الرياضية:' : 'Methodology:'}</span>
                <span className="line-clamp-2">{alert.calculationMethod}</span>
              </div>

              {/* Suggested Operational Action */}
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-2.5 rounded-xl text-xs space-y-1">
                <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الإجراء العملياتي المقترح فوراً:' : 'Recommended Protocol:'}</span>
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  {isAr ? alert.suggestedActionAr : alert.suggestedAction}
                </p>
              </div>

              <button
                onClick={() => {
                  const target = wilayas.find(w => w.num === alert.wilayaNum);
                  if (target) onSelectWilaya(target);
                }}
                className="w-full text-center py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                {isAr ? 'عرض تشخيص الولاية الكامل على الخريطة' : 'View Wilaya on Map'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
