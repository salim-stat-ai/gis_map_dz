/**
 * GIS Map – National Foresight 2030 Dashboard
 * Holistic cross-sector territorial diagnosis, policy lever simulator, geo-zone matrix & strategic rebalancing for Algeria
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { GeoZoneId, WilayaRecord } from '../types';
import { classifyWilayaGeoZone } from '../engines/earlyWarning';
import { predictWater, cropRisk, urbanGrowth, industryScore, suitabilityAgri } from '../engines/reporting';
import {
  Compass,
  Droplets,
  Wheat,
  Building2,
  ShoppingCart,
  Factory,
  Users,
  Sliders,
  MapPin,
  Search,
  RotateCcw,
  TrendingUp,
  Layers,
  Target
} from 'lucide-react';

ChartJS.register(...registerables);

interface Foresight2030DashboardProps {
  wilayas: WilayaRecord[];
  targetYear: number;
  onSelectWilaya: (w: WilayaRecord) => void;
  onViewOnMap?: (w: WilayaRecord) => void;
  lang: 'ar' | 'en';
}

export const Foresight2030Dashboard: React.FC<Foresight2030DashboardProps> = ({
  wilayas,
  targetYear,
  onSelectWilaya,
  onViewOnMap,
  lang
}) => {
  const isAr = lang === 'ar';
  const horizon = Math.max(0, targetYear - 2026);

  const trajectoryChartRef = useRef<HTMLCanvasElement>(null);
  const trajectoryChartInstance = useRef<ChartJS | null>(null);
  const geoZoneChartRef = useRef<HTMLCanvasElement>(null);
  const geoZoneChartInstance = useRef<ChartJS | null>(null);

  // Interactive Filters & Policy Levers
  const [selectedGeoZone, setSelectedGeoZone] = useState<'all' | GeoZoneId>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [matrixSortBy, setMatrixSortBy] = useState<'risk' | 'water' | 'agri' | 'industry' | 'coverage'>('risk');

  // National 2030 Strategic Policy Levers
  const [desalinationBoostM3, setDesalinationBoostM3] = useState<number>(450); // M m3/yr
  const [precisionIrrigationPct, setPrecisionIrrigationPct] = useState<number>(65); // %
  const [newWholesaleHubs, setNewWholesaleHubs] = useState<number>(40); // hubs nationally
  const [interiorCorridorBoostPct, setInteriorCorridorBoostPct] = useState<number>(35); // %

  const resetLevers = () => {
    setDesalinationBoostM3(450);
    setPrecisionIrrigationPct(65);
    setNewWholesaleHubs(40);
    setInteriorCorridorBoostPct(35);
  };

  // Enrich all 58 wilayas with Geo-Zone & baseline vs policy-adjusted 2030 metrics
  const enrichedWilayas = useMemo(() => {
    const progressFactor = Math.min(1, Math.max(0.2, horizon / 4));
    const irrigationGain = (precisionIrrigationPct - 45) * 0.28 * progressFactor;
    const supplyHubLift = (newWholesaleHubs / 120) * 18 * progressFactor;

    return wilayas.map((w) => {
      const geo = classifyWilayaGeoZone(w);
      const baseWater = predictWater(w, targetYear);
      const baseDrought = cropRisk(w, targetYear);
      const baseUrban = urbanGrowth(w, targetYear);
      const baseInd = industryScore(w);
      const agriScore = Math.min(100, Math.round(w.soil * 0.45 + (w.rain / 10) * 0.25 + w.ndvi * 40));
      const agriSuitLabel = suitabilityAgri(w, isAr ? 'ar' : 'en');

      // Policy effect respects territorial realism (desalination helps coastal + nearby tell; solar/foggaras/drip helps south & plateaus)
      const desalFactor =
        geo.id === 'coastal' ? 0.14 : geo.id === 'tell_basin' ? 0.08 : geo.id === 'high_plateaus' ? 0.02 : 0;
      const waterRelief = Math.round(
        desalinationBoostM3 * desalFactor * progressFactor +
          irrigationGain * (geo.id === 'deep_sahara' || geo.id === 'oasis_north' || geo.id === 'high_plateaus' ? 2.4 : 1.4)
      );
      const policyWater = Math.round(baseWater + waterRelief);
      const policyDrought = Math.max(2, Math.min(98, Math.round(baseDrought - irrigationGain * 0.85)));
      const policyCoverage = Math.min(99, Math.round(w.coverage + (w.coverage < 75 ? supplyHubLift * 1.3 : supplyHubLift * 0.5)));
      const corridorBonus =
        geo.id === 'high_plateaus' || geo.id === 'oasis_north' || geo.id === 'deep_sahara'
          ? Math.round((interiorCorridorBoostPct / 100) * 14 * progressFactor)
          : Math.round((interiorCorridorBoostPct / 100) * 5 * progressFactor);
      const policyIndustry = Math.min(100, baseInd + corridorBonus);

      // Composite Vulnerability / Action Priority (0–100, higher = more urgent intervention needed)
      const urgencyScore = Math.round(
        Math.max(0, Math.min(100, (Math.abs(Math.min(0, baseWater)) / 4.2) * 0.35 + baseDrought * 0.25 + w.flood * 35 + (100 - w.coverage) * 0.25))
      );

      return {
        ...w,
        geo,
        baseWater,
        policyWater,
        baseDrought,
        policyDrought,
        baseUrban,
        baseInd,
        policyIndustry,
        agriScore,
        agriSuitLabel,
        policyCoverage,
        urgencyScore
      };
    });
  }, [wilayas, targetYear, horizon, desalinationBoostM3, precisionIrrigationPct, newWholesaleHubs, interiorCorridorBoostPct, isAr]);

  // National KPI Aggregations (All dynamically computed — zero hardcoded values)
  const totalPop = Math.round(wilayas.reduce((acc, w) => acc + w.pop, 0));
  const projectedPop = Math.round(totalPop * Math.pow(1.016, horizon));

  const avgBaseDeficit = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseWater, 0) / Math.max(1, enrichedWilayas.length)
  );
  const avgPolicyDeficit = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.policyWater, 0) / Math.max(1, enrichedWilayas.length)
  );

  const avgBaseDrought = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseDrought, 0) / Math.max(1, enrichedWilayas.length)
  );
  const avgPolicyDrought = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.policyDrought, 0) / Math.max(1, enrichedWilayas.length)
  );

  const avgUrbanGrowth = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseUrban, 0) / Math.max(1, enrichedWilayas.length)
  );

  const avgBaseCoverage =
    Math.round((wilayas.reduce((acc, w) => acc + w.coverage, 0) / Math.max(1, wilayas.length)) * 10) / 10;
  const avgPolicyCoverage =
    Math.round((enrichedWilayas.reduce((acc, w) => acc + w.policyCoverage, 0) / Math.max(1, enrichedWilayas.length)) * 10) / 10;

  const avgBaseIndustry = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseInd, 0) / Math.max(1, enrichedWilayas.length)
  );
  const avgPolicyIndustry = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.policyIndustry, 0) / Math.max(1, enrichedWilayas.length)
  );

  // Critical Wilayas saved by policy levers
  const severeThirstBaseCount = enrichedWilayas.filter((w) => w.baseWater <= -150).length;
  const severeThirstPolicyCount = enrichedWilayas.filter((w) => w.policyWater <= -150).length;

  // Geo-Zone Summary Breakdown
  const geoZoneSummaries = useMemo(() => {
    const order: GeoZoneId[] = ['coastal', 'tell_basin', 'high_plateaus', 'oasis_north', 'deep_sahara'];
    return order.map((zoneId) => {
      const group = enrichedWilayas.filter((w) => w.geo.id === zoneId);
      const count = Math.max(1, group.length);
      const popSum = group.reduce((s, w) => s + w.pop, 0);
      return {
        id: zoneId,
        label: group[0]?.geo.label || zoneId,
        labelAr: group[0]?.geo.labelAr || zoneId,
        count: group.length,
        popPct: Math.round((popSum / Math.max(1, totalPop)) * 1000) / 10,
        avgWater: Math.round(group.reduce((s, w) => s + w.baseWater, 0) / count),
        avgPolicyWater: Math.round(group.reduce((s, w) => s + w.policyWater, 0) / count),
        avgDrought: Math.round(group.reduce((s, w) => s + w.baseDrought, 0) / count),
        avgCoverage: Math.round(group.reduce((s, w) => s + w.policyCoverage, 0) / count),
        avgIndustry: Math.round(group.reduce((s, w) => s + w.policyIndustry, 0) / count)
      };
    });
  }, [enrichedWilayas, totalPop]);

  // Chart 1: National 2026-2035 Baseline vs Policy Water Deficit & Population Trajectory
  useEffect(() => {
    if (!trajectoryChartRef.current) return;
    if (trajectoryChartInstance.current) trajectoryChartInstance.current.destroy();

    const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
    const baseSeries = years.map((yr) =>
      Math.round(wilayas.reduce((acc, w) => acc + predictWater(w, yr), 0) / Math.max(1, wilayas.length))
    );
    const policySeries = years.map((yr) => {
      const h = Math.max(0, yr - 2026);
      const pf = Math.min(1, Math.max(0.15, h / 4));
      const avgRelief = Math.round(
        enrichedWilayas.reduce((acc, w) => {
          const desalF = w.geo.id === 'coastal' ? 0.14 : w.geo.id === 'tell_basin' ? 0.08 : w.geo.id === 'high_plateaus' ? 0.02 : 0;
          const irrGain = (precisionIrrigationPct - 45) * 0.28 * pf;
          const relief =
            desalinationBoostM3 * desalF * pf +
            irrGain * (w.geo.id === 'deep_sahara' || w.geo.id === 'oasis_north' || w.geo.id === 'high_plateaus' ? 2.4 : 1.4);
          return acc + predictWater(w, yr) + relief;
        }, 0) / Math.max(1, enrichedWilayas.length)
      );
      return avgRelief;
    });
    const popSeries = years.map((yr) => Math.round((totalPop * Math.pow(1.016, yr - 2026)) / 100) / 10);

    trajectoryChartInstance.current = new ChartJS(trajectoryChartRef.current, {
      type: 'line',
      data: {
        labels: years,
        datasets: [
          {
            label: isAr ? 'مسار العجز المائي المرجعي (بدون تدخل)' : 'Baseline Deficit Trajectory',
            data: baseSeries,
            borderColor: '#F43F5E',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            borderDash: [4, 4],
            borderWidth: 2,
            pointRadius: years.map((y) => (y === targetYear ? 6 : 3)),
            pointBackgroundColor: years.map((y) => (y === targetYear ? '#FBBF24' : '#F43F5E')),
            yAxisID: 'y'
          },
          {
            label: isAr ? 'مسار العجز بعد تفعيل السياسات المختارة' : 'Policy-Adjusted Deficit Trajectory',
            data: policySeries,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.14)',
            fill: true,
            borderWidth: 2.5,
            pointRadius: years.map((y) => (y === targetYear ? 6 : 3)),
            pointBackgroundColor: years.map((y) => (y === targetYear ? '#FBBF24' : '#10B981')),
            yAxisID: 'y'
          },
          {
            label: isAr ? 'السكان الوطني (مليون نسمة)' : 'National Population (M)',
            data: popSeries,
            borderColor: '#38BDF8',
            backgroundColor: 'transparent',
            borderWidth: 2,
            pointRadius: 2.5,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            labels: { color: '#CBD5E1', font: { size: 11 } }
          }
        },
        scales: {
          x: {
            ticks: {
              color: (c) => (Number(years[c.index]) === targetYear ? '#FBBF24' : '#94A3B8'),
              font: (c) => ({ size: 11, weight: Number(years[c.index]) === targetYear ? 'bold' : 'normal' })
            },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          y: {
            type: 'linear',
            position: 'left',
            ticks: { color: '#94A3B8', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.06)' },
            title: { display: true, text: isAr ? 'مؤشر العجز المائي' : 'Water Deficit Index', color: '#94A3B8', font: { size: 10 } }
          },
          y1: {
            type: 'linear',
            position: 'right',
            ticks: { color: '#38BDF8', font: { size: 10 } },
            grid: { drawOnChartArea: false },
            title: { display: true, text: isAr ? 'السكان (مليون)' : 'Population (M)', color: '#38BDF8', font: { size: 10 } }
          }
        }
      }
    });

    return () => {
      if (trajectoryChartInstance.current) trajectoryChartInstance.current.destroy();
    };
  }, [wilayas, enrichedWilayas, totalPop, targetYear, desalinationBoostM3, precisionIrrigationPct, isAr]);

  // Chart 2: Geo-Zone Comparison Bar Chart
  useEffect(() => {
    if (!geoZoneChartRef.current) return;
    if (geoZoneChartInstance.current) geoZoneChartInstance.current.destroy();

    geoZoneChartInstance.current = new ChartJS(geoZoneChartRef.current, {
      type: 'bar',
      data: {
        labels: geoZoneSummaries.map((g) => (isAr ? g.labelAr : g.label)),
        datasets: [
          {
            label: isAr ? 'التغطية التجارية (%)' : 'Retail Coverage (%)',
            data: geoZoneSummaries.map((g) => g.avgCoverage),
            backgroundColor: '#10B981',
            borderRadius: 5
          },
          {
            label: isAr ? 'الجاهزية الصناعية (/100)' : 'Industrial Readiness (/100)',
            data: geoZoneSummaries.map((g) => g.avgIndustry),
            backgroundColor: '#A78BFA',
            borderRadius: 5
          },
          {
            label: isAr ? 'خطر الجفاف (%)' : 'Drought Risk (%)',
            data: geoZoneSummaries.map((g) => g.avgDrought),
            backgroundColor: '#F59E0B',
            borderRadius: 5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#CBD5E1', font: { size: 11 } } }
        },
        scales: {
          x: { ticks: { color: '#CBD5E1', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { min: 0, max: 100, ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });

    return () => {
      if (geoZoneChartInstance.current) geoZoneChartInstance.current.destroy();
    };
  }, [geoZoneSummaries, isAr]);

  // Active Subset for Rankings & Matrix
  const zoneFiltered = useMemo(() => {
    return selectedGeoZone === 'all' ? enrichedWilayas : enrichedWilayas.filter((w) => w.geo.id === selectedGeoZone);
  }, [enrichedWilayas, selectedGeoZone]);

  // 5-Sector Priority Rankings
  const topThirstWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => a.baseWater - b.baseWater).slice(0, 5), [zoneFiltered]);
  const topDroughtWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.baseDrought - a.baseDrought).slice(0, 5), [zoneFiltered]);
  const topGrowthWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.pop * b.price - a.pop * a.price).slice(0, 5), [zoneFiltered]);
  const topRetailGapWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => a.coverage - b.coverage).slice(0, 5), [zoneFiltered]);
  const topIndustrialWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.policyIndustry - a.policyIndustry).slice(0, 5), [zoneFiltered]);

  // Matrix rows with search & sort
  const matrixRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const searched = q
      ? zoneFiltered.filter(
          (w) =>
            w.n.includes(searchTerm.trim()) ||
            w.en.toLowerCase().includes(q) ||
            String(w.num) === q
        )
      : zoneFiltered;

    return [...searched].sort((a, b) => {
      if (matrixSortBy === 'water') return a.baseWater - b.baseWater;
      if (matrixSortBy === 'agri') return b.agriScore - a.agriScore;
      if (matrixSortBy === 'industry') return b.policyIndustry - a.policyIndustry;
      if (matrixSortBy === 'coverage') return a.coverage - b.coverage;
      return b.urgencyScore - a.urgencyScore;
    });
  }, [zoneFiltered, searchTerm, matrixSortBy]);

  const handleWilayaJump = (w: WilayaRecord) => {
    onSelectWilaya(w);
    if (onViewOnMap) onViewOnMap(w);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* 1. Executive Header Banner */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-sm mb-1">
              <Compass className="w-4 h-4" />
              <span>{isAr ? 'مرصد الاستشراف الوطني الجزائر 2030' : 'National Foresight 2030 Observatory'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'الرؤية الوطنية المندمجة للقطاعات الخمسة والتوازن الإقليمي' : 'Integrated 5-Sector Territorial Rebalancing to 2030'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              {isAr
                ? 'استشراف كمي شامل عبر 58 ولاية و5 نطاقات جغرافية، يدمج محاكي السياسات الوطنية لعام 2030، مصفوفة الترتيب القطاعي، وتحليل المسارات التراكمية.'
                : 'Quantitative national synthesis across 58 wilayas & 5 geo-zones featuring a real-time 2030 policy lever simulator, 5-sector priority rankings, and trajectory curves.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold text-center">
              <span>🇩🇿 Horizon {targetYear}</span>
            </div>
            <div className="bg-[#121F3D] text-slate-300 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold">
              {isAr ? `${wilayas.length} ولاية · 5 أقاليم` : `${wilayas.length} Wilayas · 5 Geo-Zones`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 6-Card National KPI Grid (100% live computed baseline vs policy impact) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-sky-400 font-semibold">
            <Droplets className="w-3.5 h-3.5" />
            <span>{isAr ? 'الموارد المائية' : 'Water Resources'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-white">{avgBaseDeficit}</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyDeficit}</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? `المرجعي ← بعد السياسات (${targetYear})` : `Base → Policy Deficit`}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
            <Wheat className="w-3.5 h-3.5" />
            <span>{isAr ? 'إجهاد الجفاف' : 'Drought Stress'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-amber-400">{avgBaseDrought}%</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyDrought}%</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? 'انخفاض الخطر بالري الذكي' : 'Irrigated risk reduction'}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-purple-400 font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>{isAr ? 'التوسع الحضري' : 'Urban Sprawl'}</span>
          </div>
          <b className="text-xl font-mono text-purple-400 block">+{avgUrbanGrowth}%</b>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? `نمو الرقعة العمرانية إلى ${targetYear}` : `Projected to ${targetYear}`}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>{isAr ? 'التغطية والتموين' : 'Supply Chain'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-white">{avgBaseCoverage}%</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyCoverage}%</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? 'تغطية أسواق الجملة الحقيقية' : 'Live national market coverage'}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
            <Factory className="w-3.5 h-3.5" />
            <span>{isAr ? 'الجاهزية الصناعية' : 'Industry Index'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-indigo-300">{avgBaseIndustry}</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyIndustry}</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? 'متوسط النسيج الصناعي / 100' : 'National industrial score /100'}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
            <Users className="w-3.5 h-3.5" />
            <span>{isAr ? 'السكان التقديري' : 'Demographics'}</span>
          </div>
          <b className="text-xl font-mono text-white block">{(projectedPop / 1000).toFixed(1)} M</b>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? `من ${(totalPop / 1000).toFixed(1)}M حالياً إلى ${targetYear}` : `From ${(totalPop / 1000).toFixed(1)}M baseline`}
          </span>
        </div>
      </div>

      {/* 3. National Policy Levers Simulator */}
      <div className="bg-[#0D172E] border border-emerald-500/25 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <div>
              <h2 className="font-bold text-sm text-white">
                {isAr ? `مختبر محاكاة السياسات والاستثمارات الوطنية إلى أفق ${targetYear}` : `National 2030 Strategic Policy Lever Simulator`}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'عدّل الرافعات الأربع لقياس أثرها التراكمي على الولايات المهددة بالعطش والأمن الغذائي والتغطية التجارية'
                  : 'Adjust national investment levers to measure real-time impact across water security, food resilience & regional equity'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold">
              {isAr
                ? `إنقاذ ${Math.max(0, severeThirstBaseCount - severeThirstPolicyCount)} ولاية من العجز الحرج (${severeThirstBaseCount} ← ${severeThirstPolicyCount})`
                : `Critical Thirst Wilayas: ${severeThirstBaseCount} → ${severeThirstPolicyCount}`}
            </span>
            <button
              type="button"
              onClick={resetLevers}
              className="flex items-center gap-1 text-xs bg-[#121F3D] hover:bg-[#182B52] text-slate-300 border border-white/10 px-2.5 py-1 rounded-lg cursor-pointer transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{isAr ? 'افتراضي' : 'Reset'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-[#101D38] border border-white/5 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '🌊 توسعة محطات التحلية' : '🌊 Desalination Scale-Up'}</span>
              <b className="font-mono text-sky-400">+{desalinationBoostM3}M m³</b>
            </div>
            <input
              type="range"
              min="0"
              max="1200"
              step="50"
              value={desalinationBoostM3}
              onChange={(e) => setDesalinationBoostM3(Number(e.target.value))}
              className="w-full accent-sky-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'يدعم الساحل والأحواض التلية المجاورة' : 'Supplies coastal & tell perimeter'}
            </span>
          </div>

          <div className="bg-[#101D38] border border-white/5 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '💧 تعميم السقي الموضعي' : '💧 Precision Drip Irrigation'}</span>
              <b className="font-mono text-emerald-400">{precisionIrrigationPct}%</b>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              step="5"
              value={precisionIrrigationPct}
              onChange={(e) => setPrecisionIrrigationPct(Number(e.target.value))}
              className="w-full accent-emerald-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'حماية الفقارات والمياه الجوفية بالهضاب والصحراء' : 'Preserves aquifers in Plateaus & Sahara'}
            </span>
          </div>

          <div className="bg-[#101D38] border border-white/5 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '🛒 أقطاب التبريد وأسواق الجملة' : '🛒 Wholesale & Cold Hubs'}</span>
              <b className="font-mono text-amber-400">+{newWholesaleHubs}</b>
            </div>
            <input
              type="range"
              min="0"
              max="120"
              step="10"
              value={newWholesaleHubs}
              onChange={(e) => setNewWholesaleHubs(Number(e.target.value))}
              className="w-full accent-amber-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'يركز على الولايات ذات التغطية الأقل من 75%' : 'Targets under-served supply corridors'}
            </span>
          </div>

          <div className="bg-[#101D38] border border-white/5 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '🏭 تحويل الأقطاب الداخلية' : '🏭 Interior Industry Rebalance'}</span>
              <b className="font-mono text-purple-400">{interiorCorridorBoostPct}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={interiorCorridorBoostPct}
              onChange={(e) => setInteriorCorridorBoostPct(Number(e.target.value))}
              className="w-full accent-purple-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'فك العزلة الطاقوية واللوجستية عن الهضاب والجنوب' : 'Boosts Plateaus & Sahara industrial grids'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. National Charts Row: 2026–2035 Trajectory + 5 Geo-Zone Synthesis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">
                {isAr ? 'المسار الوطني (2026–2035): المرجعي مقابل السياسات' : 'National Trajectory (2026–2035): Baseline vs Policy'}
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-300">★ {targetYear}</span>
          </div>
          <div className="h-64 bg-[#081020] p-3 rounded-xl border border-white/5">
            <canvas ref={trajectoryChartRef} />
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm text-white">
                {isAr ? 'مقارنة التوازن الإقليمي عبر الأقاليم الجغرافية الـ5' : 'Territorial Balance Across the 5 Geo-Zones'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">{isAr ? 'انقر بطاقة أدناه للتصفية' : 'Click zone card below to filter'}</span>
          </div>
          <div className="h-64 bg-[#081020] p-3 rounded-xl border border-white/5">
            <canvas ref={geoZoneChartRef} />
          </div>
        </div>
      </div>

      {/* 5. Interactive 5 Geo-Zones Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => setSelectedGeoZone('all')}
          className={`p-3 rounded-xl border text-start transition cursor-pointer ${
            selectedGeoZone === 'all'
              ? 'bg-emerald-500/15 border-emerald-500/50 text-white shadow-lg'
              : 'bg-[#0D172E] border-white/10 text-slate-300 hover:border-white/25'
          }`}
        >
          <div className="text-xs font-extrabold">{isAr ? '🇩🇿 كل الجزائر' : '🇩🇿 All Algeria'}</div>
          <div className="text-[11px] font-mono text-emerald-400 mt-1">{wilayas.length} {isAr ? 'ولاية' : 'wilayas'}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">100% {isAr ? 'التراب الوطني' : 'Territory'}</div>
        </button>

        {geoZoneSummaries.map((gz) => (
          <button
            key={gz.id}
            type="button"
            onClick={() => setSelectedGeoZone(gz.id)}
            className={`p-3 rounded-xl border text-start transition cursor-pointer ${
              selectedGeoZone === gz.id
                ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-lg'
                : 'bg-[#0D172E] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            <div className="text-xs font-extrabold truncate">{isAr ? gz.labelAr : gz.label}</div>
            <div className="flex items-center justify-between text-[11px] font-mono mt-1">
              <span className="text-sky-400">{gz.count}W</span>
              <span className="text-slate-400">{gz.popPct}% {isAr ? 'سكان' : 'pop'}</span>
            </div>
            <div className="text-[10px] text-amber-300 font-mono mt-0.5">
              {isAr ? `مياه: ${gz.avgPolicyWater}` : `Water: ${gz.avgPolicyWater}`}
            </div>
          </button>
        ))}
      </div>

      {/* 6. 5-Sector Priority Rankings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Water Hotspots */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-sky-400 font-bold text-xs border-b border-white/10 pb-2">
            <Droplets className="w-4 h-4" />
            <span>{isAr ? `الأشد عجزاً مائياً (${targetYear})` : `Top Water Risk (${targetYear})`}</span>
          </div>
          <div className="space-y-1.5">
            {topThirstWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-sky-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-rose-400 font-bold shrink-0">{w.baseWater}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Agricultural Drought Risk */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs border-b border-white/10 pb-2">
            <Wheat className="w-4 h-4" />
            <span>{isAr ? 'الأكثر إجهاداً للجفاف' : 'Top Drought Exposure'}</span>
          </div>
          <div className="space-y-1.5">
            {topDroughtWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-amber-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-amber-400 font-bold shrink-0">{w.baseDrought}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Urban Growth Hotspots */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-purple-400 font-bold text-xs border-b border-white/10 pb-2">
            <Building2 className="w-4 h-4" />
            <span>{isAr ? 'الضغط العمراني والسكن' : 'Urban Pressure Poles'}</span>
          </div>
          <div className="space-y-1.5">
            {topGrowthWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-purple-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-purple-400 font-bold shrink-0">{w.pop}k</span>
              </div>
            ))}
          </div>
        </div>

        {/* Retail Supply Chain Gaps */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs border-b border-white/10 pb-2">
            <ShoppingCart className="w-4 h-4" />
            <span>{isAr ? 'أكبر فجوات التغطية التجارية' : 'Lowest Market Coverage'}</span>
          </div>
          <div className="space-y-1.5">
            {topRetailGapWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-rose-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-rose-300 font-bold shrink-0">{w.coverage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Industrial Poles */}
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs border-b border-white/10 pb-2">
            <Factory className="w-4 h-4" />
            <span>{isAr ? 'الأقطاب الصناعية الصاعدة' : 'Top Industrial Corridors'}</span>
          </div>
          <div className="space-y-1.5">
            {topIndustrialWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-emerald-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-emerald-400 font-bold shrink-0">{w.policyIndustry}/100</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Complete National Strategic Rebalancing Matrix (All 58 Wilayas) */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm text-white">
                {isAr ? `المصفوفة الوطنية الشاملة للاستشراف والتوازن (${matrixRows.length} ولاية — أفق ${targetYear})` : `National Territorial Rebalancing Matrix (${matrixRows.length} Wilayas — ${targetYear})`}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'قراءة مقارنة لكل ولاية بين الوضع المرجعي والأثر المحاكى بالسياسات مع زر انتقال مباشر إلى الخريطة'
                  : 'Baseline vs policy-adjusted forecast per wilaya with instant map navigation'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isAr ? 'ابحث باسم أو رقم الولاية...' : 'Search wilaya...'}
                className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg ps-8 pe-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={matrixSortBy}
              onChange={(e) => setMatrixSortBy(e.target.value as any)}
              className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
            >
              <option value="risk">{isAr ? 'الترتيب: أولوية التدخل' : 'Sort: Intervention Priority'}</option>
              <option value="water">{isAr ? 'الترتيب: الأشد عجزاً مائياً' : 'Sort: Water Deficit'}</option>
              <option value="agri">{isAr ? 'الترتيب: الملاءمة الفلاحية' : 'Sort: Agri Suitability'}</option>
              <option value="industry">{isAr ? 'الترتيب: الجاهزية الصناعية' : 'Sort: Industry Score'}</option>
              <option value="coverage">{isAr ? 'الترتيب: فجوة التموين' : 'Sort: Supply Gap'}</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-xs text-slate-300">
            <thead className="sticky top-0 bg-[#0D172E] border-b border-white/10 z-10">
              <tr className="text-left rtl:text-right text-slate-400 font-semibold">
                <th className="py-2.5 px-2.5">{isAr ? 'الولاية' : 'Wilaya'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'النطاق الجغرافي' : 'Geo-Zone'}</th>
                <th className="py-2.5 px-2.5">{isAr ? `مياه ${targetYear} (مرجعي ← سياسات)` : `Water ${targetYear}`}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'الجفاف' : 'Drought'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'الفلاحة' : 'Agri'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'التغطية' : 'Retail'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'الصناعة' : 'Industry'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'الأولوية' : 'Priority'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'الخريطة' : 'Map'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {matrixRows.map((w) => {
                const priBadge =
                  w.urgencyScore >= 65
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : w.urgencyScore >= 45
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';

                return (
                  <tr key={w.num} className="hover:bg-white/5 transition">
                    <td className="py-2 px-2.5 font-bold text-white whitespace-nowrap">
                      {w.num}. {isAr ? w.n : w.en}
                    </td>
                    <td className="py-2 px-2.5 text-[11px] text-slate-400 whitespace-nowrap">
                      {isAr ? w.geo.labelAr : w.geo.label}
                    </td>
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      <span className="text-rose-300">{w.baseWater}</span>
                      <span className="text-slate-500 mx-1">→</span>
                      <b className="text-emerald-400">{w.policyWater}</b>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-amber-300">
                      {w.baseDrought}% → <span className="text-emerald-400">{w.policyDrought}%</span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-sky-300" title={w.agriSuitLabel}>{w.agriScore}/100</td>
                    <td className="py-2 px-2.5 font-mono">
                      {w.coverage}% → <span className="text-emerald-400">{w.policyCoverage}%</span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-purple-300">{w.policyIndustry}/100</td>
                    <td className="py-2 px-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${priBadge}`}>
                        {w.urgencyScore}/100
                      </span>
                    </td>
                    <td className="py-2 px-2.5">
                      <button
                        type="button"
                        onClick={() => handleWilayaJump(w)}
                        className="flex items-center gap-1 text-[11px] bg-[#121F3D] hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 px-2 py-1 rounded-lg cursor-pointer transition"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>{isAr ? 'خريطة' : 'Map'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
