/**
 * GIS Map – Main GIS Interactive Map & Layers Section
 * Leaflet map, layer controls, dynamic KPIs, radar & forecast charts, and detail side panel
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Chart as ChartJS, registerables } from 'chart.js';
import { SectorKey, WilayaRecord } from '../types';
import {
  ALL_18_INDICATORS,
  calcNatAvg,
  calcRankOf,
  vsAvgText,
  predictWater,
  cropRisk,
  urbanGrowth,
  industryScore,
  riskOf,
  riskLabel,
  generateActionPlan,
  suitabilityAgri
} from '../engines/reporting';
import { classifyWilayaGeoZone, scanNationalEarlyWarnings } from '../engines/earlyWarning';
import { Info, MapPin, Layers, Droplets, ShieldAlert, TrendingUp, Compass, CheckCircle, Globe, FileText, X, BarChart3, Activity } from 'lucide-react';

ChartJS.register(...registerables);

export type BasemapKey = 'osm' | 'satellite' | 'dark' | 'topo';

export interface BasemapOption {
  key: BasemapKey;
  labelAr: string;
  labelEn: string;
  shortLabelAr: string;
  shortLabelEn: string;
  url: string;
  attribution: string;
  maxZoom: number;
}

export const BASEMAP_OPTIONS: BasemapOption[] = [
  {
    key: 'osm',
    labelAr: 'خريطة الشارع المفتوح (التطبيق القديم - مجاني)',
    labelEn: 'OpenStreetMap (Legacy App - Free)',
    shortLabelAr: 'خريطة التطبيق القديم (OSM)',
    shortLabelEn: 'Legacy OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  },
  {
    key: 'satellite',
    labelAr: 'صور الأقمار الاصطناعية (Esri Satellite)',
    labelEn: 'Satellite Imagery (Esri)',
    shortLabelAr: 'أقمار اصطناعية',
    shortLabelEn: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 18
  },
  {
    key: 'dark',
    labelAr: 'الوضع الليلي عالي التباين (Esri Dark)',
    labelEn: 'Dark Canvas (Esri)',
    shortLabelAr: 'ليلي داكن',
    shortLabelEn: 'Dark Canvas',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
    maxZoom: 16
  },
  {
    key: 'topo',
    labelAr: 'التضاريس الطبيعية (OpenTopoMap)',
    labelEn: 'Topographic (OpenTopoMap)',
    shortLabelAr: 'تضاريس',
    shortLabelEn: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM',
    maxZoom: 17
  }
];

interface GisMapSectionProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  currentSector: SectorKey;
  onSectorChange: (s: SectorKey) => void;
  targetYear: number;
  onYearChange: (y: number) => void;
  lang: 'ar' | 'en';
  onNavigateTab: (tabId: string) => void;
  onOpenReport?: () => void;
  focusRequest?: { wilayaNum: number; ts: number } | null;
}

export const GisMapSection: React.FC<GisMapSectionProps> = ({
  wilayas,
  selectedWilaya,
  onSelectWilaya,
  currentSector,
  onSectorChange,
  targetYear,
  onYearChange,
  lang,
  onNavigateTab,
  onOpenReport,
  focusRequest
}) => {
  const isAr = lang === 'ar';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.CircleMarker>>({});

  const chartWaterRef = useRef<HTMLCanvasElement>(null);
  const chartRadarRef = useRef<HTMLCanvasElement>(null);
  const chartWaterInstance = useRef<ChartJS | null>(null);
  const chartRadarInstance = useRef<ChartJS | null>(null);

  const [currentBasemap, setCurrentBasemap] = useState<BasemapKey>('osm');
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [chartMetric, setChartMetric] = useState<'waterDef' | 'rain' | 'price' | 'pop'>('waterDef');
  const [showRadarBenchmark, setShowRadarBenchmark] = useState<boolean>(true);

  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    realestate: true,
    agri: true,
    water: true,
    commerce: true,
    industry: true
  });
  const [showAnomalies, setShowAnomalies] = useState<boolean>(true);
  const [actionAlert, setActionAlert] = useState<string | null>(null);
  const [dossierWilaya, setDossierWilaya] = useState<WilayaRecord | null>(null);

  useEffect(() => {
    if (!dossierWilaya) return;
    const fresh = wilayas.find(w => w.num === dossierWilaya.num);
    if (fresh) setDossierWilaya(fresh);
  }, [wilayas, dossierWilaya]);

  // Sector color function
  const getColorBySector = (w: WilayaRecord, sector: SectorKey): string => {
    if (sector === 'water') {
      return w.waterDef < -25 ? '#EF4444' : w.waterDef < -10 ? '#F59E0B' : '#10B981';
    }
    if (sector === 'agri') {
      return w.ndvi > 0.55 ? '#10B981' : w.ndvi > 0.32 ? '#EAB308' : '#EF4444';
    }
    if (sector === 'realestate') {
      return w.flood > 0.4 ? '#EF4444' : w.price > 120000 ? '#F59E0B' : '#10B981';
    }
    if (sector === 'commerce') {
      const gap = Math.max(0, 100 - w.coverage);
      return gap > 35 ? '#EF4444' : gap > 15 ? '#F59E0B' : '#10B981';
    }
    if (sector === 'industry') {
      const ind = Math.round(w.energy * 0.3 + w.roads * 0.3 + w.labor * 0.2 + (100 - Math.abs(w.waterDef)) * 0.2);
      return ind > 70 ? '#10B981' : ind > 55 ? '#F59E0B' : '#EF4444';
    }
    // Overall composite
    const risks = [
      w.waterDef < -20 ? 1 : 0,
      w.flood > 0.4 ? 1 : 0,
      100 - w.coverage > 30 ? 1 : 0,
      w.rain < 180 ? 1 : 0
    ];
    const s = risks.reduce((a, b) => a + b, 0);
    return s >= 2 ? '#EF4444' : s === 1 ? '#F59E0B' : '#10B981';
  };

  // Radius sizing
  const getSizeBySector = (w: WilayaRecord, sector: SectorKey): number => {
    if (sector === 'water') return Math.min(26, 8 + Math.abs(w.waterDef) * 0.6);
    if (sector === 'commerce') return Math.min(26, 8 + w.pop / 140);
    if (sector === 'realestate') return Math.min(26, 8 + w.price / 14000);
    if (sector === 'agri') return Math.min(26, 8 + w.ndvi * 24);
    return Math.min(26, 10 + w.industry * 0.2);
  };

  // Anomaly description
  const detectAnomaly = (w: WilayaRecord): string | null => {
    const expectedMarkets = w.pop / 40;
    const diff = expectedMarkets - w.markets;
    if (diff > 15) return isAr ? `فجوة تجارية حادة: نقص ${Math.round(diff)} سوقاً مقارنة بالسكان` : `Severe market shortage (${Math.round(diff)} markets missing)`;
    if (w.waterDef < -30 && w.wells > 900) return isAr ? 'استنزاف خطير للطبقة الجوفية — السحب يفوق التغذية' : 'Critical groundwater depletion — extraction exceeds recharge';
    if (w.flood > 0.4 && w.price > 90000) return isAr ? 'مضاربة عقارية عالية داخل مجرى سيول الأودية' : 'High property prices inside a flood zone — speculation risk';
    if (w.ndvi < 0.2 && w.soil > 35) return isAr ? 'ضعف الغطاء النباتي رغم جودة التربة — حاجة للسقي التكميلي' : 'Low NDVI despite fair soil — under-use or irrigation gap';
    if (w.industry < 50 && w.energy > 70) return isAr ? 'منطقة صناعية راكدة رغم توفر الكهرباء — قيد في المياه أو الطرق' : 'Empty industrial zone despite power — road/water bottleneck';
    return null;
  };

  // Initialize Leaflet Map (Using OpenStreetMap standard layer from legacy app - no API key needed)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.0, 2.5],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12
    });

    // Default tile layer: exact OpenStreetMap layer from legacy app (no API key required)
    const initialConfig = BASEMAP_OPTIONS[0];
    const tileLayer = L.tileLayer(initialConfig.url, {
      attribution: initialConfig.attribution,
      maxZoom: initialConfig.maxZoom
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Dynamic Basemap Switcher (Free layers - No API key needed)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const config = BASEMAP_OPTIONS.find(b => b.key === currentBasemap) || BASEMAP_OPTIONS[0];
    tileLayerRef.current = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom
    }).addTo(map);
  }, [currentBasemap]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    wilayas.forEach(w => {
      const c = getColorBySector(w, currentSector);
      const r = getSizeBySector(w, currentSector);
      const anom = detectAnomaly(w);

      const marker = L.circleMarker([w.lat, w.lon], {
        radius: r,
        color: c,
        fillColor: c,
        fillOpacity: 0.65,
        weight: selectedWilaya.num === w.num ? 4 : 2
      }).addTo(map);

      const geo = classifyWilayaGeoZone(w);
      const pw = predictWater(w, targetYear);
      const cr = cropRisk(w, targetYear);
      const ug = urbanGrowth(w, targetYear);
      const indScore = industryScore(w);
      const lv = riskOf(w, targetYear);
      const rLab = riskLabel(lv, isAr ? 'ar' : 'en');
      const covGap = Math.max(0, 100 - w.coverage);

      const popupContent = `
        <div
          data-wilaya-card="${w.num}"
          style="font-family: inherit; direction: ${isAr ? 'rtl' : 'ltr'}; text-align: ${isAr ? 'right' : 'left'}; min-width: 265px; max-width: 310px; cursor: pointer;"
          title="${isAr ? 'اضغط لعرض كل المعلومات التفصيلية للولاية' : 'Click to open full wilaya dossier'}"
        >
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:6px; margin-bottom:6px;">
            <div>
              <b style="font-size: 14px; color: #38BDF8;">${w.num}. ${isAr ? w.n : w.en}</b>
              <div style="font-size: 10px; color: #94A3B8;">${isAr ? w.en : w.n} · ${isAr ? geo.labelAr : geo.label}</div>
            </div>
            <span style="font-size:10px; font-weight:700; padding:2px 6px; border-radius:6px; background:rgba(255,255,255,0.08); color:${c}; white-space:nowrap;">${rLab}</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px 10px; font-size:11px; color:#CBD5E1; line-height:1.45;">
            <div>👥 ${isAr ? 'السكان:' : 'Pop:'} <b style="color:#fff;">${w.pop.toLocaleString()}k</b></div>
            <div>🏠 ${isAr ? 'العقار:' : 'Price:'} <b style="color:#fff;">${(w.price / 1000).toFixed(0)}k DZD</b></div>
            <div>💧 ${isAr ? `مياه ${targetYear}:` : `Water ${targetYear}:`} <b style="color:${pw < -150 ? '#F87171' : '#38BDF8'};">${pw}</b></div>
            <div>🌧️ ${isAr ? 'الأمطار:' : 'Rain:'} <b style="color:#fff;">${w.rain} mm</b></div>
            <div>🌾 ${isAr ? 'التربة / NDVI:' : 'Soil / NDVI:'} <b style="color:#34D399;">${w.soil} / ${w.ndvi.toFixed(2)}</b></div>
            <div>🏜️ ${isAr ? 'جفاف:' : 'Drought:'} <b style="color:#FBBF24;">${cr}%</b></div>
            <div>🌊 ${isAr ? 'فيضان:' : 'Flood:'} <b style="color:#F87171;">${Math.round(w.flood * 100)}%</b></div>
            <div>🏗️ ${isAr ? 'توسع:' : 'Urban:'} <b style="color:#fff;">+${ug}%</b></div>
            <div>🛒 ${isAr ? 'التغطية:' : 'Coverage:'} <b style="color:#fff;">${w.coverage}% (-${covGap}%)</b></div>
            <div>🏭 ${isAr ? 'صناعة:' : 'Industry:'} <b style="color:#A78BFA;">${indScore}/100</b></div>
            <div>🧱 ${isAr ? 'السدود/الآبار:' : 'Dams/Wells:'} <b style="color:#fff;">${w.dams} / ${w.wells}</b></div>
            <div>⚡ ${isAr ? 'طاقة/طرق:' : 'Power/Roads:'} <b style="color:#fff;">${w.energy}/${w.roads}</b></div>
          </div>

          ${anom && showAnomalies ? `<div style="margin-top: 6px; font-size: 10.5px; color: #FBBF24; background: rgba(245,158,11,0.12); padding: 4px 6px; border-radius: 5px;">⚠️ ${anom}</div>` : ''}

          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); text-align:center;">
            <span style="display:inline-block; width:100%; background:linear-gradient(90deg, #0284C7, #10B981); color:#fff; font-weight:700; font-size:11px; padding:5px 8px; border-radius:6px;">
              ${isAr ? '📋 اضغط لعرض كل المعلومات والتشخيص الكامل (18 مؤشراً)' : '📋 Click to view all wilaya details (18 indicators)'}
            </span>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 340 });
      marker.on('click', () => {
        onSelectWilaya(w);
      });
      marker.on('popupopen', (e) => {
        const popupEl = e.popup.getElement();
        const card = popupEl?.querySelector(`[data-wilaya-card="${w.num}"]`);
        if (card) {
          (card as HTMLElement).onclick = () => {
            onSelectWilaya(w);
            setDossierWilaya(w);
          };
        }
      });

      markersRef.current[w.en] = marker;
    });
  }, [wilayas, currentSector, targetYear, showAnomalies, isAr, selectedWilaya]);

  // Center on selected wilaya & open popup (plus scroll into view when navigated from another tab)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedWilaya) return;

    const timer = window.setTimeout(() => {
      map.invalidateSize();
      if (focusRequest && focusRequest.wilayaNum === selectedWilaya.num && mapContainerRef.current) {
        mapContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const targetName = selectedWilaya.en;
      const targetLatLng = L.latLng(selectedWilaya.lat, selectedWilaya.lon);
      const alreadyAtTarget = map.getCenter().distanceTo(targetLatLng) < 500 && map.getZoom() === 7;
      if (alreadyAtTarget) {
        markersRef.current[targetName]?.openPopup();
      } else {
        map.once('moveend', () => {
          markersRef.current[targetName]?.openPopup();
        });
        map.flyTo([selectedWilaya.lat, selectedWilaya.lon], 7, {
          duration: 0.9
        });
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [selectedWilaya, focusRequest]);

  // Draw Interactive Charts (Trajectory + National-Benchmarked Radar)
  useEffect(() => {
    if (!selectedWilaya) return;

    // 1. Multi-Metric Historical + Projected Forecast Chart (2020–2035)
    if (chartWaterRef.current) {
      if (chartWaterInstance.current) chartWaterInstance.current.destroy();

      const ctx = chartWaterRef.current.getContext('2d');
      const histYears = (selectedWilaya.historicalYears ?? [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]).slice(-4); // 2022-2025
      const projYears = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
      const allYears = [...histYears, ...projYears];

      const getHistSeries = () => {
        if (chartMetric === 'rain') return (selectedWilaya.historicalRain ?? Array(8).fill(selectedWilaya.rain)).slice(-4).map(v => Math.round(v));
        if (chartMetric === 'price') return (selectedWilaya.historicalPrice ?? Array(8).fill(selectedWilaya.price)).slice(-4).map(v => Math.round(v));
        if (chartMetric === 'pop') return (selectedWilaya.historicalPop ?? Array(8).fill(selectedWilaya.pop)).slice(-4).map(v => Math.round(v));
        return (selectedWilaya.historicalWaterDef ?? Array(8).fill(selectedWilaya.waterDef)).slice(-4).map(v => Math.round(v * 10));
      };

      const getProjValue = (y: number) => {
        const h = y - 2025;
        if (chartMetric === 'rain') {
          return Math.max(10, Math.round(selectedWilaya.rain * Math.pow(0.989, h)));
        }
        if (chartMetric === 'price') {
          return Math.round(selectedWilaya.price * Math.pow(1.028 + (selectedWilaya.industry / 100) * 0.012, h));
        }
        if (chartMetric === 'pop') {
          return Math.round(selectedWilaya.pop * Math.pow(selectedWilaya.region === 'Sahara' ? 1.019 : 1.015, h));
        }
        return Math.round(
          selectedWilaya.waterDef * 10 - (selectedWilaya.pop * 0.035 * Math.max(0, y - 2026)) * 0.15 - (selectedWilaya.rain * 0.012 * Math.max(0, y - 2026)) * 0.2
        );
      };

      const histVals = getHistSeries();
      const projVals = projYears.map(getProjValue);

      const histDataset = [...histVals, ...projYears.map(() => null)];
      const projDataset: (number | null)[] = histVals.map((_, idx) => (idx === histVals.length - 1 ? histVals[histVals.length - 1] : null));
      projDataset.push(...projVals);

      const metricPalette: Record<typeof chartMetric, { line: string; fillTop: string; unit: string }> = {
        waterDef: { line: '#38BDF8', fillTop: 'rgba(56, 189, 248, 0.35)', unit: '' },
        rain: { line: '#10B981', fillTop: 'rgba(16, 185, 129, 0.35)', unit: ' mm' },
        price: { line: '#F59E0B', fillTop: 'rgba(245, 158, 11, 0.35)', unit: ' DZD' },
        pop: { line: '#A78BFA', fillTop: 'rgba(167, 139, 250, 0.35)', unit: 'k' }
      };
      const pal = metricPalette[chartMetric];

      let gradient: CanvasGradient | string = pal.fillTop;
      if (ctx) {
        const g = ctx.createLinearGradient(0, 0, 0, 175);
        g.addColorStop(0, pal.fillTop);
        g.addColorStop(1, 'rgba(8, 16, 32, 0.0)');
        gradient = g;
      }

      const pointRadii = allYears.map(y => (y === targetYear ? 6 : 2.5));
      const pointColors = allYears.map(y => (y === targetYear ? '#FBBF24' : pal.line));
      const pointBorders = allYears.map(y => (y === targetYear ? '#FFFFFF' : pal.line));

      chartWaterInstance.current = new ChartJS(chartWaterRef.current, {
        type: 'line',
        data: {
          labels: allYears,
          datasets: [
            {
              label: isAr ? 'التاريخي (2022–2025)' : 'Observed (2022–2025)',
              data: histDataset,
              borderColor: '#94A3B8',
              backgroundColor: 'transparent',
              borderWidth: 2,
              pointRadius: 3,
              pointBackgroundColor: '#CBD5E1',
              tension: 0.3
            },
            {
              label: isAr ? 'التوقع (2026–2035)' : 'Forecast (2026–2035)',
              data: projDataset,
              borderColor: pal.line,
              backgroundColor: gradient,
              fill: true,
              borderWidth: 2.5,
              borderDash: [4, 3],
              tension: 0.35,
              pointRadius: pointRadii,
              pointHoverRadius: 7,
              pointBackgroundColor: pointColors,
              pointBorderColor: pointBorders,
              pointBorderWidth: 1.5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(7, 13, 27, 0.95)',
              titleColor: '#F8FAFC',
              bodyColor: '#CBD5E1',
              borderColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
              padding: 10,
              displayColors: true,
              callbacks: {
                title: (items) => {
                  const yr = Number(items[0]?.label);
                  const suffix = yr === targetYear ? (isAr ? ' ★ السنة المستهدفة' : ' ★ Target Horizon') : '';
                  return `${isAr ? selectedWilaya.n : selectedWilaya.en} — ${yr}${suffix}`;
                },
                label: (ctxItem) => {
                  if (ctxItem.parsed.y === null || ctxItem.parsed.y === undefined) return '';
                  const val = ctxItem.parsed.y;
                  const formatted = chartMetric === 'price' ? val.toLocaleString() : val;
                  return ` ${ctxItem.dataset.label}: ${formatted}${pal.unit}`;
                }
              }
            }
          },
          scales: {
            x: {
              ticks: {
                color: (c) => (Number(allYears[c.index]) === targetYear ? '#FBBF24' : '#94A3B8'),
                font: (c) => ({ size: 10, weight: Number(allYears[c.index]) === targetYear ? 'bold' : 'normal' }),
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 7
              },
              grid: { color: 'rgba(255,255,255,0.04)' }
            },
            y: {
              ticks: {
                color: '#94A3B8',
                font: { size: 10 },
                maxTicksLimit: 5,
                callback: (val) => {
                  const n = Number(val);
                  if (chartMetric === 'price') return `${Math.round(n / 1000)}k`;
                  return `\u200E${n}`; // force LTR sign placement in RTL mode
                }
              },
              grid: { color: 'rgba(255,255,255,0.06)' }
            }
          }
        }
      });
    }

    // 2. Multi-Sector Radar Chart with National Mean Benchmark Overlay
    if (chartRadarRef.current) {
      if (chartRadarInstance.current) chartRadarInstance.current.destroy();

      const radarLabels = isAr
        ? ['التربة', 'الأمطار', 'NDVI', 'الطاقة', 'الطرق', 'التغطية']
        : ['Soil', 'Rain', 'NDVI', 'Energy', 'Roads', 'Coverage'];

      const clamp100 = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

      const radarData = [
        clamp100(selectedWilaya.soil),
        clamp100(selectedWilaya.rain / 10),
        clamp100(selectedWilaya.ndvi * 100),
        clamp100(selectedWilaya.energy),
        clamp100(selectedWilaya.roads),
        clamp100(selectedWilaya.coverage)
      ];

      const nCount = Math.max(1, wilayas.length);
      const natAvgData = [
        clamp100(wilayas.reduce((s, x) => s + x.soil, 0) / nCount),
        clamp100(wilayas.reduce((s, x) => s + x.rain / 10, 0) / nCount),
        clamp100(wilayas.reduce((s, x) => s + x.ndvi * 100, 0) / nCount),
        clamp100(wilayas.reduce((s, x) => s + x.energy, 0) / nCount),
        clamp100(wilayas.reduce((s, x) => s + x.roads, 0) / nCount),
        clamp100(wilayas.reduce((s, x) => s + x.coverage, 0) / nCount)
      ];

      const rawFormats = [
        (v: number) => `${v}/100`,
        (v: number) => `${v * 10} mm`,
        (v: number) => `${(v / 100).toFixed(2)}`,
        (v: number) => `${v}%`,
        (v: number) => `${v}%`,
        (v: number) => `${v}%`
      ];

      const datasets: any[] = [
        {
          label: isAr ? selectedWilaya.n : selectedWilaya.en,
          data: radarData,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.24)',
          borderWidth: 2.5,
          pointBackgroundColor: '#FBBF24',
          pointBorderColor: '#081020',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ];

      if (showRadarBenchmark) {
        datasets.push({
          label: isAr ? 'المتوسط الوطني' : 'National Mean',
          data: natAvgData,
          borderColor: '#38BDF8',
          backgroundColor: 'rgba(56, 189, 248, 0.08)',
          borderWidth: 1.8,
          borderDash: [4, 3],
          pointBackgroundColor: '#38BDF8',
          pointRadius: 2.5,
          pointHoverRadius: 4
        });
      }

      chartRadarInstance.current = new ChartJS(chartRadarRef.current, {
        type: 'radar',
        data: {
          labels: radarLabels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 4, bottom: 4, left: 6, right: 6 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(7, 13, 27, 0.95)',
              titleColor: '#F8FAFC',
              bodyColor: '#CBD5E1',
              borderColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
              padding: 9,
              callbacks: {
                label: (ctxItem) => {
                  const idx = ctxItem.dataIndex;
                  const val = Math.round(ctxItem.parsed.r);
                  const fmt = rawFormats[idx] ? rawFormats[idx](val) : `${val}`;
                  return ` ${ctxItem.dataset.label}: ${fmt}`;
                }
              }
            }
          },
          scales: {
            r: {
              min: 0,
              max: 100,
              angleLines: { color: 'rgba(255,255,255,0.1)' },
              grid: { color: 'rgba(255,255,255,0.09)', circular: true },
              pointLabels: {
                color: '#E2E8F0',
                font: { size: 11, weight: 'bold' },
                padding: 6
              },
              ticks: {
                stepSize: 50,
                display: true,
                backdropColor: 'transparent',
                color: 'rgba(148, 163, 184, 0.55)',
                font: { size: 8 }
              }
            }
          }
        }
      });
    }

    return () => {
      if (chartWaterInstance.current) chartWaterInstance.current.destroy();
      if (chartRadarInstance.current) chartRadarInstance.current.destroy();
    };
  }, [selectedWilaya, wilayas, targetYear, chartMetric, showRadarBenchmark, isAr]);

  // Aggregate National KPIs
  const horizon = targetYear - 2026;
  const avgWaterDeficit = Math.round(
    wilayas.reduce((acc, w) => acc + (w.waterDef * 10 - (w.pop * 0.035 * horizon) * 0.15 - (w.rain * 0.012 * horizon) * 0.2), 0) / wilayas.length
  );
  const thirstRiskCount = wilayas.filter(w => (w.waterDef * 10 - (w.pop * 0.035 * horizon) * 0.15) < -20).length;
  const droughtRiskCount = wilayas.filter(w => (100 - (w.soil * 0.5 + w.rain * 0.06 + w.ndvi * 60) + horizon * 2.1) > 60).length;
  const retailGapCount = wilayas.filter(w => (100 - w.coverage) > 30).length;

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Aside: Layer Controls & KPIs */}
      <aside className="lg:col-span-3 space-y-4">
        {/* Layer Toggles */}
        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg">
          <div className="flex items-center gap-2 mb-3 text-slate-200 font-bold text-sm">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>{isAr ? 'طبقات نظم المعلومات الجغرافية' : 'GIS Layers'}</span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={activeLayers.realestate}
                onChange={(e) => setActiveLayers({ ...activeLayers, realestate: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              <span>{isAr ? '🏠 العقار: أسعار، فيضانات، وتوسع' : '🏠 Real Estate: Prices & flood risk'}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={activeLayers.agri}
                onChange={(e) => setActiveLayers({ ...activeLayers, agri: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              <span>{isAr ? '🌾 الفلاحة: التربة، الأمطار، وNDVI' : '🌾 Agriculture: Soil, rain, NDVI'}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={activeLayers.water}
                onChange={(e) => setActiveLayers({ ...activeLayers, water: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              <span>{isAr ? '💧 المياه: السدود، الآبار، والعجز' : '💧 Water: Dams, wells, deficit'}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={activeLayers.commerce}
                onChange={(e) => setActiveLayers({ ...activeLayers, commerce: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              <span>{isAr ? '🛒 التجارة: الأسواق وفجوات التغطية' : '🛒 Retail: Markets & coverage'}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={activeLayers.industry}
                onChange={(e) => setActiveLayers({ ...activeLayers, industry: e.target.checked })}
                className="rounded accent-emerald-500"
              />
              <span>{isAr ? '🏭 الصناعة: الطاقة، الطرق، واليد العاملة' : '🏭 Industry: Energy, roads, labor'}</span>
            </label>
          </div>

          <hr className="my-3 border-white/10" />

          {/* Free Basemaps from Legacy App */}
          <div className="pt-1">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-slate-200 font-bold text-xs">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>{isAr ? 'خريطة الأساس (بدون مفتاح API)' : 'Basemap (No API Key)'}</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                {isAr ? 'التطبيق القديم' : 'Legacy OSM'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {BASEMAP_OPTIONS.map((b) => (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => setCurrentBasemap(b.key)}
                  className={`px-2 py-1.5 rounded text-[11px] text-start transition-all border ${
                    currentBasemap === b.key
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow'
                      : 'bg-[#121F3D] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/20'
                  }`}
                >
                  {isAr ? b.shortLabelAr : b.shortLabelEn}
                </button>
              ))}
            </div>
          </div>

          <hr className="my-3 border-white/10" />

          {/* AI Feature Toggles */}
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white">
              <input
                type="checkbox"
                checked={showAnomalies}
                onChange={(e) => setShowAnomalies(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span className="font-semibold text-amber-300">
                {isAr ? '⚠️ إظهار الشذوذات المكتشفة بالذكاء' : '⚠️ Flag statistical anomalies'}
              </span>
            </label>
          </div>

          <hr className="my-3 border-white/10" />

          {/* Map Legend (Pure SVG circles matching Leaflet map SVG markers 1:1 — immune to mobile CSS hue shifts) */}
          <div className="text-xs space-y-2.5">
            <div className="font-bold text-slate-300">
              {isAr ? `دليل الألوان (${targetYear})` : `Map Legend (${targetYear})`}
            </div>
            <div className="flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#10B981" fillOpacity="0.85" stroke="#10B981" strokeWidth="2" />
              </svg>
              <span className="text-slate-300 font-medium">{isAr ? 'مستقر / آمن / جيد' : 'Safe / Good / Stable'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  fill={currentSector === 'agri' ? '#EAB308' : '#F59E0B'}
                  fillOpacity="0.85"
                  stroke={currentSector === 'agri' ? '#EAB308' : '#F59E0B'}
                  strokeWidth="2"
                />
              </svg>
              <span className="text-slate-300 font-medium">{isAr ? 'تحت المراقبة / متوسط' : 'Watch / Moderate Risk'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <svg width="24" height="24" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" fill="#EF4444" fillOpacity="0.85" stroke="#EF4444" strokeWidth="2" />
              </svg>
              <span className="text-slate-300 font-medium">{isAr ? 'أولوية قصوى / خطر حرج' : 'Priority Risk / Critical'}</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {isAr ? 'حجم الدائرة يتناسب مع كثافة المؤشر' : 'Circle radius reflects indicator intensity'}
            </p>
          </div>
        </div>

        {/* Dynamic National KPIs */}
        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <div className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <span>{isAr ? `المؤشرات الوطنية المركبة (${targetYear})` : `National Macro KPIs (${targetYear})`}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <b className="text-base text-sky-400">{avgWaterDeficit}</b>
              <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">
                {isAr ? 'متوسط العجز المائي' : 'Avg Water Deficit'}
              </span>
            </div>

            <div className="bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <b className="text-base text-rose-400">{thirstRiskCount}</b>
              <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">
                {isAr ? 'ولايات في خطر عطش' : 'Thirst-Risk Wilayas'}
              </span>
            </div>

            <div className="bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <b className="text-base text-amber-400">{droughtRiskCount}</b>
              <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">
                {isAr ? 'ولايات مهددة بالجفاف' : 'Drought-Risk Wilayas'}
              </span>
            </div>

            <div className="bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <b className="text-base text-purple-400">{retailGapCount}</b>
              <span className="block text-[10px] text-slate-400 leading-tight mt-0.5">
                {isAr ? 'مناطق فجوة تجارية' : 'Retail-Gap Areas'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Center: Map Area */}
      <section className="lg:col-span-6 bg-[#0D172E] border border-white/10 rounded-xl overflow-hidden shadow-2xl relative flex flex-col min-h-[550px] lg:min-h-[640px]">
        {/* Floating Basemap Selector on Map */}
        <div className="absolute top-3 right-3 z-[400] bg-[#070D1B]/95 backdrop-blur-md border border-white/15 rounded-lg p-1.5 shadow-xl flex items-center gap-1.5 text-xs">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] text-slate-300 font-medium hidden sm:inline">
            {isAr ? 'خريطة الأساس:' : 'Basemap:'}
          </span>
          <select
            value={currentBasemap}
            onChange={(e) => setCurrentBasemap(e.target.value as BasemapKey)}
            className="bg-[#0D172E] border border-white/20 text-slate-100 text-xs rounded px-2 py-1 outline-none focus:border-emerald-500 cursor-pointer"
          >
            {BASEMAP_OPTIONS.map((b) => (
              <option key={b.key} value={b.key}>
                {isAr ? b.labelAr : b.labelEn}
              </option>
            ))}
          </select>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
            {isAr ? 'مجاني بدون API' : 'Free / No Key'}
          </span>
        </div>

        <div ref={mapContainerRef} className="w-full flex-1 z-0" />
        
        {/* Map Bottom Hint */}
        <div className="bg-[#0B1428]/90 border-t border-white/10 px-4 py-2 text-xs text-slate-300 flex items-center justify-between z-10 backdrop-blur-sm">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>
              {isAr
                ? `اضغط على أي ولاية على الخريطة لعرض التشخيص الاستشرافي والمخططات`
                : 'Click any wilaya marker to view spatial diagnosis and forecast'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('import')}
              className="flex items-center gap-1 text-[11px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-lg cursor-pointer transition font-bold"
            >
              <span>📥</span>
              <span>{isAr ? 'استيراد بيانات الخريطة' : 'Import Map Data'}</span>
            </button>
            <span className="text-[11px] text-slate-400 font-mono">
              {isAr ? `${wilayas.length} موقع مسجل` : `${wilayas.length} locations`}
            </span>
          </div>
        </div>
      </section>

      {/* Right Aside: Wilaya Detail Panel & Action Center */}
      <aside className="lg:col-span-3 space-y-4">
        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <div className="border-b border-white/10 pb-2">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                <span>{selectedWilaya.num}. {isAr ? selectedWilaya.n : selectedWilaya.en}</span>
              </h2>
              <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded font-bold">
                {selectedWilaya.region || 'Algeria'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {isAr ? `${selectedWilaya.en} — خط العرض: ${selectedWilaya.lat}°، خط الطول: ${selectedWilaya.lon}°` : `${selectedWilaya.n} — Lat: ${selectedWilaya.lat}°, Lon: ${selectedWilaya.lon}°`}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="text-xs space-y-1 text-slate-300 bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
            <div className="flex justify-between">
              <span>{isAr ? 'السكان:' : 'Population:'}</span>
              <b>{selectedWilaya.pop.toLocaleString()} k</b>
            </div>
            <div className="flex justify-between">
              <span>{isAr ? 'سعر العقار:' : 'Price/m²:'}</span>
              <b>{selectedWilaya.price.toLocaleString()} DZD</b>
            </div>
            <div className="flex justify-between">
              <span>{isAr ? 'التساقط السنوي:' : 'Rainfall:'}</span>
              <b>{selectedWilaya.rain} mm</b>
            </div>
            <div className="flex justify-between">
              <span>{isAr ? 'السدود / الآبار:' : 'Dams / Wells:'}</span>
              <b>{selectedWilaya.dams} / {selectedWilaya.wells}</b>
            </div>
            <div className="flex justify-between">
              <span>{isAr ? 'التغطية التجارية:' : 'Coverage:'}</span>
              <b>{selectedWilaya.coverage}%</b>
            </div>
          </div>

          {/* Upgraded Interactive Charts Container */}
          <div className="space-y-3 pt-1">
            {/* Card 1: Interactive Forecast Line Chart */}
            <div className="bg-[#081020] p-3 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    {chartMetric === 'waterDef'
                      ? isAr ? `العجز المائي (${selectedWilaya.n})` : `Water Trajectory (${selectedWilaya.en})`
                      : chartMetric === 'rain'
                      ? isAr ? `التساقط (${selectedWilaya.n})` : `Rainfall mm (${selectedWilaya.en})`
                      : chartMetric === 'price'
                      ? isAr ? `العقار دج/م² (${selectedWilaya.n})` : `Land Price (${selectedWilaya.en})`
                      : isAr ? `السكان ألف (${selectedWilaya.n})` : `Population k (${selectedWilaya.en})`}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0">
                  ★ {targetYear}
                </span>
              </div>

              {/* Interactive Metric Switcher */}
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {[
                  { id: 'waterDef' as const, ar: '💧 المياه', en: '💧 Water' },
                  { id: 'rain' as const, ar: '🌧️ المطر', en: '🌧️ Rain' },
                  { id: 'price' as const, ar: '🏠 العقار', en: '🏠 Price' },
                  { id: 'pop' as const, ar: '👥 السكان', en: '👥 Pop' }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChartMetric(m.id)}
                    className={`py-1 rounded font-semibold transition cursor-pointer ${
                      chartMetric === m.id
                        ? 'bg-sky-500/25 text-sky-300 border border-sky-500/40'
                        : 'bg-[#101C36] text-slate-400 hover:text-slate-200 border border-white/5'
                    }`}
                  >
                    {isAr ? m.ar : m.en}
                  </button>
                ))}
              </div>

              <div className="h-44 w-full">
                <canvas ref={chartWaterRef} />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-white/5">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-slate-400 inline-block" />
                  <span>{isAr ? 'فعلي 22–25' : 'Actual 22–25'}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-sky-400 inline-block border-t border-dashed" />
                  <span>{isAr ? 'استشراف 26–35' : 'Forecast 26–35'}</span>
                </span>
              </div>
            </div>

            {/* Card 2: Interactive Multi-Sector Radar vs National Mean */}
            <div className="bg-[#081020] p-3 rounded-xl border border-white/10 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shrink-0" />
                    {isAr ? selectedWilaya.n : selectedWilaya.en}
                  </span>
                  {showRadarBenchmark && (
                    <span className="flex items-center gap-1 text-[10px] text-sky-300 shrink-0">
                      <span className="w-2 h-2 rounded-full border border-sky-400 inline-block" />
                      {isAr ? 'الوطني' : 'Nat. Avg'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setShowRadarBenchmark(b => !b)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition cursor-pointer shrink-0 ${
                    showRadarBenchmark
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-[#101C36] text-slate-400 border-white/10'
                  }`}
                >
                  {isAr ? 'مقارنة وطنية' : 'Benchmark'}
                </button>
              </div>

              <div className="h-52 w-full">
                <canvas ref={chartRadarRef} />
              </div>
            </div>
          </div>

          {/* Wilaya-Specific Mini AI Diagnosis Box */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-lg text-xs space-y-1">
            <div className="font-bold text-emerald-400 flex items-center gap-1">
              <span>🤖</span>
              <span>{isAr ? `تشخيص ${selectedWilaya.n} (${targetYear})` : `${selectedWilaya.en} Diagnosis (${targetYear})`}</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {detectAnomaly(selectedWilaya)
                ? `⚠️ ${detectAnomaly(selectedWilaya)}`
                : isAr
                ? `${selectedWilaya.n}: تربة ${selectedWilaya.soil}/100 وNDVI ${selectedWilaya.ndvi} مع ${selectedWilaya.dams} سدود و${selectedWilaya.wells} بئراً (عجز ${selectedWilaya.waterDef})؛ التغطية ${selectedWilaya.coverage}%.`
                : `${selectedWilaya.en}: Soil ${selectedWilaya.soil}/100, NDVI ${selectedWilaya.ndvi}, ${selectedWilaya.dams} dams & ${selectedWilaya.wells} wells (water ${selectedWilaya.waterDef}); ${selectedWilaya.coverage}% market coverage.`}
            </p>
          </div>

          {/* Interactive Action Triggers */}
          <div className="space-y-1.5 pt-1">
            <button
              type="button"
              onClick={() => setDossierWilaya(selectedWilaya)}
              className="w-full text-center bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-white/20 text-xs px-3 py-2 rounded-lg font-bold shadow transition cursor-pointer flex items-center justify-center gap-2"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-100" />
              <span>{isAr ? '📋 عرض كل معلومات الولاية (18 مؤشراً)' : '📋 View Full Wilaya Info (18 Indicators)'}</span>
            </button>

            {onOpenReport && (
              <button
                type="button"
                onClick={onOpenReport}
                className="w-full text-center bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white border border-white/20 text-xs px-3 py-2 rounded-lg font-bold shadow transition cursor-pointer flex items-center justify-center gap-2 mb-2"
              >
                <FileText className="w-3.5 h-3.5 text-sky-200" />
                <span>{isAr ? '📄 توليد التقرير الاستراتيجي المفصّل' : 'Generate Detailed Strategic Report'}</span>
              </button>
            )}
            <button
              onClick={() => {
                setActionAlert(isAr
                  ? `تم تحديد موقع حضري آمن خارج مجاري الأودية في ${selectedWilaya.n} ✅`
                  : `Safe urban infill district earmarked in ${selectedWilaya.en} outside flood plain ✅`);
              }}
              className="w-full text-left rtl:text-right bg-[#142345] hover:bg-[#1B2F5C] text-slate-200 border border-white/10 text-xs px-3 py-2 rounded-lg font-semibold transition cursor-pointer flex items-center gap-2"
            >
              <span>🏠</span>
              <span>{isAr ? 'اقتراح قطب حضري آمن' : 'Propose safe new district'}</span>
            </button>

            <button
              onClick={() => {
                setActionAlert(isAr
                  ? `تم تحديد موقع بئر عميق ومحطة معالجة في ${selectedWilaya.n} لعلاج العجز (${selectedWilaya.waterDef}) 💧`
                  : `Deep borehole & desalination connection pinpointed in ${selectedWilaya.en} 💧`);
              }}
              className="w-full text-left rtl:text-right bg-[#142345] hover:bg-[#1B2F5C] text-slate-200 border border-white/10 text-xs px-3 py-2 rounded-lg font-semibold transition cursor-pointer flex items-center gap-2"
            >
              <span>💧</span>
              <span>{isAr ? 'تحديد موقع تحلية / حفر بئر' : 'Locate drilling / desalination'}</span>
            </button>

            <button
              onClick={() => {
                setActionAlert(isAr
                  ? `تم اقتراح إنشاء سوق جملة ومستودع تبريد في ${selectedWilaya.n} لسد فجوة ${Math.max(0, 100 - selectedWilaya.coverage)}% 🛒`
                  : `Wholesale market hub sited in ${selectedWilaya.en} to close ${Math.max(0, 100 - selectedWilaya.coverage)}% coverage gap 🛒`);
              }}
              className="w-full text-left rtl:text-right bg-[#142345] hover:bg-[#1B2F5C] text-slate-200 border border-white/10 text-xs px-3 py-2 rounded-lg font-semibold transition cursor-pointer flex items-center gap-2"
            >
              <span>🛒</span>
              <span>{isAr ? 'اقتراح سوق جملة وتوزيع' : 'Propose new market depot'}</span>
            </button>
          </div>

          {/* Action Notification Toast */}
          {actionAlert && (
            <div className="bg-emerald-500/20 border border-emerald-500 text-emerald-300 p-2.5 rounded-lg text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{actionAlert}</span>
            </div>
          )}
        </div>
      </aside>
    </div>

    {/* Complete Wilaya Information Dossier Modal (Opened when clicking popup card or full info button) */}
    {dossierWilaya && (() => {
      const dw = dossierWilaya;
      const dwGeo = classifyWilayaGeoZone(dw);
      const dwRisk = riskOf(dw, targetYear);
      const dwWaterPred = predictWater(dw, targetYear);
      const dwCropRisk = cropRisk(dw, targetYear);
      const dwUrbanGrowth = urbanGrowth(dw, targetYear);
      const dwIndScore = industryScore(dw);
      const dwAlerts = scanNationalEarlyWarnings(wilayas, targetYear, lang).filter(a => a.wilayaNum === dw.num);
      const dwPlan = generateActionPlan(dw, targetYear, lang);
      const histYears = dw.historicalYears ?? [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

      return (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setDossierWilaya(null)}
        >
          <div
            className="bg-[#0B152B] border border-white/15 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-[#0E1B38] px-5 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <MapPin className="w-5 h-5 text-sky-400" />
                  <h2 className="text-lg sm:text-xl font-black text-white font-['Sora']">
                    {dw.num}. {isAr ? `${dw.n} (${dw.en})` : `${dw.en} (${dw.n})`}
                  </h2>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {isAr ? dwGeo.labelAr : dwGeo.label}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                    dwRisk === 3 ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : dwRisk === 2 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : dwRisk === 1 ? 'bg-yellow-500/20 text-yellow-200 border border-yellow-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                    {riskLabel(dwRisk, lang)}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {isAr ? dwGeo.assetNoteAr : dwGeo.assetNote} · Lat {dw.lat}°, Lon {dw.lon}° · {isAr ? `أفق ${targetYear}` : `Horizon ${targetYear}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {onOpenReport && (
                  <button
                    type="button"
                    onClick={() => {
                      setDossierWilaya(null);
                      onOpenReport();
                    }}
                    className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>{isAr ? 'فتح التقرير القابل للطباعة' : 'Open Printable Report'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setDossierWilaya(null);
                    onNavigateTab('council');
                  }}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>{isAr ? 'مجلس الذكاء الاصطناعي' : 'AI Council'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDossierWilaya(null)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scroll Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
              {/* Horizon Summary Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-[#121F3D] border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">{isAr ? `العجز المائي ${targetYear}` : `Water Balance ${targetYear}`}</span>
                  <b className={`text-lg font-mono ${dwWaterPred < -150 ? 'text-rose-400' : 'text-sky-400'}`}>{dwWaterPred}</b>
                </div>
                <div className="bg-[#121F3D] border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">{isAr ? `خطر الجفاف ${targetYear}` : `Drought Risk ${targetYear}`}</span>
                  <b className="text-lg font-mono text-amber-400">{dwCropRisk}%</b>
                </div>
                <div className="bg-[#121F3D] border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">{isAr ? `التوسع العمراني ${targetYear}` : `Urban Growth ${targetYear}`}</span>
                  <b className="text-lg font-mono text-emerald-400">+{dwUrbanGrowth}%</b>
                </div>
                <div className="bg-[#121F3D] border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'الجاذبية الصناعية' : 'Industrial Score'}</span>
                  <b className="text-lg font-mono text-purple-400">{dwIndScore}/100</b>
                </div>
                <div className="bg-[#121F3D] border border-white/10 rounded-xl p-3">
                  <span className="text-[10px] text-slate-400 block">{isAr ? 'الملاءمة الفلاحية' : 'Agri Suitability'}</span>
                  <b className="text-[11px] text-emerald-300 leading-tight block mt-1">{suitabilityAgri(dw, lang)}</b>
                </div>
              </div>

              {/* All 18 Official Indicators Table */}
              <div className="bg-[#0E1B38] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
                  <b className="text-sm text-white">
                    {isAr ? 'جميع المؤشرات الرسمية للولاية (18 مؤشراً + الترتيب الوطني)' : 'Complete Wilaya Indicators (All 18 Metrics & National Ranking)'}
                  </b>
                  <span className="text-[11px] text-slate-400">{isAr ? `نطاق المقارنة: ${wilayas.length} ولاية` : `Benchmarked vs ${wilayas.length} wilayas`}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-start border-collapse text-xs">
                    <thead className="bg-[#091224] text-slate-400 text-[11px]">
                      <tr>
                        <th className="py-2 px-3 text-start">{isAr ? 'المؤشر' : 'Indicator'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'قيمة الولاية' : 'Wilaya Value'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'المتوسط الوطني' : 'Nat. Avg'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'الترتيب الوطني' : 'Rank'}</th>
                        <th className="py-2 px-3 text-start">{isAr ? 'التقييم مقارنة بالمعدل' : 'Status vs Avg'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {ALL_18_INDICATORS.map(ind => {
                        const getter =
                          ind.key === 'cropRisk'
                            ? (x: WilayaRecord) => cropRisk(x, targetYear)
                            : ind.key === 'urbanGrowth'
                            ? (x: WilayaRecord) => urbanGrowth(x, targetYear)
                            : ind.getValue;
                        const val = getter(dw);
                        const avg = calcNatAvg(wilayas, getter);
                        const rank = calcRankOf(wilayas, dw, getter, !ind.invertStatus);
                        const vsAvg = vsAvgText(val, avg, lang, ind.invertStatus);
                        const formattedVal =
                          ind.key === 'cropRisk' ? `${val}%` : ind.key === 'urbanGrowth' ? `+${val}%` : ind.format(dw);
                        const labelName = isAr
                          ? ind.nameAr.replace('2030', String(targetYear))
                          : ind.nameEn.replace('2030', String(targetYear));

                        return (
                          <tr key={ind.key} className="hover:bg-white/5">
                            <td className="py-2 px-3 font-semibold text-slate-200">{labelName}</td>
                            <td className="py-2 px-3 font-mono font-bold text-white">{formattedVal}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">
                              {ind.key === 'flood' ? `${Math.round(avg)}%` : ind.key === 'price' ? Math.round(avg).toLocaleString() : Math.round(avg * 10) / 10}
                            </td>
                            <td className="py-2 px-3 font-mono text-sky-300">{rank}</td>
                            <td className="py-2 px-3 text-slate-300">{vsAvg}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Historical Series (2018-2025) */}
              <div className="bg-[#0E1B38] border border-white/10 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-white/10">
                  <b className="text-sm text-white">
                    {isAr ? 'السلاسل الزمنية التاريخية للولاية (2018–2025)' : 'Wilaya Historical Time Series (2018–2025)'}
                  </b>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-center border-collapse text-[11px] font-mono">
                    <thead className="bg-[#091224] text-slate-400">
                      <tr>
                        <th className="py-2 px-3 text-start font-sans">{isAr ? 'المتغير' : 'Metric'}</th>
                        {histYears.map(y => <th key={y} className="py-2 px-2">{y}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr>
                        <td className="py-2 px-3 text-start font-sans text-sky-300 font-semibold">{isAr ? 'مؤشر المياه' : 'Water Index'}</td>
                        {(dw.historicalWaterDef ?? Array(8).fill(dw.waterDef)).map((v, i) => <td key={i} className="py-2 px-2 text-slate-200">{v}</td>)}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-start font-sans text-emerald-300 font-semibold">{isAr ? 'الأمطار (mm)' : 'Rain (mm)'}</td>
                        {(dw.historicalRain ?? Array(8).fill(dw.rain)).map((v, i) => <td key={i} className="py-2 px-2 text-slate-200">{Math.round(v)}</td>)}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-start font-sans text-amber-300 font-semibold">{isAr ? 'العقار (k DZD)' : 'Price (k DZD)'}</td>
                        {(dw.historicalPrice ?? Array(8).fill(dw.price)).map((v, i) => <td key={i} className="py-2 px-2 text-slate-200">{Math.round(v / 1000)}k</td>)}
                      </tr>
                      <tr>
                        <td className="py-2 px-3 text-start font-sans text-purple-300 font-semibold">{isAr ? 'السكان (k)' : 'Pop (k)'}</td>
                        {(dw.historicalPop ?? Array(8).fill(dw.pop)).map((v, i) => <td key={i} className="py-2 px-2 text-slate-200">{Math.round(v)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Active Multi-Horizon Warnings & Action Plan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-[#0E1B38] border border-white/10 rounded-xl p-4 space-y-2.5">
                  <b className="text-sm text-rose-300 block">
                    {isAr ? `تنبيهات الإنذار المبكر وبروتوكولات الاستجابة (${dwAlerts.length})` : `Active Early Warning Protocols (${dwAlerts.length})`}
                  </b>
                  {dwAlerts.length === 0 ? (
                    <p className="text-emerald-300 text-xs">{isAr ? 'لا توجد إنذارات حرجة مسجلة على هذه الولاية حالياً.' : 'No critical early warning alerts active for this wilaya.'}</p>
                  ) : (
                    dwAlerts.map(al => (
                      <div key={al.id} className="bg-[#091224] border border-white/10 rounded-lg p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <b className="text-white">{al.metric}</b>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">{al.severity} ({al.currentValue})</span>
                        </div>
                        {al.protocols && (
                          <div className="space-y-1 text-[11px] text-slate-300">
                            <div><b className="text-emerald-400">{isAr ? 'قصير:' : 'Short:'}</b> {isAr ? al.protocols.shortTermAr : al.protocols.shortTerm}</div>
                            <div><b className="text-sky-400">{isAr ? 'متوسط:' : 'Med:'}</b> {isAr ? al.protocols.mediumTermAr : al.protocols.mediumTerm}</div>
                            <div><b className="text-purple-400">{isAr ? 'طويل:' : 'Long:'}</b> {isAr ? al.protocols.longTermAr : al.protocols.longTerm}</div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="bg-[#0E1B38] border border-white/10 rounded-xl p-4 space-y-2.5">
                  <b className="text-sm text-emerald-300 block">
                    {isAr ? `خطة العمل القطاعية المرقمة (${targetYear})` : `Sectoral Operational Action Plan (${targetYear})`}
                  </b>
                  <div className="space-y-2">
                    {dwPlan.map((step, i) => (
                      <div key={i} className="bg-[#091224] border border-white/10 rounded-lg p-2.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">{step.priority}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{step.horizon} · {step.owner}</span>
                        </div>
                        <p className="text-slate-200 font-medium">{step.action}</p>
                        <p className="text-[11px] text-emerald-400">{step.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
};
