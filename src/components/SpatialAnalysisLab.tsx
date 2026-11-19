/**
 * GIS Map – Spatial Analysis Lab
 * Moran's I, LISA Scatterplot, Getis-Ord Gi*, Real OLS/SAR Spatial Regression,
 * KDE Surface, Empirical Semivariogram, Kriging/IDW LOOCV, Proximity Catchments,
 * Regional Inequality Drilldown & AHP Multi-Criteria Decision Engine
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { WilayaRecord } from '../types';
import {
  computeMoransI,
  computeMoranScatterplot,
  computeGetisOrdGi,
  evaluateAhpSuitability,
  computeKernelDensity,
  computeSpatialRegression,
  computeEmpiricalSemivariogram,
  computeSpatialInterpolation,
  computeRegionalSummaries,
  computeProximityAnalysis
} from '../engines/gis';
import {
  Activity,
  Flame,
  Sliders,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Compass,
  Waves,
  Grid,
  Navigation,
  Search,
  Layers
} from 'lucide-react';

ChartJS.register(...registerables);

interface SpatialAnalysisLabProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  onViewOnMap?: (w: WilayaRecord) => void;
  lang: 'ar' | 'en';
}

type SpatialMetricKey = 'waterDef' | 'rain' | 'price' | 'flood' | 'industry' | 'soil' | 'coverage' | 'pop';
type SubTabKey = 'autocorrelation' | 'regression' | 'kde_kriging' | 'proximity' | 'regional_drilldown' | 'ahp';

export const SpatialAnalysisLab: React.FC<SpatialAnalysisLabProps> = ({
  wilayas,
  selectedWilaya,
  onSelectWilaya,
  onViewOnMap,
  lang
}) => {
  const isAr = lang === 'ar';

  const [activeSpatialMetric, setActiveSpatialMetric] = useState<SpatialMetricKey>('waterDef');
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('autocorrelation');

  // Tunable spatial parameters
  const [hotspotRadiusKm, setHotspotRadiusKm] = useState<number>(400);
  const [hotspotFilter, setHotspotFilter] = useState<'all' | 'hot' | 'cold'>('all');
  const [hotspotSearch, setHotspotSearch] = useState<string>('');

  const [regDepVar, setRegDepVar] = useState<'waterDef' | 'price' | 'industry' | 'coverage'>('waterDef');

  const [kdeBandwidthKm, setKdeBandwidthKm] = useState<number>(140);
  const [interpMethod, setInterpMethod] = useState<'Kriging' | 'IDW'>('Kriging');
  const [krigingRangeKm, setKrigingRangeKm] = useState<number>(350);
  const [idwPower, setIdwPower] = useState<number>(2);

  const [proximityRadiusKm, setProximityRadiusKm] = useState<number>(280);
  const [gravityBeta, setGravityBeta] = useState<number>(1.5);

  const [selectedRegionId, setSelectedRegionId] = useState<string>('all');

  const [ahpWeights, setAhpWeights] = useState({
    water: 30,
    roads: 20,
    energy: 15,
    labor: 10,
    soil: 10,
    coverage: 5,
    price: 10
  });

  // Chart refs
  const lisaChartRef = useRef<HTMLCanvasElement>(null);
  const lisaChartInst = useRef<ChartJS | null>(null);

  const regChartRef = useRef<HTMLCanvasElement>(null);
  const regChartInst = useRef<ChartJS | null>(null);

  const variogramChartRef = useRef<HTMLCanvasElement>(null);
  const variogramChartInst = useRef<ChartJS | null>(null);

  const proximityChartRef = useRef<HTMLCanvasElement>(null);
  const proximityChartInst = useRef<ChartJS | null>(null);

  const regionChartRef = useRef<HTMLCanvasElement>(null);
  const regionChartInst = useRef<ChartJS | null>(null);

  const ahpChartRef = useRef<HTMLCanvasElement>(null);
  const ahpChartInst = useRef<ChartJS | null>(null);

  // Metric metadata + extractor
  const extractFn = useMemo(() => {
    return (w: WilayaRecord) => {
      if (activeSpatialMetric === 'rain') return w.rain;
      if (activeSpatialMetric === 'price') return w.price;
      if (activeSpatialMetric === 'flood') return w.flood;
      if (activeSpatialMetric === 'industry') return w.industry;
      if (activeSpatialMetric === 'soil') return w.soil;
      if (activeSpatialMetric === 'coverage') return w.coverage;
      if (activeSpatialMetric === 'pop') return w.pop;
      return w.waterDef;
    };
  }, [activeSpatialMetric]);

  const metricLabel = useMemo(() => {
    const labels: Record<SpatialMetricKey, { en: string; ar: string }> = {
      waterDef: { en: 'Water Deficit Index', ar: 'مؤشر العجز المائي' },
      rain: { en: 'Annual Rainfall (mm)', ar: 'التساقطات المطرية (ملم)' },
      price: { en: 'Land Price (DZD/m²)', ar: 'أسعار العقار (دج/م²)' },
      flood: { en: 'Flood Exposure (0–1)', ar: 'مخاطر الفيضانات (0–1)' },
      industry: { en: 'Industry Score (/100)', ar: 'الجاذبية الصناعية (/100)' },
      soil: { en: 'Soil Quality (/100)', ar: 'خصوبة التربة (/100)' },
      coverage: { en: 'Market Coverage (%)', ar: 'التغطية التجارية (%)' },
      pop: { en: 'Population (k)', ar: 'السكان (بالآلاف)' }
    };
    return isAr ? labels[activeSpatialMetric].ar : labels[activeSpatialMetric].en;
  }, [activeSpatialMetric, isAr]);

  // Core Spatial Engine Computations
  const moranResult = useMemo(() => computeMoransI(wilayas, extractFn), [wilayas, extractFn]);
  const lisaScatter = useMemo(() => computeMoranScatterplot(wilayas, extractFn, hotspotRadiusKm + 150), [wilayas, extractFn, hotspotRadiusKm]);
  const hotspots = useMemo(() => computeGetisOrdGi(wilayas, extractFn, hotspotRadiusKm), [wilayas, extractFn, hotspotRadiusKm]);
  const spatialReg = useMemo(() => computeSpatialRegression(wilayas, regDepVar), [wilayas, regDepVar]);
  const kdeResult = useMemo(() => computeKernelDensity(wilayas, extractFn, kdeBandwidthKm, 11), [wilayas, extractFn, kdeBandwidthKm]);
  const variogram = useMemo(() => computeEmpiricalSemivariogram(wilayas, extractFn, 900, 9, krigingRangeKm), [wilayas, extractFn, krigingRangeKm]);
  const interpResult = useMemo(
    () => computeSpatialInterpolation(wilayas, extractFn, interpMethod, { power: idwPower, rangeKm: krigingRangeKm }),
    [wilayas, extractFn, interpMethod, idwPower, krigingRangeKm]
  );
  const proximity = useMemo(
    () => computeProximityAnalysis(selectedWilaya, wilayas, proximityRadiusKm, gravityBeta, extractFn),
    [selectedWilaya, wilayas, proximityRadiusKm, gravityBeta, extractFn]
  );
  const regionalSummaries = useMemo(() => computeRegionalSummaries(wilayas), [wilayas]);

  const ahpCriteria = useMemo(
    () => [
      { id: 'water', name: 'Water Resources', nameAr: 'الموارد المائية', weight: ahpWeights.water },
      { id: 'roads', name: 'Roads & Logistics', nameAr: 'الطرق والربط', weight: ahpWeights.roads },
      { id: 'energy', name: 'Power Grid', nameAr: 'شبكة الطاقة', weight: ahpWeights.energy },
      { id: 'labor', name: 'Active Workforce', nameAr: 'اليد العاملة', weight: ahpWeights.labor },
      { id: 'soil', name: 'Soil Fertility', nameAr: 'خصوبة التربة', weight: ahpWeights.soil },
      { id: 'coverage', name: 'Market Coverage', nameAr: 'التغطية التجارية', weight: ahpWeights.coverage },
      { id: 'price', name: 'Land Price Affordability', nameAr: 'تنافسية العقار', weight: ahpWeights.price }
    ],
    [ahpWeights]
  );
  const ahpResult = useMemo(() => evaluateAhpSuitability(wilayas, ahpCriteria), [wilayas, ahpCriteria]);

  const handleMetricSelect = (m: SpatialMetricKey) => {
    setActiveSpatialMetric(m);
    if (m === 'waterDef' || m === 'price' || m === 'industry' || m === 'coverage') {
      setRegDepVar(m);
    }
  };

  const applyAhpPreset = (preset: 'balanced' | 'industry' | 'agri' | 'commerce') => {
    if (preset === 'industry') setAhpWeights({ water: 15, roads: 25, energy: 25, labor: 15, soil: 5, coverage: 5, price: 10 });
    else if (preset === 'agri') setAhpWeights({ water: 35, roads: 10, energy: 10, labor: 10, soil: 25, coverage: 5, price: 5 });
    else if (preset === 'commerce') setAhpWeights({ water: 10, roads: 30, energy: 10, labor: 15, soil: 5, coverage: 20, price: 10 });
    else setAhpWeights({ water: 30, roads: 20, energy: 15, labor: 10, soil: 10, coverage: 5, price: 10 });
  };

  // Filtered hotspots list
  const filteredHotspots = useMemo(() => {
    const q = hotspotSearch.trim().toLowerCase();
    return hotspots.filter(h => {
      const matchFilter =
        hotspotFilter === 'all'
          ? true
          : hotspotFilter === 'hot'
          ? h.classification.includes('Hotspot')
          : h.classification.includes('Coldspot');
      const matchQuery = !q || h.wilayaNameAr.includes(hotspotSearch.trim()) || h.wilayaName.toLowerCase().includes(q) || String(h.wilayaNum) === q;
      return matchFilter && matchQuery;
    });
  }, [hotspots, hotspotFilter, hotspotSearch]);

  const jumpToMap = (w: WilayaRecord) => {
    onSelectWilaya(w);
    if (onViewOnMap) onViewOnMap(w);
  };

  // ==========================================
  // Dynamic Real-World Interpretations
  // ==========================================
  const selectedLisaPt = useMemo(
    () => lisaScatter.points.find(p => p.wilayaNum === selectedWilaya.num) || lisaScatter.points[0],
    [lisaScatter, selectedWilaya.num]
  );

  const selectedHotspot = useMemo(
    () => hotspots.find(h => h.wilayaNum === selectedWilaya.num) || hotspots[0],
    [hotspots, selectedWilaya.num]
  );

  const lisaRealWorld = useMemo(() => {
    const clusterShare = Math.round(((lisaScatter.counts.HH + lisaScatter.counts.LL) / Math.max(1, wilayas.length)) * 100);
    const wName = isAr ? selectedWilaya.n : selectedWilaya.en;
    const pt = selectedLisaPt;
    const isDeficitMetric = activeSpatialMetric === 'waterDef';

    const quadMeaningAr: Record<'HH' | 'LL' | 'HL' | 'LH', string> = isDeficitMetric
      ? {
          HH: 'رصيد مائي أفضل من المتوسط وسط جوار مائي مستقر (تكتل إيجابي)',
          LL: 'عجز مائي حاد محاط بولايات مجاورة تعاني هي أيضاً من عجز مائي شديد (بؤرة إجهاد إقليمي)',
          HL: 'توازن مائي أفضل من جوارها الذي يعاني عجزاً مائياً حاداً (ولاية إسناد محتملة)',
          LH: 'عجز مائي أعمق من المتوسط وسط محيط مجاور وضعه المائي أفضل (جيب ضغط محلي)'
        }
      : {
          HH: 'قيمة مرتفعة جداً محاطة بولايات مرتفعة أيضاً (حزام تركّز قوي ممتد إقليمياً)',
          LL: 'قيمة منخفضة محاطة بجوار منخفض مماثل (حزام تراجع أو هدوء جغرافي مشترك)',
          HL: 'جزيرة مرتفعة (قطب منفرد) وسط إقليم قيمه منخفضة — تجذب النشاط من محيطها',
          LH: 'جيب منخفض معزول وسط حزام إقليمي مرتفع القيمة — يمثل فجوة استدراك محلية'
        };

    const quadMeaningEn: Record<'HH' | 'LL' | 'HL' | 'LH', string> = isDeficitMetric
      ? {
          HH: 'Healthier water balance surrounded by stable neighboring basins',
          LL: 'Severe water deficit clustered inside a water-stressed regional belt',
          HL: 'Better water balance than surrounding deficit-stressed neighbors (potential relief anchor)',
          LH: 'Deeper local deficit surrounded by healthier neighboring basins (localized bottleneck)'
        }
      : {
          HH: 'High indicator value clustered inside a high-value regional belt',
          LL: 'Low indicator value surrounded by similarly low neighbors',
          HL: 'High-value island / pole isolated inside a low-value region',
          LH: 'Low-value pocket surrounded by a high-performing belt (catch-up opportunity)'
        };

    return {
      clusterShare,
      wName,
      pt,
      quadDesc: isAr ? quadMeaningAr[pt.quadrant] : quadMeaningEn[pt.quadrant],
      axisNote: isAr
        ? 'المحور الأفقي (Z_i) يقيس موقع الولاية مقارنة بالمتوسط الوطني (0 = المتوسط)، والمحور العمودي (W·Z_i) يقيس متوسط جيرانها الجغرافيين. كلما ارتفعت النقاط على القطر من أسفل اليسار إلى أعلى اليمين، زادت قوة التكتل الجغرافي المتشابه.'
        : 'The X-axis (Z_i) compares each wilaya against the national mean (0), while the Y-axis (W·Z_i) measures its geographic neighbors. Alignment along the bottom-left to top-right diagonal confirms strong regional spillover.'
    };
  }, [lisaScatter, wilayas.length, isAr, selectedWilaya, selectedLisaPt, activeSpatialMetric]);

  const regressionRealWorld = useMemo(() => {
    const posOutlier = spatialReg.residuals.find(r => r.residual > 0);
    const negOutlier = spatialReg.residuals.find(r => r.residual < 0);
    return { posOutlier, negOutlier };
  }, [spatialReg]);

  const regionalRealWorld = useMemo(() => {
    const list = Object.values(regionalSummaries);
    const maxCvReg = [...list].sort((a, b) => b.deficitCvPct - a.deficitCvPct)[0];
    const maxIndReg = [...list].sort((a, b) => b.avgIndustry - a.avgIndustry)[0];
    const worstWaterReg = [...list].sort((a, b) => a.avgDeficit - b.avgDeficit)[0];
    return { maxCvReg, maxIndReg, worstWaterReg };
  }, [regionalSummaries]);

  const ahpRealWorld = useMemo(() => {
    const winner = ahpResult.rankedWilayas[0];
    const contribs = winner ? ahpResult.contributionsByWilaya[winner.wilaya] || {} : {};
    const topCritEntry = Object.entries(contribs).sort((a, b) => b[1] - a[1])[0];
    const topCritObj = ahpCriteria.find(c => c.id === topCritEntry?.[0]);
    return {
      winner,
      topCritName: topCritObj ? (isAr ? topCritObj.nameAr : topCritObj.name) : '',
      topCritPts: topCritEntry?.[1] ?? 0
    };
  }, [ahpResult, ahpCriteria, isAr]);

  // ==========================================
  // Chart 1: LISA Moran Scatterplot (Tab 1)
  // ==========================================
  useEffect(() => {
    if (activeSubTab !== 'autocorrelation' || !lisaChartRef.current) return;
    if (lisaChartInst.current) lisaChartInst.current.destroy();

    const makeDataset = (quad: 'HH' | 'LL' | 'HL' | 'LH', label: string, color: string) => ({
      label,
      data: lisaScatter.points
        .filter(p => p.quadrant === quad)
        .map(p => ({ x: p.z, y: p.wz, wilayaNum: p.wilayaNum, label: isAr ? p.wilayaNameAr : p.wilayaName, raw: p.rawValue })),
      backgroundColor: color,
      borderColor: '#070D1B',
      borderWidth: 1,
      pointRadius: (ctx: any) => (ctx.raw?.wilayaNum === selectedWilaya.num ? 8 : 4.5),
      pointHoverRadius: 7
    });

    lisaChartInst.current = new ChartJS(lisaChartRef.current, {
      type: 'scatter',
      data: {
        datasets: [
          makeDataset('HH', isAr ? 'مرتفع-مرتفع (HH)' : 'High-High (HH)', '#F43F5E'),
          makeDataset('LL', isAr ? 'منخفض-منخفض (LL)' : 'Low-Low (LL)', '#38BDF8'),
          makeDataset('HL', isAr ? 'شاذ مرتفع (HL)' : 'High-Low Outlier (HL)', '#F59E0B'),
          makeDataset('LH', isAr ? 'شاذ منخفض (LH)' : 'Low-High Outlier (LH)', '#A78BFA')
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_evt, elements) => {
          if (elements.length > 0) {
            const el = elements[0];
            const ds = lisaChartInst.current?.data.datasets[el.datasetIndex];
            const pt: any = ds?.data[el.index];
            if (pt?.wilayaNum) {
              const target = wilayas.find(w => w.num === pt.wilayaNum);
              if (target) onSelectWilaya(target);
            }
          }
        },
        plugins: {
          legend: { labels: { color: '#CBD5E1', font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const r = ctx.raw;
                return `${r.label} (#${r.wilayaNum}): Val=${r.raw} | Z=${r.x}, WZ=${r.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: isAr ? 'القيمة المعيارية Z_i' : 'Standardized Z_i', color: '#94A3B8', font: { size: 10 } },
            ticks: { color: '#94A3B8', font: { size: 10 } },
            grid: { color: (c) => (c.tick?.value === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.06)') }
          },
          y: {
            title: { display: true, text: isAr ? 'الفجوة المكانية للجوار W·Z_i' : 'Spatial Lag W·Z_i', color: '#94A3B8', font: { size: 10 } },
            ticks: { color: '#94A3B8', font: { size: 10 } },
            grid: { color: (c) => (c.tick?.value === 0 ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.06)') }
          }
        }
      }
    });

    return () => {
      if (lisaChartInst.current) lisaChartInst.current.destroy();
    };
  }, [activeSubTab, lisaScatter, selectedWilaya.num, wilayas, onSelectWilaya, isAr]);

  // ==========================================
  // Chart 2: Regression Predicted vs Observed (Tab 2)
  // ==========================================
  useEffect(() => {
    if (activeSubTab !== 'regression' || !regChartRef.current) return;
    if (regChartInst.current) regChartInst.current.destroy();

    const vals = spatialReg.residuals.flatMap(r => [r.observed, r.predicted]);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);

    regChartInst.current = new ChartJS(regChartRef.current, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: isAr ? 'الولايات (المتوقع مقابل الفعلي)' : 'Wilayas (Predicted vs Observed)',
            data: spatialReg.residuals.map(r => ({
              x: r.predicted,
              y: r.observed,
              name: isAr ? r.wilayaNameAr : r.wilayaName,
              res: r.residual,
              num: r.wilayaNum
            })),
            backgroundColor: spatialReg.residuals.map(r => (Math.abs(r.residual) > (maxV - minV) * 0.18 ? '#F59E0B' : '#A78BFA')),
            pointRadius: 4.5
          },
          {
            label: isAr ? 'خط التطابق المثالي (Y = Ŷ)' : '45° Perfect Fit Line',
            type: 'line' as any,
            data: [
              { x: minV, y: minV },
              { x: maxV, y: maxV }
            ],
            borderColor: '#10B981',
            borderDash: [5, 4],
            borderWidth: 1.5,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#CBD5E1', font: { size: 10 } } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const r = ctx.raw;
                if (!r.name) return '';
                return `${r.name}: Obs=${r.y} | Pred=${r.x} | Res=${r.res}`;
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: isAr ? 'القيمة المقدرة بالنموذج (Ŷ)' : 'Model Predicted (Ŷ)', color: '#94A3B8', font: { size: 10 } },
            ticks: { color: '#94A3B8', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          y: {
            title: { display: true, text: isAr ? 'القيمة الفعلية المرصودة (Y)' : 'Observed (Y)', color: '#94A3B8', font: { size: 10 } },
            ticks: { color: '#94A3B8', font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.06)' }
          }
        }
      }
    });

    return () => {
      if (regChartInst.current) regChartInst.current.destroy();
    };
  }, [activeSubTab, spatialReg, isAr]);

  // ==========================================
  // Chart 3: Empirical vs Theoretical Semivariogram (Tab 3)
  // ==========================================
  useEffect(() => {
    if (activeSubTab !== 'kde_kriging' || !variogramChartRef.current) return;
    if (variogramChartInst.current) variogramChartInst.current.destroy();

    variogramChartInst.current = new ChartJS(variogramChartRef.current, {
      type: 'line',
      data: {
        labels: variogram.bins.map(b => `${b.lagKm} km`),
        datasets: [
          {
            label: isAr ? 'شبه التباين التجريبي المرصود γ(h)' : 'Empirical Semivariance γ(h)',
            data: variogram.bins.map(b => b.empiricalGamma),
            borderColor: '#38BDF8',
            backgroundColor: '#38BDF8',
            borderWidth: 2,
            pointRadius: 4,
            tension: 0.25
          },
          {
            label: isAr ? 'النموذج الكروي النظري (Spherical Fit)' : 'Spherical Model Fit',
            data: variogram.bins.map(b => b.theoreticalGamma),
            borderColor: '#10B981',
            borderDash: [4, 4],
            borderWidth: 2,
            pointRadius: 2,
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#CBD5E1', font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });

    return () => {
      if (variogramChartInst.current) variogramChartInst.current.destroy();
    };
  }, [activeSubTab, variogram, isAr]);

  // ==========================================
  // Chart 4: Proximity Huff Distance Decay (Tab 4)
  // ==========================================
  useEffect(() => {
    if (activeSubTab !== 'proximity' || !proximityChartRef.current) return;
    if (proximityChartInst.current) proximityChartInst.current.destroy();

    const sample = proximity.allSortedByDistance.slice(0, 14);

    proximityChartInst.current = new ChartJS(proximityChartRef.current, {
      type: 'bar',
      data: {
        labels: sample.map(s => `${isAr ? s.wilaya.n : s.wilaya.en} (${s.distanceKm}km)`),
        datasets: [
          {
            label: isAr ? 'حصة الجذب الجغرافي وفق هاف (%)' : 'Huff Attraction Share (%)',
            data: sample.map(s => s.huffSharePct),
            backgroundColor: sample.map(s => (s.distanceKm <= proximityRadiusKm ? '#10B981' : '#334155')),
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#CBD5E1', font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#CBD5E1', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });

    return () => {
      if (proximityChartInst.current) proximityChartInst.current.destroy();
    };
  }, [activeSubTab, proximity, proximityRadiusKm, isAr]);

  // ==========================================
  // Chart 5: Regional Inequality & Profile Comparison (Tab 5)
  // ==========================================
  useEffect(() => {
    if (activeSubTab !== 'regional_drilldown' || !regionChartRef.current) return;
    if (regionChartInst.current) regionChartInst.current.destroy();

    const entries = Object.values(regionalSummaries);

    regionChartInst.current = new ChartJS(regionChartRef.current, {
      type: 'bar',
      data: {
        labels: entries.map(e => (isAr ? e.regionNameAr : e.regionName)),
        datasets: [
          {
            label: isAr ? 'التغطية التجارية (%)' : 'Retail Coverage (%)',
            data: entries.map(e => e.avgCoverage),
            backgroundColor: '#10B981',
            borderRadius: 4
          },
          {
            label: isAr ? 'الجاهزية الصناعية (/100)' : 'Industry Score (/100)',
            data: entries.map(e => e.avgIndustry),
            backgroundColor: '#A78BFA',
            borderRadius: 4
          },
          {
            label: isAr ? 'تباين العجز الداخلي (CV%)' : 'Intra-Region Water CV%',
            data: entries.map(e => e.deficitCvPct),
            backgroundColor: '#F59E0B',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#CBD5E1', font: { size: 10 } } } },
        scales: {
          x: { ticks: { color: '#CBD5E1', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });

    return () => {
      if (regionChartInst.current) regionChartInst.current.destroy();
    };
  }, [activeSubTab, regionalSummaries, isAr]);

  // ==========================================
  // Chart 6: AHP Stacked Contribution Top 10 (Tab 6)
  // ==========================================
  useEffect(() => {
    if (activeSubTab !== 'ahp' || !ahpChartRef.current) return;
    if (ahpChartInst.current) ahpChartInst.current.destroy();

    const top10 = ahpResult.rankedWilayas.slice(0, 10);
    const critColors: Record<string, string> = {
      water: '#38BDF8',
      roads: '#10B981',
      energy: '#F59E0B',
      labor: '#A78BFA',
      soil: '#84CC16',
      coverage: '#06B6D4',
      price: '#F43F5E'
    };

    ahpChartInst.current = new ChartJS(ahpChartRef.current, {
      type: 'bar',
      data: {
        labels: top10.map(t => (isAr ? t.wilayaAr : t.wilaya)),
        datasets: ahpCriteria.map(crit => ({
          label: isAr ? crit.nameAr : crit.name,
          data: top10.map(t => ahpResult.contributionsByWilaya[t.wilaya]?.[crit.id] ?? 0),
          backgroundColor: critColors[crit.id] || '#64748B'
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#CBD5E1', font: { size: 10 } } } },
        scales: {
          x: { stacked: true, ticks: { color: '#CBD5E1', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { stacked: true, max: 100, ticks: { color: '#94A3B8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });

    return () => {
      if (ahpChartInst.current) ahpChartInst.current.destroy();
    };
  }, [activeSubTab, ahpResult, ahpCriteria, isAr]);

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
              {isAr
                ? 'الارتباط الذاتي، مخطط LISA، الانحدار المكاني، Kriging ونطاقات الجاذبية'
                : "Moran's I, LISA Scatterplot, Spatial SAR, Kriging & Catchment Lab"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-3xl">
              {isAr
                ? 'مختبر جيو-إحصائي حي على بيانات الولايات الـ 58: يدمج معامل موران وتكتلات LISA، بؤر Getis-Ord Gi*، الانحدار المكاني (OLS/SAR) مع تحليل البواقي، تقدير كثافة النواة (KDE)، شبه التباين الكروي مع Kriging/IDW، وتحليل القرب الجغرافي (هاف) وقرار AHP.'
                : 'Live geostatistical laboratory over all 58 wilayas featuring Moran’s I & LISA quadrants, Getis-Ord Gi* hotspots, OLS/SAR econometric residuals, interactive KDE & LOOCV Kriging/IDW semivariograms, Huff catchments, and AHP allocation.'}
            </p>
          </div>

          {/* Expanded 8-Metric Selector */}
          <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-400">{isAr ? 'المتغير المكاني النشط:' : 'Active Spatial Metric:'}</span>
            <select
              value={activeSpatialMetric}
              onChange={(e) => handleMetricSelect(e.target.value as SpatialMetricKey)}
              className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
            >
              <option value="waterDef">{isAr ? '💧 العجز المائي (Water Deficit)' : '💧 Water Deficit Index'}</option>
              <option value="rain">{isAr ? '🌧️ التساقطات المطرية (Rainfall)' : '🌧️ Annual Rainfall (mm)'}</option>
              <option value="price">{isAr ? '🏠 أسعار العقار (DZD/m²)' : '🏠 Real Estate Price'}</option>
              <option value="flood">{isAr ? '🌊 مخاطر الفيضانات (Flood Risk)' : '🌊 Flood Exposure'}</option>
              <option value="industry">{isAr ? '🏭 الجاذبية الصناعية (Industry)' : '🏭 Industrial Activity'}</option>
              <option value="soil">{isAr ? '🌱 خصوبة التربة (Soil Index)' : '🌱 Soil Fertility'}</option>
              <option value="coverage">{isAr ? '🛒 التغطية التجارية (Coverage %)' : '🛒 Retail Coverage %'}</option>
              <option value="pop">{isAr ? '👥 الكتلة السكانية (Population)' : '👥 Population (k)'}</option>
            </select>
          </div>
        </div>

        {/* 6 Sub-Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mt-5 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={() => setActiveSubTab('autocorrelation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'autocorrelation' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "📍 موران، LISA وبؤر Gi*" : "Moran's I, LISA & Gi*"}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('regression')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'regression' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "📐 الانحدار المكاني (SAR)" : "Spatial Econometrics (SAR)"}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('kde_kriging')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'kde_kriging' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "🌐 كثافة النواة (KDE) و Kriging" : "KDE Surface & Kriging"}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('proximity')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'proximity' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "🧭 القرب الجغرافي ونطاقات هاف" : "Proximity & Huff Catchments"}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('regional_drilldown')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'regional_drilldown' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "🗺️ التدرج والتفاوت الإقليمي (5 أقاليم)" : "Regional Inequality (5 Regions)"}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ahp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition whitespace-nowrap shrink-0 ${
              activeSubTab === 'ahp' ? 'bg-purple-600 text-white shadow' : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52]'
            }`}
          >
            {isAr ? "⚖️ قرار الاستثمار المكاني (AHP)" : "AHP Site Suitability"}
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VIEW 1: Autocorrelation, LISA Scatterplot & Getis-Ord Gi*    */}
      {/* ============================================================ */}
      {activeSubTab === 'autocorrelation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Moran's I + Controls */}
            <div className="lg:col-span-5 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-white/10 pb-3 flex items-center justify-between gap-2">
                <h2 className="font-bold text-sm text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span>{isAr ? `مؤشر موران (${metricLabel})` : `Global Moran's I — ${metricLabel}`}</span>
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                  <span className="block text-[11px] text-slate-400">{isAr ? 'قيمة موران (I)' : 'Moran I'}</span>
                  <b className="text-xl text-purple-400 font-mono tabular-nums">{moranResult.observedI}</b>
                </div>

                <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                  <span className="block text-[11px] text-slate-400">{isAr ? 'الدرجة المعيارية (Z-Score)' : 'Z-Score'}</span>
                  <b className="text-xl text-sky-400 font-mono tabular-nums">{moranResult.zScore}</b>
                </div>

                <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                  <span className="block text-[11px] text-slate-400">{isAr ? 'القيمة الاحتمالية (P-Value)' : 'P-Value'}</span>
                  <b className="text-xl text-emerald-400 font-mono tabular-nums">{moranResult.pValue}</b>
                </div>

                <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                  <span className="block text-[11px] text-slate-400">{isAr ? 'القيمة المتوقعة E[I]' : 'Expected E[I]'}</span>
                  <b className="text-xl text-slate-300 font-mono tabular-nums">{moranResult.expectedI}</b>
                </div>
              </div>

              {/* Neighborhood Bandwidth Slider */}
              <div className="bg-[#101D38] border border-white/5 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{isAr ? 'نطاق الجوار المحلي لبؤر Gi*:' : 'Local Gi* Neighborhood Radius:'}</span>
                  <b className="font-mono text-purple-300">{hotspotRadiusKm} km</b>
                </div>
                <input
                  type="range"
                  min="150"
                  max="700"
                  step="50"
                  value={hotspotRadiusKm}
                  onChange={(e) => setHotspotRadiusKm(Number(e.target.value))}
                  className="w-full accent-purple-400 h-1.5 cursor-pointer"
                />
              </div>

              <div className="bg-purple-950/20 border border-purple-500/30 p-3.5 rounded-xl text-xs space-y-1">
                <b className="text-purple-300 block">{isAr ? 'التفسير الإحصائي المكاني:' : 'Statistical Interpretation:'}</b>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {isAr ? (moranResult.interpretationAr || moranResult.interpretation) : moranResult.interpretation}
                </p>
              </div>
            </div>

            {/* Right: Interactive LISA Scatterplot */}
            <div className="lg:col-span-7 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div>
                  <h2 className="font-bold text-sm text-white">
                    {isAr ? `مخطط تشتت موران المحلي (LISA Quadrants) — انقر نقطة لتحديد الولاية` : `Local Moran's I (LISA) Scatterplot — Click Point to Inspect`}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                    <span className="text-rose-400 font-bold">HH: {lisaScatter.counts.HH}</span>
                    <span>·</span>
                    <span className="text-sky-400 font-bold">LL: {lisaScatter.counts.LL}</span>
                    <span>·</span>
                    <span className="text-amber-400 font-bold">HL: {lisaScatter.counts.HL}</span>
                    <span>·</span>
                    <span className="text-purple-300 font-bold">LH: {lisaScatter.counts.LH}</span>
                    <span>·</span>
                    <span>{isAr ? `المتوسط الوطني: ${lisaScatter.meanVal}` : `Mean: ${lisaScatter.meanVal}`}</span>
                  </div>
                </div>
              </div>

              <div className="h-64 bg-[#081020] p-2.5 rounded-xl border border-white/5">
                <canvas ref={lisaChartRef} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-300">
                <div className="bg-[#101D38] p-2 rounded-lg border border-white/5">
                  <b className="text-rose-400 block">HH ({lisaScatter.counts.HH})</b>
                  <span>{isAr ? 'قيم مرتفعة محاطة بجوار مرتفع (تكتل مركزي)' : 'High value surrounded by High neighbors'}</span>
                </div>
                <div className="bg-[#101D38] p-2 rounded-lg border border-white/5">
                  <b className="text-sky-400 block">LL ({lisaScatter.counts.LL})</b>
                  <span>{isAr ? 'قيم منخفضة محاطة بجوار منخفض' : 'Low value surrounded by Low neighbors'}</span>
                </div>
                <div className="bg-[#101D38] p-2 rounded-lg border border-white/5">
                  <b className="text-amber-400 block">HL ({lisaScatter.counts.HL})</b>
                  <span>{isAr ? 'قطب معزول مرتفع وسط محيط منخفض' : 'Spatial outlier: High island in Low zone'}</span>
                </div>
                <div className="bg-[#101D38] p-2 rounded-lg border border-white/5">
                  <b className="text-purple-300 block">LH ({lisaScatter.counts.LH})</b>
                  <span>{isAr ? 'جيوب منخفضة وسط محيط مرتفع' : 'Spatial outlier: Low pocket in High belt'}</span>
                </div>
              </div>

              {/* Dynamic Real-World Reading of LISA Scatterplot & Active Wilaya */}
              <div className="bg-[#101D38] border border-purple-500/25 rounded-xl p-3.5 text-[11px] text-slate-300 space-y-2 leading-relaxed">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-purple-300 text-xs">
                    {isAr ? `📖 تفسير المنحنى على أرض الواقع — ${lisaRealWorld.wName}` : `📖 Live Real-World Reading — ${lisaRealWorld.wName}`}
                  </b>
                  <span className="font-mono text-[10px] text-amber-300">
                    {isAr
                      ? `ربع ${lisaRealWorld.pt.quadrant} | Z = ${lisaRealWorld.pt.z} | W·Z = ${lisaRealWorld.pt.wz} | Gi* = ${selectedHotspot.giZScore}`
                      : `Quad ${lisaRealWorld.pt.quadrant} | Z = ${lisaRealWorld.pt.z} | W·Z = ${lisaRealWorld.pt.wz} | Gi* = ${selectedHotspot.giZScore}`}
                  </span>
                </div>
                <p>{lisaRealWorld.axisNote}</p>
                <p className="text-slate-200">
                  <b className="text-emerald-400">{isAr ? 'موقع الولاية المختارة:' : 'Selected Wilaya Position:'}</b>{' '}
                  {isAr
                    ? `تقع ولاية ${lisaRealWorld.wName} (القيمة الفعلية: ${lisaRealWorld.pt.rawValue}) في الربع (${lisaRealWorld.pt.quadrant}) بمعامل تكتل محلي I_i = ${lisaRealWorld.pt.localI}، وهو ما يعني: ${lisaRealWorld.quadDesc}. كما تخضع ${lisaRealWorld.clusterShare}% من ولايات الوطن لقانون الترابط الإقليمي المتشابه (HH + LL).`
                    : `${lisaRealWorld.wName} (raw value ${lisaRealWorld.pt.rawValue}) sits in Quadrant ${lisaRealWorld.pt.quadrant} (Local I_i = ${lisaRealWorld.pt.localI}): ${lisaRealWorld.quadDesc}. Nationally, ${lisaRealWorld.clusterShare}% of wilayas exhibit positive neighbor clustering (HH + LL).`}
                </p>
              </div>
            </div>
          </div>

          {/* Hotspots Full Table */}
          <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <h2 className="font-bold text-sm text-white">
                  {isAr ? `تصنيف بؤر Getis-Ord Gi* (${filteredHotspots.length} ولاية)` : `Getis-Ord Gi* Spatial Cluster Triage (${filteredHotspots.length})`}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute top-2.5 start-2.5" />
                  <input
                    type="text"
                    value={hotspotSearch}
                    onChange={(e) => setHotspotSearch(e.target.value)}
                    placeholder={isAr ? 'ابحث عن ولاية...' : 'Filter wilaya...'}
                    className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg ps-8 pe-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="flex items-center gap-1 bg-[#121F3D] p-1 rounded-lg border border-white/10">
                  {(['all', 'hot', 'cold'] as const).map(fk => (
                    <button
                      key={fk}
                      type="button"
                      onClick={() => setHotspotFilter(fk)}
                      className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition ${
                        hotspotFilter === fk ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {fk === 'all' ? (isAr ? 'الكل' : 'All') : fk === 'hot' ? (isAr ? 'ساخنة' : 'Hotspots') : (isAr ? 'باردة' : 'Coldspots')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs text-slate-300">
                <thead className="sticky top-0 bg-[#0D172E] border-b border-white/10">
                  <tr className="text-left rtl:text-right text-slate-400 font-semibold">
                    <th className="py-2 px-2.5">#</th>
                    <th className="py-2 px-2.5">{isAr ? 'الولاية' : 'Wilaya'}</th>
                    <th className="py-2 px-2.5">{isAr ? 'القيمة' : 'Value'}</th>
                    <th className="py-2 px-2.5">Gi* Z-Score</th>
                    <th className="py-2 px-2.5">P-Value</th>
                    <th className="py-2 px-2.5">{isAr ? 'التصنيف' : 'Classification'}</th>
                    <th className="py-2 px-2.5">{isAr ? 'الخريطة' : 'Map'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredHotspots.map(h => {
                    const isHot = h.classification.includes('Hotspot');
                    const isCold = h.classification.includes('Coldspot');
                    const badge = isHot
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : isCold
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-white/5 text-slate-400';

                    const wObj = wilayas.find(x => x.num === h.wilayaNum);

                    return (
                      <tr
                        key={h.wilayaNum}
                        onClick={() => { if (wObj) onSelectWilaya(wObj); }}
                        className={`hover:bg-white/5 transition cursor-pointer ${selectedWilaya.num === h.wilayaNum ? 'bg-purple-500/10' : ''}`}
                      >
                        <td className="py-2 px-2.5 font-mono text-slate-400 tabular-nums">{h.wilayaNum}</td>
                        <td className="py-2 px-2.5 font-bold text-white">{isAr ? h.wilayaNameAr : h.wilayaName}</td>
                        <td className="py-2 px-2.5 font-mono tabular-nums">{h.value}</td>
                        <td className="py-2 px-2.5 font-mono font-bold text-sky-300 tabular-nums">{h.giZScore}</td>
                        <td className="py-2 px-2.5 font-mono text-slate-400 tabular-nums">{h.giPValue}</td>
                        <td className="py-2 px-2.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${badge}`}>
                            {isAr
                              ? h.classification === 'Hotspot 99%'
                                ? 'بؤرة ساخنة 99%'
                                : h.classification === 'Hotspot 95%'
                                ? 'بؤرة ساخنة 95%'
                                : h.classification === 'Hotspot 90%'
                                ? 'بؤرة ساخنة 90%'
                                : h.classification === 'Coldspot 99%'
                                ? 'بؤرة باردة 99%'
                                : h.classification === 'Coldspot 95%'
                                ? 'بؤرة باردة 95%'
                                : h.classification === 'Coldspot 90%'
                                ? 'بؤرة باردة 90%'
                                : 'غير دال إحصائياً'
                              : h.classification}
                          </span>
                        </td>
                        <td className="py-2 px-2.5">
                          {wObj && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                jumpToMap(wObj);
                              }}
                              className="p-1.5 rounded-lg bg-[#121F3D] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-white/10 cursor-pointer"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* ============================================================ */}
      {/* VIEW 2: Spatial Econometric Regression (Real OLS + SAR)      */}
      {/* ============================================================ */}
      {activeSubTab === 'regression' && (
        <div className="space-y-6">
          <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-400" />
                  <span>{isAr ? 'نموذج الانحدار المكاني الذاتي الحقيقي (Spatial Lag Model - SAR)' : 'Spatial Lag Econometric Model (SAR — Live 58-Wilaya Estimation)'}</span>
                </h2>
                <div className="text-xs text-slate-400 font-mono mt-1">{spatialReg.equation}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={regDepVar}
                  onChange={(e) => setRegDepVar(e.target.value as any)}
                  className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  <option value="waterDef">{isAr ? 'المتغير التابع: العجز المائي' : 'Dep: Water Deficit'}</option>
                  <option value="price">{isAr ? 'المتغير التابع: أسعار العقار' : 'Dep: Real Estate Price'}</option>
                  <option value="industry">{isAr ? 'المتغير التابع: الجاذبية الصناعية' : 'Dep: Industry Index'}</option>
                  <option value="coverage">{isAr ? 'المتغير التابع: التغطية التجارية' : 'Dep: Retail Coverage'}</option>
                </select>
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1.5 rounded-lg font-mono font-bold">
                  ρ = {spatialReg.rho}
                </span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1.5 rounded-lg font-mono font-bold">
                  R² = {spatialReg.r2} (Adj {spatialReg.adjustedR2})
                </span>
                <span className="bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs px-3 py-1.5 rounded-lg font-mono font-bold">
                  AIC = {spatialReg.aic}
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 text-left rtl:text-right font-semibold">
                    <th className="py-2.5 px-3">{isAr ? 'المتغير المستقل (Regressor)' : 'Variable'}</th>
                    <th className="py-2.5 px-3">Coefficient (β)</th>
                    <th className="py-2.5 px-3">Std. Error</th>
                    <th className="py-2.5 px-3">t-Statistic</th>
                    <th className="py-2.5 px-3">p-Value</th>
                    <th className="py-2.5 px-3">{isAr ? 'الدلالة الإحصائية' : 'Significance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {spatialReg.coefficients.map(c => {
                    const sigLabel =
                      c.pValue < 0.01 ? 'p < 0.01 ***' : c.pValue < 0.05 ? 'p < 0.05 **' : c.pValue < 0.1 ? 'p < 0.10 *' : 'n.s.';
                    const sigClass =
                      c.pValue < 0.05 ? 'bg-emerald-500/20 text-emerald-400' : c.pValue < 0.1 ? 'bg-amber-500/20 text-amber-300' : 'bg-white/10 text-slate-400';

                    return (
                      <tr key={c.variable} className="hover:bg-white/5 transition">
                        <td className="py-3 px-3 font-bold text-white">{isAr ? c.variableAr : c.variable}</td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold tabular-nums">{c.beta}</td>
                        <td className="py-3 px-3 font-mono text-slate-400 tabular-nums">{c.stdError}</td>
                        <td className="py-3 px-3 font-mono text-sky-300 tabular-nums">{c.tStat}</td>
                        <td className="py-3 px-3 font-mono text-slate-300 tabular-nums">{c.pValue}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${sigClass}`}>{sigLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-[#101D38] p-4 rounded-xl border border-white/5 text-xs text-slate-300 space-y-1">
              <b className="text-white block">{isAr ? 'التحليل الاقتصادي القياسي المفسر:' : 'Econometric Interpretation:'}</b>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                {isAr
                  ? `معامل الانتشار المكاني ρ = ${spatialReg.rho} ومعامل التحديد R² = ${spatialReg.r2} يوضحان مدى انتقال أثر الظاهرة من الولايات المجاورة. القيم ذات البواقي المرتفعة أدناه تمثل ولايات تفوق أو تتخلف عن المسار الذي تتنبأ به جغرافيتها وجيرانها.`
                  : `Spatial autoregressive spillover coefficient ρ = ${spatialReg.rho} with model fit R² = ${spatialReg.r2} (AIC = ${spatialReg.aic}). High-residual wilayas below deviate sharply from neighboring territorial expectations.`}
              </p>
            </div>
          </div>

          {/* Observed vs Predicted Chart & Spatial Residuals Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="font-bold text-sm text-white border-b border-white/10 pb-2">
                {isAr ? 'جودة التنبؤ المكاني: المرصود (Y) مقابل المقدر (Ŷ)' : 'Spatial Model Goodness-of-Fit (Observed vs Predicted)'}
              </h3>
              <div className="h-64 bg-[#081020] p-2.5 rounded-xl border border-white/5">
                <canvas ref={regChartRef} />
              </div>
            </div>

            <div className="lg:col-span-6 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-3">
              <h3 className="font-bold text-sm text-white border-b border-white/10 pb-2">
                {isAr ? 'أكبر الانحرافات والشواذ المكانية (Spatial Residuals)' : 'Top Spatial Model Residuals (Geographic Anomalies)'}
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead className="sticky top-0 bg-[#0D172E] border-b border-white/10 text-slate-400">
                    <tr className="text-left rtl:text-right">
                      <th className="py-2 px-2">{isAr ? 'الولاية' : 'Wilaya'}</th>
                      <th className="py-2 px-2">{isAr ? 'الفعلي' : 'Obs'}</th>
                      <th className="py-2 px-2">{isAr ? 'المتوقع' : 'Pred'}</th>
                      <th className="py-2 px-2">{isAr ? 'البواقي (ε)' : 'Residual'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {spatialReg.residuals.slice(0, 14).map(r => (
                      <tr
                        key={r.wilayaNum}
                        onClick={() => {
                          const wObj = wilayas.find(x => x.num === r.wilayaNum);
                          if (wObj) onSelectWilaya(wObj);
                        }}
                        className="hover:bg-white/5 cursor-pointer"
                      >
                        <td className="py-2 px-2 font-bold text-white">{r.wilayaNum}. {isAr ? r.wilayaNameAr : r.wilayaName}</td>
                        <td className="py-2 px-2 font-mono tabular-nums">{r.observed}</td>
                        <td className="py-2 px-2 font-mono text-slate-400 tabular-nums">{r.predicted}</td>
                        <td className={`py-2 px-2 font-mono font-bold tabular-nums ${r.residual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {r.residual >= 0 ? `+${r.residual}` : r.residual}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-4 text-[11px] text-slate-300 leading-relaxed space-y-1.5">
            <b className="text-emerald-400 text-xs block">
              {isAr ? '📖 قراءة تطبيقية لمنحنى التنبؤ والبواقي (Observed vs Predicted):' : '📖 Interpreting Predicted Fit & Spatial Anomalies:'}
            </b>
            <p>
              {isAr
                ? `النقاط القريبة من الخط الأخضر المتقطع (Y = Ŷ) تخضع بدقة لقوانين الجغرافيا والجوار المكاني (يفسر النموذج ${Math.round(spatialReg.r2 * 100)}% من التباين الوطني، مقابل AIC = ${spatialReg.aic}). النقاط التي تقع أعلى الخط تحقق فعلياً قيماً أكبر من المتوقع (مثل ${regressionRealWorld.posOutlier?.wilayaNameAr || ''} بفارق +${regressionRealWorld.posOutlier?.residual ?? 0})، بينما النقاط أدنى الخط تقل عن جوارها (مثل ${regressionRealWorld.negOutlier?.wilayaNameAr || ''} بفارق ${regressionRealWorld.negOutlier?.residual ?? 0}) نتيجة عوامل محلية خاصة كالسدود أو الثقل الديمغرافي أو العزلة الطرقية.`
                : `Wilayas near the dashed 45° green fit line behave as neighboring geography predicts (model explains ${Math.round(spatialReg.r2 * 100)}% of variance; AIC = ${spatialReg.aic}). Points above the line exceed expectations (${regressionRealWorld.posOutlier?.wilayaName || ''}: +${regressionRealWorld.posOutlier?.residual ?? 0}), while points below underperform (${regressionRealWorld.negOutlier?.wilayaName || ''}: ${regressionRealWorld.negOutlier?.residual ?? 0}) due to localized structural factors.`}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 3: KDE 2D Heatmap, Empirical Semivariogram & Kriging    */}
      {/* ============================================================ */}
      {activeSubTab === 'kde_kriging' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KDE Spatial Heatmap Grid */}
            <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-sky-400" />
                  <h2 className="font-bold text-sm text-white">
                    {isAr ? 'خريطة كثافة النواة ثنائية الأبعاد (KDE Surface)' : '2D Gaussian Kernel Density Surface (N→S / W→E)'}
                  </h2>
                </div>
                <span className="text-xs font-mono text-sky-300">Peak: ({kdeResult.peakCoord.lat}°, {kdeResult.peakCoord.lon}°)</span>
              </div>

              <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{isAr ? 'عرض النطاق المكاني (Bandwidth):' : 'Gaussian Kernel Bandwidth:'}</span>
                  <b className="font-mono text-sky-400">{kdeBandwidthKm} km</b>
                </div>
                <input
                  type="range"
                  min="60"
                  max="300"
                  step="20"
                  value={kdeBandwidthKm}
                  onChange={(e) => setKdeBandwidthKm(Number(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-12 gap-1 bg-[#081020] p-2.5 rounded-xl border border-white/10" dir="ltr">
                {kdeResult.grid.map((cell, i) => {
                  const intensity = Math.min(1, cell.density / Math.max(0.001, kdeResult.maxDensity));
                  const bg =
                    intensity > 0.72
                      ? `rgba(244, 63, 94, ${0.45 + intensity * 0.5})`
                      : intensity > 0.4
                      ? `rgba(245, 158, 11, ${0.28 + intensity * 0.5})`
                      : `rgba(14, 165, 233, ${0.08 + intensity * 0.55})`;
                  return (
                    <div
                      key={i}
                      title={`Lat ${cell.lat}°, Lon ${cell.lon}° — Density ${cell.density}`}
                      style={{ backgroundColor: bg }}
                      className="aspect-square rounded-[3px] border border-white/5 flex items-center justify-center text-[8px] font-mono text-white/90"
                    >
                      {intensity > 0.55 ? Math.round(intensity * 100) : ''}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'تمثل الشبكة خريطة حرارية جغرافية للجزائر (من الشمال في الأعلى إلى أقصى الجنوب في الأسفل). النطاقات الحمراء توضح ذروة التركز لمتغير الاختيار.'
                  : 'Geographic heatmap oriented North (top) to Deep South (bottom). Crimson cells locate spatial peak clusters for the active variable.'}
              </p>
            </div>

            {/* Semivariogram & Kriging/IDW */}
            <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-bold text-sm text-white">
                    {isAr ? `الاستيفاء المكاني (${interpMethod}) والتحقق التبادلي LOOCV` : `${interpMethod} Interpolation & Leave-One-Out CV`}
                  </h2>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-emerald-400 font-bold">RMSE: {interpResult.rmse}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-sky-300 font-bold">MAE: {interpResult.mae}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#101D38] p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-1 bg-[#081020] p-1 rounded-lg border border-white/10">
                  {(['Kriging', 'IDW'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setInterpMethod(m)}
                      className={`flex-1 py-1.5 rounded text-xs font-bold cursor-pointer transition ${
                        interpMethod === m ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m === 'Kriging' ? 'Ordinary Kriging' : 'IDW Inverse Dist'}
                    </button>
                  ))}
                </div>

                {interpMethod === 'Kriging' ? (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">{isAr ? 'مدى الارتباط (Range):' : 'Variogram Range:'}</span>
                      <b className="font-mono text-emerald-400">{krigingRangeKm} km</b>
                    </div>
                    <input
                      type="range"
                      min="150"
                      max="750"
                      step="50"
                      value={krigingRangeKm}
                      onChange={(e) => setKrigingRangeKm(Number(e.target.value))}
                      className="w-full accent-emerald-400 h-1.5 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300">{isAr ? 'أس المسافة (IDW p):' : 'Distance Power (p):'}</span>
                      <b className="font-mono text-emerald-400">p = {idwPower}</b>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="0.5"
                      value={idwPower}
                      onChange={(e) => setIdwPower(Number(e.target.value))}
                      className="w-full accent-emerald-400 h-1.5 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="h-44 bg-[#081020] p-2 rounded-xl border border-white/5">
                <canvas ref={variogramChartRef} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {interpResult.interpolatedPoints.map((pt, i) => (
                  <div key={i} className="flex justify-between items-center bg-[#121F3D] p-2 rounded-lg border border-white/5 text-[11px]">
                    <div className="min-w-0">
                      <b className="text-white block truncate">{isAr ? pt.labelAr : pt.label}</b>
                      <span className="text-slate-400 font-mono text-[10px]">({pt.lat}°, {pt.lon}°)</span>
                    </div>
                    <div className="text-end shrink-0">
                      <span className="text-emerald-400 font-mono font-bold block">{pt.value}</span>
                      <span className="text-slate-500 font-mono text-[9px]">σ²={pt.variance}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-4 text-[11px] text-slate-300 leading-relaxed space-y-1.5">
            <b className="text-sky-300 text-xs block">
              {isAr ? '📖 تفسير خريطة الكثافة (KDE) ومنحنى شبه التباين (Semivariogram):' : '📖 Interpreting KDE Surface, Semivariogram & LOOCV Accuracy:'}
            </b>
            <p>
              {isAr
                ? `• منحنى شبه التباين γ(h): يُظهر كيف يضعف التشابه الجغرافي مع البعد بالكيلومترات؛ قيمة العتبة القاعدية (Nugget = ${variogram.nugget}) تقيس الفروقات المحلية الدقيقة، وقيمة السقف (Sill = ${variogram.sill}) تمثل التباين الأقصى حيث يتلاشى أثر الجوار بعد مدى ${krigingRangeKm} كم. • دقة التحقق التبادلي (LOOCV RMSE = ${interpResult.rmse}): كلما انخفضت القيمة، زادت موثوقية التقدير في المناطق التي تغيب عنها محطات القياس، بينما تقع ذروة تركز الكثافة عند (${kdeResult.peakCoord.lat}°, ${kdeResult.peakCoord.lon}°).`
                : `• Semivariogram γ(h): Shows how spatial similarity decays with distance; Nugget (${variogram.nugget}) captures micro-scale local noise, Sill (${variogram.sill}) marks maximum variance plateau beyond Range ${krigingRangeKm} km. • LOOCV Validation (RMSE = ${interpResult.rmse}, MAE = ${interpResult.mae}): Measures out-of-sample estimation precision across unmeasured zones, with KDE spatial peak at (${kdeResult.peakCoord.lat}°, ${kdeResult.peakCoord.lon}°).`}
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 4: Proximity, Catchments & Spatial Accessibility        */}
      {/* ============================================================ */}
      {activeSubTab === 'proximity' && (
        <div className="space-y-6">
          <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="font-bold text-base text-white">
                    {isAr
                      ? `تحليل القرب الجغرافي ونطاقات الجاذبية انطلاقاً من: ${selectedWilaya.n}`
                      : `Proximity Catchments & Accessibility Corridors from ${selectedWilaya.en}`}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {isAr
                      ? 'حساب المسافات الجغرافية الحقيقية (Haversine)، جاذبية هاف وتحديد أقرب أقطاب الإسناد المائي والتجاري والصناعي.'
                      : 'Computes real Haversine corridors, Huff interaction share, and nearest relief poles for supply & infrastructure planning.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedWilaya.num}
                  onChange={(e) => {
                    const target = wilayas.find(w => w.num === Number(e.target.value));
                    if (target) onSelectWilaya(target);
                  }}
                  className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  {wilayas.map(w => (
                    <option key={w.num} value={w.num}>
                      {w.num}. {isAr ? w.n : w.en}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sliders + Summary KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{isAr ? 'نصف قطر النطاق:' : 'Radius Threshold:'}</span>
                  <b className="font-mono text-emerald-400">{proximityRadiusKm} km</b>
                </div>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="25"
                  value={proximityRadiusKm}
                  onChange={(e) => setProximityRadiusKm(Number(e.target.value))}
                  className="w-full accent-emerald-400 h-1.5 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">
                  {isAr ? `${proximity.withinRadius.length} ولاية داخل النطاق` : `${proximity.withinRadius.length} wilayas inside ring`}
                </div>
              </div>

              <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{isAr ? 'معامل احتكاك المسافة (β):' : 'Distance Decay (β):'}</span>
                  <b className="font-mono text-sky-400">{gravityBeta}</b>
                </div>
                <input
                  type="range"
                  min="1.0"
                  max="2.5"
                  step="0.1"
                  value={gravityBeta}
                  onChange={(e) => setGravityBeta(Number(e.target.value))}
                  className="w-full accent-sky-400 h-1.5 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">
                  {isAr ? `متوسط النطاق: ${proximity.avgMetricInRadius} مقابل ${proximity.nationalAvgMetric} وطنياً` : `Ring Avg: ${proximity.avgMetricInRadius} vs ${proximity.nationalAvgMetric}`}
                </div>
              </div>

              <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-amber-400 font-bold block">{isAr ? 'أقرب قطب تموين (≥80%)' : 'Nearest Supply Hub (≥80%)'}</span>
                <b className="text-sm text-white block mt-0.5">
                  {isAr ? proximity.nearestRetailHub?.wilaya.n : proximity.nearestRetailHub?.wilaya.en}
                </b>
                <span className="text-[11px] font-mono text-slate-400">
                  {proximity.nearestRetailHub?.distanceKm} km · {proximity.nearestRetailHub?.wilaya.coverage}%
                </span>
              </div>

              <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-purple-400 font-bold block">{isAr ? 'أقرب قطب صناعي (≥75)' : 'Nearest Industry Pole (≥75)'}</span>
                <b className="text-sm text-white block mt-0.5">
                  {isAr ? proximity.nearestIndustrialPole?.wilaya.n : proximity.nearestIndustrialPole?.wilaya.en}
                </b>
                <span className="text-[11px] font-mono text-slate-400">
                  {proximity.nearestIndustrialPole?.distanceKm} km · {proximity.nearestIndustrialPole?.wilaya.industry}/100
                </span>
              </div>

              <div className="bg-[#121F3D] p-3 rounded-xl border border-white/5">
                <span className="text-[10px] text-sky-400 font-bold block">{isAr ? 'أقرب ولاية إسناد مائي' : 'Nearest Water Relief Peer'}</span>
                <b className="text-sm text-white block mt-0.5">
                  {isAr ? proximity.nearestWaterRelief?.wilaya.n : proximity.nearestWaterRelief?.wilaya.en}
                </b>
                <span className="text-[11px] font-mono text-slate-400">
                  {proximity.nearestWaterRelief?.distanceKm} km · {proximity.nearestWaterRelief?.wilaya.waterDef}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-[#081020] p-4 rounded-xl border border-white/10 space-y-2">
                <h3 className="text-xs font-bold text-white">
                  {isAr ? 'منحنى تناقص الجاذبية التجارية والسكانية مع المسافة (Huff Model)' : 'Huff Attraction Share by Neighbor Distance'}
                </h3>
                <div className="h-60">
                  <canvas ref={proximityChartRef} />
                </div>
              </div>

              <div className="lg:col-span-6 max-h-72 overflow-y-auto bg-[#081020] p-3 rounded-xl border border-white/10">
                <table className="w-full text-xs text-slate-300">
                  <thead className="sticky top-0 bg-[#081020] border-b border-white/10 text-slate-400">
                    <tr className="text-left rtl:text-right">
                      <th className="py-2 px-2">{isAr ? 'الولاية المجاورة' : 'Neighbor'}</th>
                      <th className="py-2 px-2">{isAr ? 'المسافة' : 'Dist'}</th>
                      <th className="py-2 px-2">{isAr ? 'جذب هاف' : 'Huff %'}</th>
                      <th className="py-2 px-2">{isAr ? 'فارق المؤشر' : 'Δ Metric'}</th>
                      <th className="py-2 px-2">{isAr ? 'الخريطة' : 'Map'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {proximity.allSortedByDistance.slice(0, 20).map(item => (
                      <tr key={item.wilaya.num} className="hover:bg-white/5">
                        <td className="py-2 px-2 font-bold text-white">
                          {item.wilaya.num}. {isAr ? item.wilaya.n : item.wilaya.en}
                        </td>
                        <td className="py-2 px-2 font-mono text-sky-300 tabular-nums">{item.distanceKm} km</td>
                        <td className="py-2 px-2 font-mono text-emerald-400 font-bold tabular-nums">{item.huffSharePct}%</td>
                        <td className={`py-2 px-2 font-mono tabular-nums ${item.metricDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {item.metricDelta >= 0 ? `+${item.metricDelta}` : item.metricDelta}
                        </td>
                        <td className="py-2 px-2">
                          <button
                            type="button"
                            onClick={() => jumpToMap(item.wilaya)}
                            className="p-1 rounded bg-[#121F3D] hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#101D38] border border-white/5 rounded-xl p-3.5 text-[11px] text-slate-300 leading-relaxed">
              <b className="text-emerald-400 text-xs block mb-1">
                {isAr ? '📖 قراءة منحنى تناقص الجاذبية (Huff Gravity Model):' : '📖 Interpreting Huff Catchment Decay:'}
              </b>
              {isAr
                ? `تنال ولاية ${proximity.allSortedByDistance[0]?.wilaya.n || ''} وما جاورها ضمن دائرة ${proximityRadiusKm} كم أكبر حصة تفاعل (${proximity.allSortedByDistance[0]?.huffSharePct ?? 0}%) تبعاً لحجم كتلتها السكانية وقربها بالكيلومتر (معامل الاحتكاك β = ${gravityBeta}). تضم الدائرة حالياً ${proximity.withinRadius.length} ولاية بمتوسط ${proximity.avgMetricInRadius} مقارنة بـ ${proximity.nationalAvgMetric} وطنياً، ما يحدد مسارات التبادل اللوجستي والإمداد الأقل كلفة.`
                : `Under distance friction β = ${gravityBeta}, ${proximity.allSortedByDistance[0]?.wilaya.en || ''} captures the top attraction share (${proximity.allSortedByDistance[0]?.huffSharePct ?? 0}%). The ${proximityRadiusKm} km ring encloses ${proximity.withinRadius.length} neighboring wilayas averaging ${proximity.avgMetricInRadius} vs ${proximity.nationalAvgMetric} nationally, guiding low-cost supply and relief corridors.`}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 5: Regional Inequality & Multi-Level Drill-Down         */}
      {/* ============================================================ */}
      {activeSubTab === 'regional_drilldown' && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="border-b border-white/10 pb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-bold text-base text-white">
                  {isAr ? 'التدرج الجغرافي ومؤشر التفاوت الداخلي: الوطني ← الأقاليم الخمسة ← الولايات' : 'Territorial Multi-Level Drill-Down & Intra-Regional Disparity'}
                </h2>
                <span className="text-xs text-slate-400">
                  {isAr ? 'تحليل الفوارق داخل كل إقليم (معامل التباين CV%) ومستوى التغطية والصناعة' : 'Regional decomposition across North, High-Plateaus & Sahara with CV% disparity'}
                </span>
              </div>
            </div>

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
            {Object.entries(regionalSummaries).map(([regKey, regData]) => {
              const isSelected = selectedRegionId === 'all' || selectedRegionId === regKey;
              return (
                <div
                  key={regKey}
                  onClick={() => setSelectedRegionId(selectedRegionId === regKey ? 'all' : regKey)}
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
                    {isAr ? 'تباين العجز (CV):' : 'Disparity CV:'} <b className="text-amber-300 font-mono">{regData.deficitCvPct}%</b>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#081020] p-4 rounded-xl border border-white/10 space-y-2.5">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isAr ? 'مقارنة التغطية والجاهزية الصناعية والتفاوت الداخلي عبر الأقاليم الـ 5' : 'Cross-Region Benchmark: Retail Coverage, Industry & Water CV%'}</span>
            </h3>
            <div className="h-56">
              <canvas ref={regionChartRef} />
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-white/10">
              {isAr
                ? `📖 قراءة التفاوت الإقليمي: يسجل إقليم "${regionalRealWorld.maxCvReg?.regionNameAr}" أعلى تباين داخلي للموارد المائية (CV = ${regionalRealWorld.maxCvReg?.deficitCvPct}%) مما يعني تفاوتاً حاداً بين ولاياته، بينما يتصدر "${regionalRealWorld.maxIndReg?.regionNameAr}" الجاهزية الصناعية (${regionalRealWorld.maxIndReg?.avgIndustry}/100)، ويسجل "${regionalRealWorld.worstWaterReg?.regionNameAr}" أشد متوسط عجز مائي (${regionalRealWorld.worstWaterReg?.avgDeficit}).`
                : `📖 Regional Disparity Reading: "${regionalRealWorld.maxCvReg?.regionName}" exhibits the widest internal water disparity (CV = ${regionalRealWorld.maxCvReg?.deficitCvPct}%), "${regionalRealWorld.maxIndReg?.regionName}" leads industrial readiness (${regionalRealWorld.maxIndReg?.avgIndustry}/100), and "${regionalRealWorld.worstWaterReg?.regionName}" carries the deepest mean water deficit (${regionalRealWorld.worstWaterReg?.avgDeficit}).`}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2">
              {isAr ? 'قائمة الولايات التابعة للإقليم المختار (انقر للانتقال إلى الخريطة):' : 'Wilayas in Selected Region (Click to locate on map):'}
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
                    type="button"
                    onClick={() => jumpToMap(w)}
                    className="p-2 bg-[#101D38] hover:bg-[#182B52] border border-white/5 rounded-lg text-left rtl:text-right text-xs transition cursor-pointer"
                  >
                    <div className="text-[10px] text-slate-400">#{w.num}</div>
                    <div className="font-bold text-white truncate">{isAr ? w.n : w.en}</div>
                    <div className="text-[10px] text-sky-400 font-mono mt-0.5 tabular-nums">{w.waterDef} def | {w.rain}mm</div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VIEW 6: AHP Multi-Criteria Spatial Suitability               */}
      {/* ============================================================ */}
      {activeSubTab === 'ahp' && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="font-bold text-sm text-white">
                  {isAr ? 'التحليل المكاني متعدد المعايير لاختيار مواقع الاستثمار (AHP Suitability MCDA)' : 'AHP Multi-Criteria Spatial Decision & Suitability Engine'}
                </h2>
                <span className="text-xs text-slate-400">
                  {isAr ? 'تخصيص 7 معايير استراتيجية مع قوالب جاهزة وتدقيق نسبة الاتساق CR' : '7 dynamic weights, sector presets, stacked criterion breakdown & Saaty CR check'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-[#121F3D] p-1 rounded-lg border border-white/10 text-[11px]">
                <button type="button" onClick={() => applyAhpPreset('balanced')} className="px-2 py-1 rounded hover:bg-white/10 text-slate-200 cursor-pointer">
                  {isAr ? 'متوازن' : 'Balanced'}
                </button>
                <button type="button" onClick={() => applyAhpPreset('industry')} className="px-2 py-1 rounded hover:bg-white/10 text-purple-300 cursor-pointer">
                  {isAr ? 'صناعي' : 'Industrial'}
                </button>
                <button type="button" onClick={() => applyAhpPreset('agri')} className="px-2 py-1 rounded hover:bg-white/10 text-emerald-300 cursor-pointer">
                  {isAr ? 'فلاحي' : 'Agro'}
                </button>
                <button type="button" onClick={() => applyAhpPreset('commerce')} className="px-2 py-1 rounded hover:bg-white/10 text-amber-300 cursor-pointer">
                  {isAr ? 'تمويني' : 'Logistics'}
                </button>
              </div>

              <span className={`text-xs px-2.5 py-1 rounded font-bold flex items-center gap-1.5 ${
                ahpResult.isConsistent ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {ahpResult.isConsistent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>CR = {ahpResult.consistencyRatio} ({ahpResult.isConsistent ? (isAr ? 'متسق' : 'Consistent') : (isAr ? 'متباين' : 'Skewed')})</span>
              </span>
            </div>
          </div>

          {/* 7 Criteria Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 bg-[#101D38] p-3.5 rounded-xl border border-white/5">
            {([
              { id: 'water', label: isAr ? '💧 المياه' : '💧 Water', color: 'accent-sky-400 text-sky-400' },
              { id: 'roads', label: isAr ? '🛣️ الطرق' : '🛣️ Roads', color: 'accent-emerald-400 text-emerald-400' },
              { id: 'energy', label: isAr ? '⚡ الطاقة' : '⚡ Energy', color: 'accent-amber-400 text-amber-400' },
              { id: 'labor', label: isAr ? '👥 العمالة' : '👥 Labor', color: 'accent-purple-400 text-purple-400' },
              { id: 'soil', label: isAr ? '🌱 التربة' : '🌱 Soil', color: 'accent-lime-400 text-lime-400' },
              { id: 'coverage', label: isAr ? '🛒 التغطية' : '🛒 Coverage', color: 'accent-cyan-400 text-cyan-400' },
              { id: 'price', label: isAr ? '🏷️ العقار' : '🏷️ Land', color: 'accent-rose-400 text-rose-400' }
            ] as const).map(item => (
              <div key={item.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">{item.label}</span>
                  <b className={`font-mono ${item.color.split(' ')[1]}`}>{ahpWeights[item.id]}</b>
                </div>
                <input
                  type="range"
                  min="5"
                  max="70"
                  step="5"
                  value={ahpWeights[item.id]}
                  onChange={(e) => setAhpWeights({ ...ahpWeights, [item.id]: Number(e.target.value) })}
                  className={`w-full h-1.5 cursor-pointer ${item.color.split(' ')[0]}`}
                />
              </div>
            ))}
          </div>

          {/* Stacked AHP Contribution Chart */}
          <div className="bg-[#081020] p-4 rounded-xl border border-white/10 space-y-2.5">
            <h3 className="text-xs font-bold text-white">
              {isAr ? 'تفكيك مساهمة كل معيار في الترتيب العام لأفضل 10 ولايات' : 'AHP Score Decomposition Across Top 10 Ranked Wilayas'}
            </h3>
            <div className="h-56">
              <canvas ref={ahpChartRef} />
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed pt-1 border-t border-white/10">
              {isAr
                ? `📖 تفسير الترتيب وتدقيق الاتساق: مؤشر الاتساق CR = ${ahpResult.consistencyRatio} (${ahpResult.isConsistent ? 'مقبول علمياً < 0.10 أي أن الأوزان متزنة ومنطقية' : 'مرتفع ≥ 0.10 بسبب تركيز الوزن على معيار واحد'}). تتصدر ولاية "${ahpRealWorld.winner?.wilayaAr}" بنتيجة ${ahpRealWorld.winner?.score}/100، وجاء الداعم الأكبر لتفوقها من معيار "${ahpRealWorld.topCritName}" (+${ahpRealWorld.topCritPts} نقطة).`
                : `📖 AHP Decision Reading: Consistency Ratio CR = ${ahpResult.consistencyRatio} (${ahpResult.isConsistent ? 'logically coherent < 0.10' : 'high dispersion ≥ 0.10'}). "${ahpRealWorld.winner?.wilaya}" ranks #1 (${ahpRealWorld.winner?.score}/100), driven primarily by "${ahpRealWorld.topCritName}" (+${ahpRealWorld.topCritPts} pts).`}
            </p>
          </div>

          {/* Top 10 Ranked Wilayas Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 mb-2">
              {isAr ? 'الولايات الأكثر ملاءمة (انقر لعرض الموقع على الخريطة):' : 'Top Ranked Wilayas (Click to jump to Map):'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {ahpResult.rankedWilayas.slice(0, 10).map((item, idx) => (
                <div
                  key={item.wilaya}
                  className="bg-[#121F3D] border border-white/5 p-2.5 rounded-xl text-center hover:border-emerald-500/40 transition cursor-pointer"
                  onClick={() => {
                    const target = wilayas.find(w => w.en === item.wilaya);
                    if (target) jumpToMap(target);
                  }}
                >
                  <div className="text-[10px] text-slate-400">#{idx + 1}</div>
                  <div className="text-xs font-extrabold text-white mt-0.5">{isAr ? item.wilayaAr : item.wilaya}</div>
                  <div className="text-emerald-400 text-xs font-mono font-bold mt-1 tabular-nums">{item.score}/100</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
