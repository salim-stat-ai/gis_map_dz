/**
 * GIS Map – National Early Warning System (NEWS) Dashboard
 * Continuous multi-threat surveillance & geo-diversified 3-horizon triage across 58 wilayas
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState } from 'react';
import { GeoZoneId, WilayaRecord } from '../types';
import { scanNationalEarlyWarnings } from '../engines/earlyWarning';
import {
  AlertOctagon,
  Droplets,
  Wheat,
  Waves,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Compass,
  Clock,
  HeartPulse,
  Flame,
  Train
} from 'lucide-react';

interface EarlyWarningDashboardProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  onViewOnMap?: (w: WilayaRecord) => void;
  targetYear: number;
  lang: 'ar' | 'en';
}

type HorizonView = 'all' | 'short' | 'medium' | 'long';

const GEO_BADGE_STYLES: Record<GeoZoneId, string> = {
  coastal: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  tell_basin: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  high_plateaus: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  oasis_north: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  deep_sahara: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30'
};

export const EarlyWarningDashboard: React.FC<EarlyWarningDashboardProps> = ({
  wilayas,
  selectedWilaya,
  onSelectWilaya,
  onViewOnMap,
  targetYear,
  lang
}) => {
  const isAr = lang === 'ar';

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [geoFilter, setGeoFilter] = useState<string>('all');
  const [horizonView, setHorizonView] = useState<HorizonView>('all');
  const [onlySelectedWilaya, setOnlySelectedWilaya] = useState<boolean>(false);

  const allAlerts = scanNationalEarlyWarnings(wilayas, targetYear, lang);

  const filteredAlerts = allAlerts.filter(a => {
    if (onlySelectedWilaya && a.wilayaNum !== selectedWilaya.num) return false;
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    if (geoFilter !== 'all' && a.geoZone !== geoFilter) return false;
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
              {isAr ? 'رصد الاختلالات وبروتوكولات الاستجابة حسب الجغرافيا والمدى الزمني' : 'Geo-Adaptive Early Warning & Multi-Horizon Protocols'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'بروتوكولات عملية مكيّفة مع طبيعة كل إقليم (ساحلي، تلي، سهبي، واحاتي، صحراوي عميق) ومقسمة إلى مدى قصير ومتوسط وطويل الأجل.'
                : 'Region-specific protocols tailored to coastal, Tell basin, steppe plateaus, northern oases, and deep Saharan infrastructure across short, medium, and long horizons.'}
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
      <div className="bg-[#0D172E] border border-white/10 rounded-xl p-3.5 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium me-1">{isAr ? 'القطاع:' : 'Hazard:'}</span>
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
              <span>{isAr ? 'فيضانات' : 'Flood'}</span>
            </button>
            <button
              onClick={() => setCategoryFilter('commerce')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'commerce' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <ShoppingBag className="w-3 h-3" />
              <span>{isAr ? 'فجوة تجارية' : 'Retail Gap'}</span>
            </button>
            <button
              onClick={() => setCategoryFilter('health')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'health' ? 'bg-teal-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <HeartPulse className="w-3 h-3" />
              <span>{isAr ? 'الصحة' : 'Health'}</span>
            </button>
            <button
              onClick={() => setCategoryFilter('hazards')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'hazards' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Flame className="w-3 h-3" />
              <span>{isAr ? 'أخطار طبيعية' : 'Hazards'}</span>
            </button>
            <button
              onClick={() => setCategoryFilter('transport')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'transport' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <Train className="w-3 h-3" />
              <span>{isAr ? 'النقل' : 'Transport'}</span>
            </button>
            <button
              onClick={() => setCategoryFilter('anomaly')}
              className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer flex items-center gap-1 ${categoryFilter === 'anomaly' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <AlertTriangle className="w-3 h-3" />
              <span>{isAr ? 'شذوذات مكانية' : 'Anomalies'}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setOnlySelectedWilaya(v => !v)}
              className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                onlySelectedWilaya
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-[#121F3D] border-white/10 text-slate-300 hover:border-white/25'
              }`}
            >
              {isAr ? `📍 ${selectedWilaya.n} فقط` : `📍 ${selectedWilaya.en} only`}
            </button>

            <select
              value={geoFilter}
              onChange={(e) => setGeoFilter(e.target.value)}
              className="bg-[#121F3D] text-slate-200 border border-white/10 rounded-lg px-2.5 py-1 text-xs font-bold cursor-pointer"
            >
              <option value="all">{isAr ? 'كل الأقاليم الجغرافية' : 'All Geo-Zones'}</option>
              <option value="coastal">{isAr ? 'ساحلية متوسطية' : 'Mediterranean Coastal'}</option>
              <option value="tell_basin">{isAr ? 'الأطلس التلي والسدود' : 'Tell Atlas & Dam Basin'}</option>
              <option value="high_plateaus">{isAr ? 'الهضاب العليا والسهوب' : 'High-Plateaus & Steppe'}</option>
              <option value="oasis_north">{isAr ? 'الواحات والحوض الشمالي' : 'Northern Oasis Basin'}</option>
              <option value="deep_sahara">{isAr ? 'الصحراء الكبرى والهقار' : 'Deep Sahara & Hoggar'}</option>
            </select>

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

        {/* Time Horizon Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1 me-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'مدى البروتوكول:' : 'Protocol Horizon:'}</span>
            </span>
            {(
              [
                ['all', isAr ? 'جميع الآجال (قصير / متوسط / طويل)' : 'All Horizons (Short / Med / Long)'],
                ['short', isAr ? 'قصير المدى (0–12 شهراً)' : 'Short-Term (0–12m)'],
                ['medium', isAr ? 'متوسط المدى (1–3 سنوات)' : 'Medium-Term (1–3y)'],
                ['long', isAr ? 'طويل المدى (2030–2035)' : 'Long-Term (2030–2035)']
              ] as [HorizonView, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setHorizonView(key)}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  horizonView === key
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-[#121F3D] text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {isAr ? `${filteredAlerts.length} تنبيه نشط` : `${filteredAlerts.length} active alert(s)`} · {targetYear}
          </span>
        </div>
      </div>

      {/* Empty State */}
      {filteredAlerts.length === 0 && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-8 text-center text-slate-400 text-sm">
          {isAr
            ? 'لا توجد إنذارات مطابقة للفلاتر المحددة حالياً.'
            : 'No active early warning alerts match the selected filters.'}
        </div>
      )}

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

          const geoClass = alert.geoZone ? GEO_BADGE_STYLES[alert.geoZone] : 'bg-slate-800 text-slate-300 border-white/10';
          const p = alert.protocols;

          return (
            <div
              key={alert.id}
              className={`border rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between transition-transform hover:-translate-y-0.5 ${cardBorder}`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full inline-block ${isCrit ? 'bg-rose-500 animate-ping' : isHigh ? 'bg-amber-400' : 'bg-sky-400'}`} />
                      <b className="text-white text-sm">
                        {alert.wilayaNum}. {isAr ? alert.wilayaAr : alert.wilayaEn}
                      </b>
                    </div>
                    {alert.geoZoneLabel && (
                      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${geoClass}`}>
                          <Compass className="w-2.5 h-2.5" />
                          <span>{isAr ? alert.geoZoneLabelAr : alert.geoZoneLabel}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded shrink-0 ${
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

                {/* Metrics */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">{isAr ? 'المؤشر المرصود:' : 'Trigger Metric:'}</span>
                    <b className="text-slate-200 text-end">{alert.metric}</b>
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

                {/* Regional Capabilities & Methodology */}
                <div className="bg-[#091224] p-2.5 rounded-xl border border-white/5 text-[11px] text-slate-400 space-y-1">
                  {alert.regionalAssetNote && (
                    <div className="text-sky-300/90 font-medium">
                      <span className="text-slate-400 font-bold">{isAr ? 'إمكانات المنطقة: ' : 'Local Profile: '}</span>
                      {isAr ? alert.regionalAssetNoteAr : alert.regionalAssetNote}
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-slate-300">{isAr ? 'المنهجية: ' : 'Methodology: '}</span>
                    <span>{alert.calculationMethod}</span>
                  </div>
                </div>

                {/* Diversified 3-Horizon Protocols */}
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-xl text-xs space-y-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1 text-[11px]">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{isAr ? 'البروتوكول الموصى به (حسب الإمكانات والمدى):' : 'Geo-Tailored Multi-Horizon Protocol:'}</span>
                  </span>

                  {p ? (
                    <div className="space-y-2 text-[11px] leading-relaxed">
                      {(horizonView === 'all' || horizonView === 'short') && (
                        <div className="bg-[#07161B]/80 border border-emerald-500/20 rounded-lg p-2">
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-emerald-300 mb-0.5">
                            {isAr ? '⚡ المدى القصير (0–12 شهراً)' : '⚡ Short-Term (0–12m)'}
                          </span>
                          <p className="text-slate-200">{isAr ? p.shortTermAr : p.shortTerm}</p>
                        </div>
                      )}
                      {(horizonView === 'all' || horizonView === 'medium') && (
                        <div className="bg-[#07161B]/80 border border-sky-500/20 rounded-lg p-2">
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-sky-300 mb-0.5">
                            {isAr ? '⚙️ المدى المتوسط (1–3 سنوات)' : '⚙️ Medium-Term (1–3y)'}
                          </span>
                          <p className="text-slate-200">{isAr ? p.mediumTermAr : p.mediumTerm}</p>
                        </div>
                      )}
                      {(horizonView === 'all' || horizonView === 'long') && (
                        <div className="bg-[#07161B]/80 border border-purple-500/20 rounded-lg p-2">
                          <span className="inline-block text-[10px] font-extrabold uppercase tracking-wide text-purple-300 mb-0.5">
                            {isAr ? '🎯 المدى الطويل (2030–2035)' : '🎯 Long-Term (2030–2035)'}
                          </span>
                          <p className="text-slate-200">{isAr ? p.longTermAr : p.longTerm}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {isAr ? alert.suggestedActionAr : alert.suggestedAction}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  const target = wilayas.find(w => w.num === alert.wilayaNum);
                  if (target) {
                    if (onViewOnMap) {
                      onViewOnMap(target);
                    } else {
                      onSelectWilaya(target);
                    }
                  }
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
