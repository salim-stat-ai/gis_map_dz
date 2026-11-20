/**
 * GIS Map – National Foresight 2030 Dashboard
 * Holistic cross-sector territorial diagnosis, policy lever simulator, geo-zone matrix & strategic rebalancing for Algeria
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { GeoZoneId, WilayaRecord } from '../types';
import { classifyWilayaGeoZone } from '../engines/earlyWarning';
import {
  predictWater,
  cropRisk,
  urbanGrowth,
  industryScore,
  suitabilityAgri,
  getHospitalsCount,
  getHealthCoverage,
  getHazardIndex,
  getTransportScore,
  hasRailAccess,
  getHotelsCount,
  getHeritageSitesCount,
  getTourismScore
} from '../engines/reporting';
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
  Target,
  HeartPulse,
  ShieldAlert,
  TrainFront,
  Palmtree
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
  const [matrixSortBy, setMatrixSortBy] = useState<
    'risk' | 'water' | 'agri' | 'industry' | 'coverage' | 'health' | 'hazards' | 'transport' | 'tourism'
  >('risk');

  // National 2030 Strategic Policy Levers (8 synchronized sector levers)
  const [desalinationBoostM3, setDesalinationBoostM3] = useState<number>(450); // M m3/yr
  const [precisionIrrigationPct, setPrecisionIrrigationPct] = useState<number>(65); // %
  const [newWholesaleHubs, setNewWholesaleHubs] = useState<number>(40); // hubs nationally
  const [interiorCorridorBoostPct, setInteriorCorridorBoostPct] = useState<number>(35); // %
  const [healthExpansionPct, setHealthExpansionPct] = useState<number>(15); // % hospital/clinic expansion
  const [hazardMitigationStrictness, setHazardMitigationStrictness] = useState<number>(35); // % RPA/ORSEC strictness
  const [railCorridorBoostPct, setRailCorridorBoostPct] = useState<number>(25); // % SNTF rail & road corridor boost
  const [tourismExpansionPct, setTourismExpansionPct] = useState<number>(30); // % ZET & heritage tourism expansion

  const resetLevers = () => {
    setDesalinationBoostM3(450);
    setPrecisionIrrigationPct(65);
    setNewWholesaleHubs(40);
    setInteriorCorridorBoostPct(35);
    setHealthExpansionPct(15);
    setHazardMitigationStrictness(35);
    setRailCorridorBoostPct(25);
    setTourismExpansionPct(30);
  };

  // Enrich all 58 wilayas with Geo-Zone & baseline vs policy-adjusted 2030 metrics across 9 sectors
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

      const hospitalsCnt = getHospitalsCount(w);
      const baseHealth = getHealthCoverage(w);
      const baseHazard = getHazardIndex(w);
      const baseTransport = getTransportScore(w);
      const railLinked = hasRailAccess(w);
      const hotelsCnt = getHotelsCount(w);
      const heritageCnt = getHeritageSitesCount(w);
      const baseTourism = getTourismScore(w);

      // Policy effect respects territorial realism
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
          ? Math.round(((interiorCorridorBoostPct + railCorridorBoostPct * 0.4) / 100) * 14 * progressFactor)
          : Math.round((interiorCorridorBoostPct / 100) * 5 * progressFactor);
      const policyIndustry = Math.min(100, baseInd + corridorBonus);

      const healthGain = healthExpansionPct * (baseHealth < 65 ? 0.52 : 0.28) * progressFactor;
      const policyHealth = Math.min(99, Math.round(baseHealth + healthGain));
      const policyHazard = Math.max(6, Math.round(baseHazard * (1 - (hazardMitigationStrictness / 100) * 0.34 * progressFactor)));
      const transportGain = (railCorridorBoostPct / 100) * (railLinked ? 14 : 22) * progressFactor;
      const policyTransport = Math.min(99, Math.round(baseTransport + transportGain));
      const tourismGain = (tourismExpansionPct / 100) * (baseTourism < 70 ? 22 : 12) * progressFactor + (railCorridorBoostPct / 100) * 4 * progressFactor;
      const policyTourism = Math.min(99, Math.round(baseTourism + tourismGain));

      // Composite 9-Sector Vulnerability / Action Priority (0–100, higher = more urgent intervention needed)
      const urgencyScore = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            (Math.abs(Math.min(0, baseWater)) / 4.2) * 0.22 +
              baseDrought * 0.15 +
              w.flood * 19 +
              (100 - w.coverage) * 0.13 +
              (100 - baseHealth) * 0.14 +
              baseHazard * 0.15 +
              (100 - baseTransport) * 0.10 +
              (100 - baseTourism) * 0.06
          )
        )
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
        hospitalsCnt,
        baseHealth,
        policyHealth,
        baseHazard,
        policyHazard,
        baseTransport,
        policyTransport,
        railLinked,
        hotelsCnt,
        heritageCnt,
        baseTourism,
        policyTourism,
        urgencyScore
      };
    });
  }, [
    wilayas,
    targetYear,
    horizon,
    desalinationBoostM3,
    precisionIrrigationPct,
    newWholesaleHubs,
    interiorCorridorBoostPct,
    healthExpansionPct,
    hazardMitigationStrictness,
    railCorridorBoostPct,
    tourismExpansionPct,
    isAr
  ]);

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

  const avgBaseHealth = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseHealth, 0) / Math.max(1, enrichedWilayas.length)
  );
  const avgPolicyHealth = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.policyHealth, 0) / Math.max(1, enrichedWilayas.length)
  );

  const avgBaseHazard = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseHazard, 0) / Math.max(1, enrichedWilayas.length)
  );
  const avgPolicyHazard = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.policyHazard, 0) / Math.max(1, enrichedWilayas.length)
  );

  const avgBaseTransport = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseTransport, 0) / Math.max(1, enrichedWilayas.length)
  );
  const avgPolicyTransport = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.policyTransport, 0) / Math.max(1, enrichedWilayas.length)
  );

  const avgBaseTourism = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.baseTourism, 0) / Math.max(1, enrichedWilayas.length)
  );
  const avgPolicyTourism = Math.round(
    enrichedWilayas.reduce((acc, w) => acc + w.policyTourism, 0) / Math.max(1, enrichedWilayas.length)
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
        avgIndustry: Math.round(group.reduce((s, w) => s + w.policyIndustry, 0) / count),
        avgHealth: Math.round(group.reduce((s, w) => s + w.policyHealth, 0) / count),
        avgHazard: Math.round(group.reduce((s, w) => s + w.policyHazard, 0) / count),
        avgTransport: Math.round(group.reduce((s, w) => s + w.policyTransport, 0) / count),
        avgTourism: Math.round(group.reduce((s, w) => s + w.policyTourism, 0) / count)
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
            label: isAr ? 'التغطية الصحية (%)' : 'Health Coverage (%)',
            data: geoZoneSummaries.map((g) => g.avgHealth),
            backgroundColor: '#EC4899',
            borderRadius: 5
          },
          {
            label: isAr ? 'الأخطار الطبيعية (/100)' : 'Natural Hazards (/100)',
            data: geoZoneSummaries.map((g) => g.avgHazard),
            backgroundColor: '#F43F5E',
            borderRadius: 5
          },
          {
            label: isAr ? 'النقل والسكك (/100)' : 'Transport & Rail (/100)',
            data: geoZoneSummaries.map((g) => g.avgTransport),
            backgroundColor: '#06B6D4',
            borderRadius: 5
          },
          {
            label: isAr ? 'الجاهزية الصناعية (/100)' : 'Industrial Readiness (/100)',
            data: geoZoneSummaries.map((g) => g.avgIndustry),
            backgroundColor: '#A78BFA',
            borderRadius: 5
          },
          {
            label: isAr ? 'السياحة والتراث (/100)' : 'Tourism & Heritage (/100)',
            data: geoZoneSummaries.map((g) => g.avgTourism),
            backgroundColor: '#FBBF24',
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

  // 9-Sector Priority Rankings
  const topThirstWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => a.baseWater - b.baseWater).slice(0, 5), [zoneFiltered]);
  const topDroughtWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.baseDrought - a.baseDrought).slice(0, 5), [zoneFiltered]);
  const topGrowthWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.pop * b.price - a.pop * a.price).slice(0, 5), [zoneFiltered]);
  const topRetailGapWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => a.coverage - b.coverage).slice(0, 5), [zoneFiltered]);
  const topIndustrialWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.policyIndustry - a.policyIndustry).slice(0, 5), [zoneFiltered]);
  const topHealthGapWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => a.baseHealth - b.baseHealth).slice(0, 5), [zoneFiltered]);
  const topHazardWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.baseHazard - a.baseHazard).slice(0, 5), [zoneFiltered]);
  const topTransportGapWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => a.baseTransport - b.baseTransport).slice(0, 5), [zoneFiltered]);
  const topTourismWilayas = useMemo(() => [...zoneFiltered].sort((a, b) => b.policyTourism - a.policyTourism).slice(0, 5), [zoneFiltered]);

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
      if (matrixSortBy === 'health') return a.baseHealth - b.baseHealth;
      if (matrixSortBy === 'hazards') return b.baseHazard - a.baseHazard;
      if (matrixSortBy === 'transport') return a.baseTransport - b.baseTransport;
      if (matrixSortBy === 'tourism') return b.policyTourism - a.policyTourism;
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
              {isAr ? 'الرؤية الوطنية المندمجة للقطاعات التسعة والتوازن الإقليمي' : 'Integrated 9-Sector Territorial Rebalancing to 2030'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              {isAr
                ? 'استشراف كمي شامل عبر 58 ولاية و5 نطاقات جغرافية، يدمج محاكي السياسات الوطنية لعام 2030 (بما فيها الصحة والأخطار الطبيعية والنقل والسياحة والتراث)، مصفوفة الترتيب القطاعي، وتحليل المسارات التراكمية.'
                : 'Quantitative national synthesis across 58 wilayas & 5 geo-zones featuring a 9-sector 2030 policy lever simulator (including Healthcare, Natural Hazards, Transport/Rail & Tourism/Heritage), priority rankings, and trajectory curves.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold text-center">
              <span>🇩🇿 Horizon {targetYear}</span>
            </div>
            <div className="bg-[#121F3D] text-slate-300 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-bold">
              {isAr ? `${wilayas.length} ولاية · 9 قطاعات` : `${wilayas.length} Wilayas · 9 Sectors`}
            </div>
          </div>
        </div>
      </div>

      {/* 2. 10-Card National KPI Grid (100% live computed baseline vs policy impact) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
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

        <div className="bg-[#0D172E] border border-pink-500/20 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-pink-400 font-semibold">
            <HeartPulse className="w-3.5 h-3.5" />
            <span>{isAr ? 'التغطية الصحية' : 'Healthcare Access'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-white">{avgBaseHealth}%</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyHealth}%</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? 'متوسط الاستشفاء والعيادات MSPRH' : 'Hospitals & clinical coverage'}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-red-500/20 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-red-400 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isAr ? 'الأخطار الطبيعية' : 'Natural Hazards'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-red-400">{avgBaseHazard}</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyHazard}</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? 'الزلازل والحرائق والسيول / 100' : 'Seismic/Wildfire/Flood /100'}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-cyan-500/20 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 font-semibold">
            <TrainFront className="w-3.5 h-3.5" />
            <span>{isAr ? 'النقل والسكك SNTF' : 'Transport & Rail'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-cyan-300">{avgBaseTransport}</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyTransport}</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? 'الربط السككي والطرق السريعة / 100' : 'Multimodal rail & highway /100'}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-amber-400/25 rounded-xl p-4 shadow-lg space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold">
            <Palmtree className="w-3.5 h-3.5" />
            <span>{isAr ? 'السياحة والتراث MTA' : 'Tourism & Heritage'}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <b className="text-xl font-mono text-amber-300">{avgBaseTourism}</b>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">→ {avgPolicyTourism}</span>
          </div>
          <span className="text-[10px] text-slate-400 block">
            {isAr ? 'الجاذبية الفندقية والتراثية / 100' : 'Hospitality & heritage index /100'}
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
                  ? 'عدّل الرافعات الثماني لقياس أثرها التراكمي على الأمن المائي والغذائي، الصحة العمومية، الوقاية من الكوارث، الربط بالسكك، والسياحة والتراث'
                  : 'Adjust 8 national investment levers to measure real-time impact across water, agronomy, health, hazards, rail, and tourism'}
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

          <div className="bg-[#101D38] border border-pink-500/20 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '🏥 توسيع الهياكل الصحية' : '🏥 Health Infra Expansion'}</span>
              <b className="font-mono text-pink-400">+{healthExpansionPct}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={healthExpansionPct}
              onChange={(e) => setHealthExpansionPct(Number(e.target.value))}
              className="w-full accent-pink-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'يرفع التغطية الاستشفائية للولايات دون 65%' : 'Prioritizes hospitals & clinics under 65%'}
            </span>
          </div>

          <div className="bg-[#101D38] border border-red-500/20 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '🛡️ صرامة الوقاية من الأخطار' : '🛡️ Hazard & RPA Mitigation'}</span>
              <b className="font-mono text-red-400">{hazardMitigationStrictness}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={hazardMitigationStrictness}
              onChange={(e) => setHazardMitigationStrictness(Number(e.target.value))}
              className="w-full accent-red-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'معايير البناء المضاد للزلازل ومصدات الحرائق' : 'Seismic RPA codes & wildfire buffers'}
            </span>
          </div>

          <div className="bg-[#101D38] border border-cyan-500/20 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '🚆 تمديد خطوط السكك SNTF والممرات' : '🚆 SNTF Rail & Corridor Boost'}</span>
              <b className="font-mono text-cyan-400">+{railCorridorBoostPct}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={railCorridorBoostPct}
              onChange={(e) => setRailCorridorBoostPct(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'فك العزلة السككية عن الهضاب والجنوب وتسريع الشحن' : 'Connects rail corridors & speeds multimodal logistics'}
            </span>
          </div>

          <div className="bg-[#101D38] border border-amber-400/25 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">{isAr ? '🏝️ مناطق التوسع السياحي ZET والتراث' : '🏝️ ZET Tourism & Heritage'}</span>
              <b className="font-mono text-amber-300">+{tourismExpansionPct}%</b>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={tourismExpansionPct}
              onChange={(e) => setTourismExpansionPct(Number(e.target.value))}
              className="w-full accent-amber-400 h-1.5 cursor-pointer"
            />
            <span className="block text-[10px] text-slate-400">
              {isAr ? 'رفع الطاقة الفندقية وتثمين المواقع التراثية والصحراوية' : 'Boosts hospitality beds, ZET resorts & eco-heritage trails'}
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

      {/* 6. 9-Sector Priority Rankings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

        {/* Lowest Health Coverage */}
        <div className="bg-[#0D172E] border border-pink-500/20 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-pink-400 font-bold text-xs border-b border-white/10 pb-2">
            <HeartPulse className="w-4 h-4" />
            <span>{isAr ? 'الأولوية الاستعجالية للصحة والمستشفيات' : 'Lowest Healthcare Access'}</span>
          </div>
          <div className="space-y-1.5">
            {topHealthGapWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-pink-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-pink-300 font-bold shrink-0">{w.baseHealth}% · {w.hospitalsCnt}🏥</span>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Natural Hazards */}
        <div className="bg-[#0D172E] border border-red-500/20 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold text-xs border-b border-white/10 pb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>{isAr ? 'أعلى تعرض للأخطار الطبيعية (CRAAG/DGPC)' : 'Highest Multi-Hazard Risk'}</span>
          </div>
          <div className="space-y-1.5">
            {topHazardWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-red-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-red-400 font-bold shrink-0">{w.baseHazard}/100</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lowest Transport & Rail Connectivity */}
        <div className="bg-[#0D172E] border border-cyan-500/20 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs border-b border-white/10 pb-2">
            <TrainFront className="w-4 h-4" />
            <span>{isAr ? 'فجوات النقل والربط السككي SNTF' : 'Lowest Transport & Rail Score'}</span>
          </div>
          <div className="space-y-1.5">
            {topTransportGapWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-cyan-500/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-cyan-300 font-bold shrink-0">
                  {w.baseTransport}/100 {w.railLinked ? '🚆' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Tourism & Heritage Poles */}
        <div className="bg-[#0D172E] border border-amber-400/25 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-xs border-b border-white/10 pb-2">
            <Palmtree className="w-4 h-4" />
            <span>{isAr ? 'الأقطاب السياحية والتراثية الرائدة MTA' : 'Top Tourism & Heritage Poles'}</span>
          </div>
          <div className="space-y-1.5">
            {topTourismWilayas.map((w, idx) => (
              <div
                key={w.num}
                onClick={() => handleWilayaJump(w)}
                className="flex items-center justify-between p-2 bg-[#121F3D] rounded-lg border border-white/5 hover:border-amber-400/40 transition cursor-pointer text-xs"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <b className="text-white truncate">{w.num}. {isAr ? w.n : w.en}</b>
                </div>
                <span className="font-mono text-amber-300 font-bold shrink-0">
                  {w.policyTourism}/100 · {w.heritageCnt}🏛️
                </span>
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
              <option value="health">{isAr ? 'الترتيب: التغطية الصحية' : 'Sort: Health Access'}</option>
              <option value="hazards">{isAr ? 'الترتيب: الأخطار الطبيعية' : 'Sort: Natural Hazards'}</option>
              <option value="transport">{isAr ? 'الترتيب: النقل والسكك' : 'Sort: Transport & Rail'}</option>
              <option value="tourism">{isAr ? 'الترتيب: السياحة والتراث' : 'Sort: Tourism & Heritage'}</option>
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
                <th className="py-2.5 px-2.5">{isAr ? 'الصحة' : 'Health'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'الأخطار' : 'Hazards'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'النقل' : 'Transport'}</th>
                <th className="py-2.5 px-2.5">{isAr ? 'السياحة' : 'Tourism'}</th>
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
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      <span className="text-pink-300">{w.baseHealth}%</span> → <span className="text-emerald-400">{w.policyHealth}%</span>
                    </td>
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      <span className="text-red-300">{w.baseHazard}</span> → <span className="text-emerald-400">{w.policyHazard}</span>
                    </td>
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      <span className="text-cyan-300">{w.baseTransport}</span> → <span className="text-emerald-400">{w.policyTransport}</span> {w.railLinked ? '🚆' : ''}
                    </td>
                    <td className="py-2 px-2.5 font-mono whitespace-nowrap">
                      <span className="text-amber-300">{w.baseTourism}</span> → <span className="text-emerald-400">{w.policyTourism}</span>
                    </td>
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
