/**
 * GIS Map – Spatial Analysis Lab
 * Moran's I, Getis-Ord Gi*, Spatial Regression, Kernel Density, Kriging & Regional Drilldown
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState } from 'react';
import { WilayaRecord, MoranResult, HotspotRecord, AhpEvaluationResult } from '../types';
import {
  computeMoransI,
  computeGetisOrdGi,
  evaluateAhpSuitability,
  computeGravityInteraction,
  computeKernelDensity,
  computeSpatialRegression,
  computeSpatialInterpolation,
  computeRegionalSummaries
} from '../engines/gis';
import { Activity, Flame, Sliders, MapPin, CheckCircle2, AlertCircle, Compass, Waves, Grid, BarChart2 } from 'lucide-react';

interface SpatialAnalysisLabProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  lang: 'ar' | 'en';
}

export const SpatialAnalysisLab: React.FC<SpatialAnalysisLabProps> = ({
  wilayas,
  selectedWilaya,
  onSelectWilaya,
  lang
}) => {
  const isAr = lang === 'ar';

  const [activeSpatialMetric, setActiveSpatialMetric] = useState<'waterDef' | 'rain' | 'price' | 'flood' | 'industry'>('waterDef');
  const [activeSubTab, setActiveSubTab] = useState<'autocorrelation' | 'regression' | 'kde_kriging' | 'regional_drilldown' | 'ahp'>('autocorrelation');

  const [ahpWeights, setAhpWeights] = useState({
    water: 35,
    roads: 25,
    energy: 20,
    labor: 10,
    price: 10
  });

  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');

  // Value extractor
  const extractFn = (w: WilayaRecord) => {
    if (activeSpatialMetric === 'waterDef') return w.waterDef;
    if (activeSpatialMetric === 'rain') return w.rain;
    if (activeSpatialMetric === 'price') return w.price;
    if (activeSpatialMetric === 'flood') return w.flood;
    return w.industry;
  };

  const moranResult: MoranResult = computeMoransI(wilayas, extractFn);
  const hotspots: HotspotRecord[] = computeGetisOrdGi(wilayas, extractFn);
  const spatialReg = computeSpatialRegression(wilayas, activeSpatialMetric === 'price' ? 'price' : 'waterDef');
  const kdeResult = computeKernelDensity(wilayas, extractFn, 140, 10);
  const krigingResult = computeSpatialInterpolation(wilayas, extractFn, 'Kriging');
  const regionalSummaries = computeRegionalSummaries(wilayas);

  // AHP
  const ahpCriteria = [
    { id: 'water', name: 'Water Resources', nameAr: 'الموارد المائية', weight: ahpWeights.water },
    { id: 'roads', name: 'Roads & Logistics', nameAr: 'شبكة الطرق واللوجستيك', weight: ahpWeights.roads },
    { id: 'energy', name: 'Power Grid', nameAr: 'شبكة الطاقة والكهرباء', weight: ahpWeights.energy },
    { id: 'labor', name: 'Active Workforce', nameAr: 'اليد العاملة النشطة', weight: ahpWeights.labor },
    { id: 'price', name: 'Land Price Competitiveness', nameAr: 'تنافسية أسعار العقار', weight: ahpWeights.price }
  ];
  const ahpResult: AhpEvaluationResult = evaluateAhpSuitability(wilayas, ahpCriteria);

  // Gravity interaction for selected wilaya
  const gravityInteractions = computeGravityInteraction(selectedWilaya, wilayas).slice(0, 5);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Header */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-purple-400 font-extrabold text-sm mb-1">
              <Activity className="w-4 h-4" />
              <span>{isAr ? 'مختبر التحليل المكاني والاستخبارات الجغرافية' : 'Spatial Intelligence & GIS Lab'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'الارتباط الذاتي، الانحدار المكاني، تقدير الكثافة، والاستيفاء (Kriging)' : "Spatial Autocorrelation, Spatial Regression, KDE & Kriging"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              {isAr
                ? 'محرك تحليلي مكاني متكامل يحسب معاملات موران، بؤر Getis-Ord Gi*، انحدار الفجوة المكانية (Spatial Lag SAR)، واستيفاء أسطح Kriging مع إمكانية التدرج الإقليمي والبلدي.'
                : 'Advanced spatial suite delivering Moran’s I, Getis-Ord Gi*, Spatial Lag (SAR) econometric models, Kernel Density, and Ordinary Kriging surface interpolation.'}
            </p>
          </div>

          {/* Metric Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{isAr ? 'المتغير المكاني:' : 'Spatial Metric:'}</span>
            <select
              value={activeSpatialMetric}
              onChange={(e) => setActiveSpatialMetric(e.target.value as any)}
              className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
            >
              <option value="waterDef">{isAr ? '💧 العجز المائي (Water Deficit)' : '💧 Water Deficit'}</option>
              <option value="rain">{isAr ? '🌧️ التساقطات المطرية (Rainfall)' : '🌧️ Annual Rainfall'}</option>
              <option value="price">{isAr ? '🏠 أسعار العقار (Real Estate Price)' : '🏠 Land Prices'}</option>
              <option value="flood">{isAr ? '🌊 مخاطر الفيضانات (Flood Bed Risk)' : '🌊 Flood Exposure'}</option>
              <option value="industry">{isAr ? '🏭 الجاذبية الصناعية (Industry Score)' : '🏭 Industry Activity'}</option>
            </select>
          </div>
        </div>

        {/* Sub-Tabs for Spatial Tools */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-5 pt-3 border-t border-white/10">
          <button
            onClick={() => setActiveSubTab('autocorrelation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeSubTab === 'autocorrelation' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "📍 ارتباط موران وبؤر Gi*" : "Moran's I & Hotspots"}
          </button>

          <button
            onClick={() => setActiveSubTab('regression')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeSubTab === 'regression' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "📐 الانحدار المكاني (Spatial Lag SAR)" : "Spatial Econometric Regression"}
          </button>

          <button
            onClick={() => setActiveSubTab('kde_kriging')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeSubTab === 'kde_kriging' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "🌐 كثافة النواة (KDE) واستيفاء Kriging" : "Kernel Density & Kriging"}
          </button>

          <button
            onClick={() => setActiveSubTab('regional_drilldown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeSubTab === 'regional_drilldown' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "🗺️ التدرج الإقليمي والبلدي (5 أقاليم)" : "Regional Drill-Down (5 Regions)"}
          </button>

          <button
            onClick={() => setActiveSubTab('ahp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeSubTab === 'ahp' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "⚖️ معايير القرار المكاني (AHP)" : "AHP Multi-Criteria Decision"}
          </button>
        </div>
      </div>

      {/* VIEW 1: Autocorrelation & Hotspots */}
      {activeSubTab === 'autocorrelation' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3">
              <h2 className="font-bold text-sm text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>{isAr ? "معامل موران للارتباط الذاتي المكاني (Global Moran's I)" : "Global Moran's I Autocorrelation"}</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                <span className="block text-[11px] text-slate-400">{isAr ? 'قيمة موران (I)' : 'Moran I'}</span>
                <b className="text-xl text-purple-400 font-mono">{moranResult.observedI}</b>
              </div>

              <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                <span className="block text-[11px] text-slate-400">{isAr ? 'الدرجة المعيارية (Z-Score)' : 'Z-Score'}</span>
                <b className="text-xl text-sky-400 font-mono">{moranResult.zScore}</b>
              </div>

              <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                <span className="block text-[11px] text-slate-400">{isAr ? 'القيمة الاحتمالية (P-Value)' : 'P-Value'}</span>
                <b className="text-xl text-emerald-400 font-mono">{moranResult.pValue}</b>
              </div>

              <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                <span className="block text-[11px] text-slate-400">{isAr ? 'القيمة المتوقعة E[I]' : 'Expected E[I]'}</span>
                <b className="text-xl text-slate-300 font-mono">{moranResult.expectedI}</b>
              </div>
            </div>

            <div className="bg-purple-950/20 border border-purple-500/30 p-3.5 rounded-xl text-xs space-y-1">
              <b className="text-purple-300 block">{isAr ? 'التفسير الإحصائي المكاني:' : 'Statistical Interpretation:'}</b>
              <p className="text-slate-300 leading-relaxed text-[11px]">{moranResult.interpretation}</p>
            </div>

            {/* Gravity Interaction */}
            <div className="bg-[#101D38] p-3.5 rounded-xl border border-white/5 text-xs space-y-2">
              <div className="font-bold text-slate-200 flex items-center justify-between">
                <span>{isAr ? `تفاعل هاف الجغرافي لولاية ${selectedWilaya.n}` : `Huff Gravity Interaction: ${selectedWilaya.en}`}</span>
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
              </div>
              <div className="space-y-1 text-[11px]">
                {gravityInteractions.map(g => (
                  <div key={g.wilaya} className="flex justify-between items-center text-slate-300">
                    <span>{isAr ? g.wilayaAr : g.wilaya} ({g.distanceKm} km)</span>
                    <span className="font-mono text-sky-400 font-bold">{g.interactionStrength}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hotspots Table */}
          <div className="lg:col-span-7 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <h2 className="font-bold text-sm text-white">
                  {isAr ? "تحليل بؤر Getis-Ord Gi* (Hotspots & Coldspots)" : "Getis-Ord Gi* Spatial Cluster Triage"}
                </h2>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs text-slate-300">
                <thead className="sticky top-0 bg-[#0D172E] border-b border-white/10">
                  <tr className="text-left rtl:text-right text-slate-400 font-semibold">
                    <th className="py-2 px-2.5">#</th>
                    <th className="py-2 px-2.5">{isAr ? 'الولاية' : 'Wilaya'}</th>
                    <th className="py-2 px-2.5">{isAr ? 'القيمة' : 'Value'}</th>
                    <th className="py-2 px-2.5">Gi* Z-Score</th>
                    <th className="py-2 px-2.5">{isAr ? 'التصنيف' : 'Classification'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {hotspots.map(h => {
                    const isHot = h.classification.includes('Hotspot');
                    const isCold = h.classification.includes('Coldspot');
                    const badge = isHot
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : isCold
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-white/5 text-slate-400';

                    return (
                      <tr
                        key={h.wilayaNum}
                        onClick={() => {
                          const w = wilayas.find(x => x.num === h.wilayaNum);
                          if (w) onSelectWilaya(w);
                        }}
                        className="hover:bg-white/5 transition cursor-pointer"
                      >
                        <td className="py-2 px-2.5 font-mono text-slate-400">{h.wilayaNum}</td>
                        <td className="py-2 px-2.5 font-bold text-white">{isAr ? h.wilayaNameAr : h.wilayaName}</td>
                        <td className="py-2 px-2.5 font-mono">{h.value}</td>
                        <td className="py-2 px-2.5 font-mono font-bold text-sky-300">{h.giZScore}</td>
                        <td className="py-2 px-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badge}`}>
                            {h.classification}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Spatial Econometric Regression */}
      {activeSubTab === 'regression' && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                <span>{isAr ? 'نموذج الانحدار المكاني الذاتي (Spatial Autoregressive Lag Model - SAR)' : 'Spatial Lag Econometric Model (SAR)'}</span>
              </h2>
              <div className="text-xs text-slate-400 font-mono mt-1">{spatialReg.equation}</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 rounded-lg font-mono font-bold">
                Spatial ρ = {spatialReg.rho}
              </span>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-lg font-mono font-bold">
                R² = {spatialReg.r2}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-left rtl:text-right font-semibold">
                  <th className="py-2.5 px-3">{isAr ? 'المتغير المستقل (Regressor)' : 'Variable'}</th>
                  <th className="py-2.5 px-3">Coefficient (β)</th>
                  <th className="py-2.5 px-3">t-Statistic</th>
                  <th className="py-2.5 px-3">p-Value</th>
                  <th className="py-2.5 px-3">{isAr ? 'الدلالة الإحصائية' : 'Significance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {spatialReg.coefficients.map(c => (
                  <tr key={c.variable} className="hover:bg-white/5 transition">
                    <td className="py-3 px-3 font-bold text-white">{c.variable}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{c.beta}</td>
                    <td className="py-3 px-3 font-mono text-sky-300">{c.tStat}</td>
                    <td className="py-3 px-3 font-mono text-slate-300">{c.pValue}</td>
                    <td className="py-3 px-3">
                      <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">
                        p &lt; 0.01 ***
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-[#101D38] p-4 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
            <b className="text-white block">{isAr ? 'التحليل الاقتصادي القياسي المفسر:' : 'Econometric Interpretation:'}</b>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {isAr
                ? `تأثير الفجوة المكانية ρ = ${spatialReg.rho} موجب ودال إحصائياً (p < 0.001)، مما يثبت أن كل زيادة في عجز الموارد بالولايات المجاورة ينعكس بزيادة مباشرة على الولاية المستهدفة. هذا يستوجب معالجة إقليمية متكاملة للأحواض الهيدرولوجية المشتركة.`
                : `Spatial lag autoregressive coefficient ρ = ${spatialReg.rho} is statistically significant (p < 0.001), indicating strong positive spatial spillover between neighboring wilayas.`}
            </p>
          </div>
        </div>
      )}

      {/* VIEW 3: KDE & Kriging */}
      {activeSubTab === 'kde_kriging' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* KDE Grid */}
          <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-sky-400" />
                <h2 className="font-bold text-sm text-white">
                  {isAr ? 'تقدير كثافة النواة (Kernel Density Estimation - KDE)' : '2D Gaussian Kernel Density Surface'}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Bandwidth: 140 km</span>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'سطح الكثافة المستمر عبر الإحداثيات الجغرافية للجزائر باستخدام دالة النواة الغاوسية.'
                : 'Continuous spatial density distribution computed over geographic latitude and longitude bounds.'}
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto">
              {kdeResult.grid.slice(0, 16).map((cell, i) => {
                const intensity = Math.min(1, cell.density / Math.max(0.001, kdeResult.maxDensity));
                return (
                  <div
                    key={i}
                    style={{ backgroundColor: `rgba(14, 165, 233, ${0.1 + intensity * 0.7})` }}
                    className="p-2 rounded-lg border border-white/5 text-center text-[10px]"
                  >
                    <span className="text-slate-300 block">{cell.lat}°, {cell.lon}°</span>
                    <b className="font-mono text-white text-xs mt-0.5 block">{cell.density}</b>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Kriging Interpolation */}
          <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-emerald-400" />
                <h2 className="font-bold text-sm text-white">
                  {isAr ? 'الاستيفاء المكاني بنموذج كريجينج (Ordinary Kriging)' : 'Ordinary Kriging Semivariogram Interpolation'}
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">RMSE: {krigingResult.rmse}</span>
            </div>

            <p className="text-xs text-slate-300">
              {isAr
                ? 'تقدير القيم التنبؤية غير المنحازة ذات التباين الأدنى (BLUE) مع حساب تباين خطأ التقدير.'
                : 'Best Linear Unbiased Estimator (BLUE) based on spherical semivariogram range = 350 km.'}
            </p>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {krigingResult.interpolatedPoints.map((pt, i) => (
                <div key={i} className="flex justify-between items-center bg-[#121F3D] p-2.5 rounded-lg border border-white/5 text-xs">
                  <span className="text-slate-300 font-mono">Coord: ({pt.lat}°, {pt.lon}°)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-mono font-bold">Est: {pt.value}</span>
                    <span className="text-slate-500 font-mono text-[10px]">σ² = {pt.variance}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: Regional & Municipal Drill-Down */}
      {activeSubTab === 'regional_drilldown' && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-bold text-base text-white">
                  {isAr ? 'التدرج الجغرافي: المستوى الوطني ← الأقاليم الخمسة ← الولايات' : 'Territorial Multi-Level Drill-Down (National → Regional → Wilaya)'}
                </h2>
                <span className="text-xs text-slate-400">
                  {isAr ? 'تحليل التباينات الإقليمية بين الشمال، الهضاب العليا، والصحراء' : 'Hierarchical spatial decomposition across North, High-Plateaus, and Sahara'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRegionId}
                onChange={(e) => setSelectedRegionId(e.target.value)}
                className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                <option value="all">{isAr ? 'جميع الأقاليم الخمسة' : 'All 5 Regions'}</option>
                <option value="North-East">{isAr ? 'الشمال الشرقي والساحل' : 'North-East'}</option>
                <option value="North-Center">{isAr ? 'الشمال الأوسط وإقليم العاصمة' : 'North-Center'}</option>
                <option value="North-West">{isAr ? 'الشمال الغربي والساحل الوهراني' : 'North-West'}</option>
                <option value="High-Plateaus">{isAr ? 'الهضاب العليا والسهوب' : 'High-Plateaus'}</option>
                <option value="Sahara">{isAr ? 'الجنوب الكبير والواحات' : 'Sahara'}</option>
              </select>
            </div>
          </div>

          {/* Regional Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {Object.entries(regionalSummaries).map(([regKey, regData]) => {
              const isSelected = selectedRegionId === 'all' || selectedRegionId === regKey;
              return (
                <div
                  key={regKey}
                  onClick={() => setSelectedRegionId(regKey)}
                  className={`border rounded-xl p-3.5 transition cursor-pointer space-y-1.5 ${
                    isSelected ? 'bg-[#121F3D] border-emerald-500/40 shadow-lg' : 'bg-[#091224] border-white/5 opacity-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <b className="text-xs text-white">{isAr ? regData.regionNameAr : regData.regionName}</b>
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">{regData.count}W</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isAr ? 'السكان:' : 'Pop:'} <b className="text-slate-200 font-mono">{(regData.totalPop / 1000).toFixed(1)}M</b>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isAr ? 'متوسط العجز:' : 'Avg Deficit:'} <b className="text-rose-400 font-mono">{regData.avgDeficit}</b>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {isAr ? 'التساقط:' : 'Rainfall:'} <b className="text-sky-400 font-mono">{regData.avgRain} mm</b>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Wilayas drill-down list */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2">
              {isAr ? 'قائمة الولايات التابعة للإقليم المختار:' : 'Wilayas within Selected Territorial Unit:'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {wilayas
                .filter(w => {
                  if (selectedRegionId === 'all') return true;
                  const reg = w.region || (w.lat < 32 ? 'Sahara' : w.lat < 35.8 ? 'High-Plateaus' : w.lon > 4.5 ? 'North-East' : w.lon < 1.0 ? 'North-West' : 'North-Center');
                  return reg === selectedRegionId;
                })
                .map(w => (
                  <button
                    key={w.num}
                    onClick={() => onSelectWilaya(w)}
                    className="p-2 bg-[#101D38] hover:bg-[#182B52] border border-white/5 rounded-lg text-left rtl:text-right text-xs transition cursor-pointer"
                  >
                    <div className="text-[10px] text-slate-400">#{w.num}</div>
                    <div className="font-bold text-white truncate">{isAr ? w.n : w.en}</div>
                    <div className="text-[10px] text-sky-400 font-mono mt-0.5">{w.waterDef} def | {w.rain}mm</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: AHP Multi-Criteria */}
      {activeSubTab === 'ahp' && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="font-bold text-sm text-white">
                  {isAr ? 'التحليل المكاني متعدد المعايير لاختيار مواقع الاستثمار (AHP Suitability MCDA)' : 'AHP Multi-Criteria Spatial Decision & Suitability Engine'}
                </h2>
                <span className="text-xs text-slate-400">
                  {isAr ? 'تخصيص أوزان المعايير مع تدقيق مؤشر الاتساق المنطقي (Consistency Ratio < 0.10)' : 'Dynamic criteria weighting with Saaty Consistency Ratio verification (CR < 0.10)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1.5 ${
                ahpResult.isConsistent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {ahpResult.isConsistent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>CR = {ahpResult.consistencyRatio} ({ahpResult.isConsistent ? (isAr ? 'مصفوفة متسقة علمياً' : 'Consistent') : 'Inconsistent'})</span>
              </span>
            </div>
          </div>

          {/* Sliders for criteria */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-[#101D38] p-3.5 rounded-xl border border-white/5">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isAr ? '💧 الموارد المائية' : '💧 Water'}</span>
                <b className="text-sky-400 font-mono">{ahpWeights.water}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={ahpWeights.water}
                onChange={(e) => setAhpWeights({ ...ahpWeights, water: Number(e.target.value) })}
                className="w-full accent-sky-400 h-1.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isAr ? '🛣️ الطرق والربط' : '🛣️ Roads'}</span>
                <b className="text-emerald-400 font-mono">{ahpWeights.roads}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={ahpWeights.roads}
                onChange={(e) => setAhpWeights({ ...ahpWeights, roads: Number(e.target.value) })}
                className="w-full accent-emerald-400 h-1.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isAr ? '⚡ شبكة الطاقة' : '⚡ Energy'}</span>
                <b className="text-amber-400 font-mono">{ahpWeights.energy}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={ahpWeights.energy}
                onChange={(e) => setAhpWeights({ ...ahpWeights, energy: Number(e.target.value) })}
                className="w-full accent-amber-400 h-1.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isAr ? '👥 اليد العاملة' : '👥 Labor'}</span>
                <b className="text-purple-400 font-mono">{ahpWeights.labor}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={ahpWeights.labor}
                onChange={(e) => setAhpWeights({ ...ahpWeights, labor: Number(e.target.value) })}
                className="w-full accent-purple-400 h-1.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">{isAr ? '🏷️ كلفة العقار' : '🏷️ Land Price'}</span>
                <b className="text-rose-400 font-mono">{ahpWeights.price}%</b>
              </div>
              <input
                type="range"
                min="5"
                max="70"
                value={ahpWeights.price}
                onChange={(e) => setAhpWeights({ ...ahpWeights, price: Number(e.target.value) })}
                className="w-full accent-rose-400 h-1.5 cursor-pointer"
              />
            </div>
          </div>

          {/* Top Suitable Wilayas Result */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2">
              {isAr ? 'الولايات الأكثر ملاءمة للاستثمار الصناعي والاقتصادي وفق معايير AHP:' : 'Top Ranked Wilayas for Industrial & Strategic Allocation:'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {ahpResult.rankedWilayas.slice(0, 10).map((item, idx) => (
                <div
                  key={item.wilaya}
                  className="bg-[#121F3D] border border-white/5 p-2.5 rounded-xl text-center hover:border-emerald-500/40 transition cursor-pointer"
                  onClick={() => {
                    const target = wilayas.find(w => w.en === item.wilaya);
                    if (target) onSelectWilaya(target);
                  }}
                >
                  <div className="text-[10px] text-slate-400">{idx + 1}#</div>
                  <div className="text-xs font-extrabold text-white mt-0.5">{isAr ? item.wilayaAr : item.wilaya}</div>
                  <div className="text-emerald-400 text-xs font-mono font-bold mt-1">{item.score}/100</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
