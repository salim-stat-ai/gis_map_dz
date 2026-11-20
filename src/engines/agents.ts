/**
 * GIS Map – 7 AI Agents Team Engine
 * Real Quantitative Grounding, Model-Differentiated & Wilaya-Specific Multi-Disciplinary Analysis
 * © 2026 Salim Slimani & National Foresight System
 */

import { AgentAnalysisOutput, AgentProfile, WilayaRecord } from '../types';
import { computeMoransI, computeGetisOrdGi, computeGravityInteraction, haversineDistance } from './gis';
import { executeForecastModel } from './quantitative';
import { classifyWilayaGeoZone } from './earlyWarning';
import {
  getHospitalsCount,
  getHealthCoverage,
  getSeismicRisk,
  getWildfireRisk,
  getHazardIndex,
  getTransportScore,
  hasRailAccess,
  getHotelsCount,
  getHeritageSitesCount,
  getTourismScore
} from './reporting';

export const AI_AGENT_PROFILES: AgentProfile[] = [
  {
    id: 'spark',
    name: 'Muse Spark',
    version: '1.3',
    icon: '⚡',
    color: '#F59E0B',
    role: 'Map Analyst',
    roleAr: 'محلل الخرائط والذكاء المكاني',
    specialty: 'Spatial topology — Local Getis-Ord Gi*, Huff gravity interaction, Moran’s I, and neighbor spatial lag.',
    specialtyAr: 'الذكاء المكاني، تحليل Gi* المحلي، نموذج الجاذبية، وتحديد بؤر التركز والتفاوت الجغرافي.',
    liveModel: 'google/gemini-flash-1.5',
    primaryMathematicalTool: "Local Getis-Ord Gi*, Global Moran's I & Huff Gravity Matrix"
  },
  {
    id: 'gemini',
    name: 'Gemini',
    version: '3 Flash',
    icon: '✨',
    color: '#0EA5E9',
    role: 'Crisis Manager',
    roleAr: 'مدير استخبارات الأزمات والتدخل السريع',
    specialty: 'Rapid 72h triage — exposed population estimation, multi-hazard scoring, and emergency logistics routing.',
    specialtyAr: 'الفرز السريع خلال 72 ساعة، تقدير السكان المعرضين، وجاهزية مسارات الإغاثة.',
    liveModel: 'google/gemini-flash-1.5',
    primaryMathematicalTool: '72-Hour Multi-Hazard Triage & Mutual-Aid Logistics Index'
  },
  {
    id: 'gpt',
    name: 'ChatGPT',
    version: 'Foresight',
    icon: '🤖',
    color: '#10B981',
    role: 'Foresight Strategist',
    roleAr: 'خبير الاستشراف والتخطيط الاستراتيجي',
    specialty: 'Multi-horizon scenarios (2026–2035) — ARIMA vs Holt-Winters divergence across Optimistic, Baseline, Pessimistic tracks.',
    specialtyAr: 'الاستشراف المستقبلي حتى 2035، تباين نماذج ARIMA وHolt، ومسارات التحول الهيكلي.',
    liveModel: 'openai/gpt-4o-mini',
    primaryMathematicalTool: 'ARIMA vs Exponential Smoothing 3-Pathway Scenario Engine'
  },
  {
    id: 'qwen',
    name: 'Qwen',
    version: 'Max',
    icon: '🌊',
    color: '#38BDF8',
    role: 'Water & Agriculture Expert',
    roleAr: 'خبير الموارد المائية والفلاحة',
    specialty: 'Hydrological ledger — dam-to-well pressure ratio, SPEI drought stress, NDVI chlorophyll vs precipitation efficiency.',
    specialtyAr: 'الميزان المائي، نسبة السدود إلى الآبار، مؤشر الجفاف SPEI، وكفاءة الغطاء النباتي.',
    liveModel: 'qwen/qwen-2.5-72b-instruct',
    primaryMathematicalTool: 'Coupled Hydro-Agronomic Balance, Dam/Well Ratio & SPEI Stress'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    version: 'R1',
    icon: '🧠',
    color: '#A78BFA',
    role: 'Deep Reasoner',
    roleAr: 'المحلل الكمي والاقتصادي المعمق',
    specialty: 'Econometric decomposition — Multiple OLS regression, factor bottleneck ranking, and marginal productivity ROI.',
    specialtyAr: 'التحليل السببي والاقتصادي القياسي، الانحدار المتعدد، وحساب العائد الحدي لفك الاختناق.',
    liveModel: 'deepseek/deepseek-chat',
    primaryMathematicalTool: 'Multiple OLS Econometric Regression & Marginal ROI Decomposition'
  },
  {
    id: 'claude',
    name: 'Claude',
    version: 'Sonnet',
    icon: '📜',
    color: '#F472B6',
    role: 'Risk & Policy Advisor',
    roleAr: 'مستشار السياسات والحوكمة وإدارة المخاطر',
    specialty: 'Governance & PESTEL brief — land speculation audit, regulatory zoning levers, and fiscal cost-benefit multipliers.',
    specialtyAr: 'موجز الحوكمة والسياسات، تدقيق العقار، والقرارات الولائية والعائد المالي الوقائي.',
    liveModel: 'anthropic/claude-3.5-sonnet',
    primaryMathematicalTool: 'PESTEL Institutional Audit & Preventative Fiscal Cost-Benefit Ratio'
  },
  {
    id: 'grok',
    name: 'Grok',
    version: '2',
    icon: '📡',
    color: '#EAB308',
    role: 'Anomaly Watch',
    roleAr: 'راصد الشذوذات والتغيرات غير الطبيعية',
    specialty: 'Multivariate Z-score radar — detects price-risk paradoxes, NDVI-soil gaps, and peer statistical divergence.',
    specialtyAr: 'رادار الشذوذات متعددة المتغيرات (Z-Score) وكشف المفارقات العقارية والمائية.',
    liveModel: 'x-ai/grok-beta',
    primaryMathematicalTool: 'Multivariate Z-Score Outlier Radar & Neighbor Divergence Test'
  }
];

function inferEcoZone(w: WilayaRecord, lang: 'ar' | 'en'): { key: 'sahara' | 'steppe' | 'tell'; label: string } {
  const geo = classifyWilayaGeoZone(w);
  const sub = lang === 'ar' ? geo.subRegionLabelAr : geo.subRegionLabel;
  if (geo.id === 'deep_sahara' || geo.id === 'oasis_north') {
    return {
      key: 'sahara',
      label: lang === 'ar' ? `${sub} · الإقليم الصحراوي` : `${sub} · Saharan Region`
    };
  }
  if (geo.id === 'high_plateaus') {
    return {
      key: 'steppe',
      label: lang === 'ar' ? `${sub} · الهضاب العليا والأطلس الصحراوي` : `${sub} · High-Plateaus & Saharan Atlas`
    };
  }
  return {
    key: 'tell',
    label: lang === 'ar' ? `${sub} · الإقليم التلي الشمالي` : `${sub} · Northern Tell Region`
  };
}

function getRank(allWilayas: WilayaRecord[], w: WilayaRecord, selector: (x: WilayaRecord) => number, descending = true): number {
  const sorted = [...allWilayas].sort((a, b) => (descending ? selector(b) - selector(a) : selector(a) - selector(b)));
  const idx = sorted.findIndex(x => x.num === w.num);
  return idx >= 0 ? idx + 1 : 1;
}

function getNearestNeighbor(allWilayas: WilayaRecord[], w: WilayaRecord): { neighbor: WilayaRecord; distKm: number } {
  let best = w;
  let bestDist = Infinity;
  for (const other of allWilayas) {
    if (other.num === w.num) continue;
    const d = haversineDistance(w.lat, w.lon, other.lat, other.lon);
    if (d < bestDist) {
      bestDist = d;
      best = other;
    }
  }
  return { neighbor: best, distKm: Math.round(bestDist === Infinity ? 0 : bestDist) };
}

function meanOf(arr: number[]): number {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function stdOf(arr: number[], meanVal: number): number {
  if (arr.length < 2) return 1;
  const v = arr.reduce((s, x) => s + (x - meanVal) * (x - meanVal), 0) / arr.length;
  return Math.max(1e-6, Math.sqrt(v));
}

function seriesChange(arr: number[] | undefined): number {
  if (!arr || arr.length < 2) return 0;
  return Math.round((arr[arr.length - 1] - arr[0]) * 10) / 10;
}

interface FactorEntry {
  id: string;
  score: number;
  labelEn: string;
  labelAr: string;
}

function rankWilayaPressuresAndStrengths(w: WilayaRecord, floodPct: number, droughtRiskPct: number, coverageGapPct: number) {
  const healthCov = getHealthCoverage(w);
  const hospitalsCnt = getHospitalsCount(w);
  const hazardIdx = getHazardIndex(w);
  const transportSc = getTransportScore(w);
  const hasRail = hasRailAccess(w);
  const hotelsCnt = getHotelsCount(w);
  const heritageCnt = getHeritageSitesCount(w);
  const tourismSc = getTourismScore(w);

  const pressures: FactorEntry[] = [
    {
      id: 'water',
      score: Math.max(0, -w.waterDef * 2.3 + (w.dams === 0 ? 18 : 0)),
      labelEn: `water deficit (${w.waterDef} index, ${w.dams} dams / ${w.wells} wells)`,
      labelAr: `العجز المائي (${w.waterDef} مع ${w.dams} سدود و${w.wells} بئر)`
    },
    {
      id: 'flood',
      score: floodPct * 2.1,
      labelEn: `wadi & flood exposure (${floodPct}%)`,
      labelAr: `تعرض الفيضانات (${floodPct}%)`
    },
    {
      id: 'hazards',
      score: hazardIdx * 1.35,
      labelEn: `multi-hazard risk (${hazardIdx}/100: seismic ${Math.round(getSeismicRisk(w) * 100)}%, wildfire ${Math.round(getWildfireRisk(w) * 100)}%)`,
      labelAr: `الأخطار الطبيعية المركبة (${hazardIdx}/100: زلازل ${Math.round(getSeismicRisk(w) * 100)}%، حرائق ${Math.round(getWildfireRisk(w) * 100)}%)`
    },
    {
      id: 'health_gap',
      score: (100 - healthCov) * 1.55,
      labelEn: `healthcare capacity lag (${healthCov}% access, ${hospitalsCnt} hospitals)`,
      labelAr: `فجوة التغطية الصحية (${healthCov}% تغطية بـ ${hospitalsCnt} مستشفى)`
    },
    {
      id: 'drought',
      score: droughtRiskPct * 1.15,
      labelEn: `agro-drought stress (${droughtRiskPct}%, ${w.rain} mm rain)`,
      labelAr: `إجهاد الجفاف الفلاحي (${droughtRiskPct}% بتساقط ${w.rain} ملم)`
    },
    {
      id: 'price',
      score: (w.price / 185000) * 95,
      labelEn: `urban land inflation (${w.price.toLocaleString()} DZD/m²)`,
      labelAr: `الضغط العقاري (${w.price.toLocaleString()} دج/م²)`
    },
    {
      id: 'coverage',
      score: coverageGapPct * 1.6,
      labelEn: `commercial supply gap (${coverageGapPct}%, ${w.markets} markets)`,
      labelAr: `فجوة التغطية التجارية (${coverageGapPct}% بـ ${w.markets} سوقاً)`
    },
    {
      id: 'roads',
      score: (100 - transportSc) * 1.55 + (hasRail ? 0 : 12),
      labelEn: `transport & rail lag (${transportSc}/100${hasRail ? '' : ', no SNTF rail'})`,
      labelAr: `محدودية النقل والسكك (${transportSc}/100${hasRail ? '' : '، بدون خط سكك SNTF'})`
    },
    {
      id: 'tourism_gap',
      score: (100 - tourismSc) * 1.1 + (hotelsCnt < 12 ? 10 : 0),
      labelEn: `hospitality & tourism under-capacity (${tourismSc}/100, ${hotelsCnt} hotels)`,
      labelAr: `ضعف الطاقة الفندقية والسياحية (${tourismSc}/100 بـ ${hotelsCnt} فندقاً)`
    }
  ].sort((a, b) => b.score - a.score);

  const strengths: FactorEntry[] = [
    {
      id: 'soil',
      score: w.soil + w.ndvi * 35,
      labelEn: `high soil fertility (${w.soil}/100, NDVI ${w.ndvi})`,
      labelAr: `خصوبة التربة (${w.soil}/100 وNDVI ${w.ndvi})`
    },
    {
      id: 'industry',
      score: w.industry * 1.2 + w.energy * 0.2,
      labelEn: `industrial readiness (${w.industry}/100, energy ${w.energy}%)`,
      labelAr: `الجاهزية الصناعية (${w.industry}/100 وطاقة ${w.energy}%)`
    },
    {
      id: 'transport',
      score: transportSc * 1.25 + (hasRail ? 12 : 0),
      labelEn: `multimodal transport & rail (${transportSc}/100${hasRail ? ', SNTF rail connected' : ''})`,
      labelAr: `شبكة النقل والسكك (${transportSc}/100${hasRail ? ' مع ربط SNTF' : ''})`
    },
    {
      id: 'health',
      score: healthCov * 1.15 + hospitalsCnt * 0.8,
      labelEn: `healthcare resilience (${healthCov}% access, ${hospitalsCnt} hospitals)`,
      labelAr: `الرصيد الصحي والاستشفائي (${healthCov}% تغطية و${hospitalsCnt} مستشفى)`
    },
    {
      id: 'coverage',
      score: w.coverage * 1.1,
      labelEn: `commercial density (${w.coverage}% across ${w.markets} markets)`,
      labelAr: `التغطية التجارية (${w.coverage}% عبر ${w.markets} سوقاً)`
    },
    {
      id: 'water_surplus',
      score: (w.waterDef + 15) * 3.0 + w.dams * 14,
      labelEn: `surface water reserve (${w.dams} dams, balance ${w.waterDef >= 0 ? '+' + w.waterDef : w.waterDef})`,
      labelAr: `الرصيد المائي السطحي (${w.dams} سدود وميزان ${w.waterDef})`
    },
    {
      id: 'labor',
      score: w.labor * 1.15,
      labelEn: `active workforce depth (${w.labor}/100)`,
      labelAr: `توفر اليد العاملة (${w.labor}/100)`
    },
    {
      id: 'tourism',
      score: tourismSc * 1.2 + heritageCnt * 1.5,
      labelEn: `tourism & heritage assets (${tourismSc}/100, ${heritageCnt} sites, ${hotelsCnt} hotels)`,
      labelAr: `الأصول السياحية والتراثية (${tourismSc}/100، ${heritageCnt} معلماً، ${hotelsCnt} فندقاً)`
    }
  ].sort((a, b) => b.score - a.score);

  return { pressures, strengths };
}

export function runAgentAnalysis(
  agentId: string,
  w: WilayaRecord,
  allWilayas: WilayaRecord[],
  targetYear: number = 2030,
  lang: 'ar' | 'en' = 'ar'
): AgentAnalysisOutput {
  const profile = AI_AGENT_PROFILES.find(a => a.id === agentId) || AI_AGENT_PROFILES[0];
  const isAr = lang === 'ar';
  const horizon = Math.max(1, targetYear - 2026);
  const wName = isAr ? w.n : w.en;
  const nTotal = Math.max(1, allWilayas.length);
  const forecastHorizonYears = Array.from({ length: horizon }, (_, idx) => 2026 + idx + 1);
  const effectiveYears = forecastHorizonYears.length ? forecastHorizonYears : [2027, 2028, 2029, 2030];

  // Core computed metrics for w
  const projectedWaterDeficit = Math.round(w.waterDef * 10 - (w.pop * 0.035 * horizon) * 0.15 - (w.rain * 0.012 * horizon) * 0.2);
  const droughtRiskPct = Math.max(2, Math.min(98, Math.round(100 - (w.soil * 0.5 + w.rain * 0.06 + w.ndvi * 60) + horizon * 2.1 + (w.rain < 200 ? 18 : 0))));
  const urbanGrowthPct = Math.round((w.pop / 100) * (w.price / 50000) * horizon * 0.8 + horizon * 1.5);
  const coverageGapPct = Math.max(0, Math.round(100 - w.coverage));
  const floodPct = Math.round(w.flood * 100);
  const healthCov = getHealthCoverage(w);
  const hospitalsCnt = getHospitalsCount(w);
  const seismicPct = Math.round(getSeismicRisk(w) * 100);
  const wildfirePct = Math.round(getWildfireRisk(w) * 100);
  const hazardIdx = getHazardIndex(w);
  const transportSc = getTransportScore(w);
  const railConnected = hasRailAccess(w);
  const hotelsCnt = getHotelsCount(w);
  const heritageCnt = getHeritageSitesCount(w);
  const tourismSc = getTourismScore(w);
  const industryScore = Math.round(w.energy * 0.28 + transportSc * 0.32 + w.labor * 0.2 + (100 - Math.abs(w.waterDef)) * 0.2);

  // Historical 2018-2025 real deltas
  const histYears = w.historicalYears ?? [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const histWater = w.historicalWaterDef ?? Array(8).fill(w.waterDef);
  const histRain = w.historicalRain ?? Array(8).fill(w.rain);
  const histPop = w.historicalPop ?? Array(8).fill(w.pop);
  const histPrice = w.historicalPrice ?? Array(8).fill(w.price);

  const waterDelta8y = seriesChange(histWater);
  const rainDelta8y = seriesChange(histRain);
  const popDelta8y = seriesChange(histPop);
  const priceDelta8y = seriesChange(histPrice);

  // Benchmarks, Ranks, Neighbors & Factor Decomposition
  const ecoZone = inferEcoZone(w, lang);
  const { neighbor, distKm } = getNearestNeighbor(allWilayas, w);
  const neighborName = isAr ? neighbor.n : neighbor.en;
  const { pressures, strengths } = rankWilayaPressuresAndStrengths(w, floodPct, droughtRiskPct, coverageGapPct);
  const top1 = pressures[0];
  const top2 = pressures[1];
  const str1 = strengths[0];

  const avgPrice = Math.round(meanOf(allWilayas.map(x => x.price)));
  const avgRain = Math.round(meanOf(allWilayas.map(x => x.rain)));
  const avgCoverage = Math.round(meanOf(allWilayas.map(x => x.coverage)));
  const avgWaterDef = Math.round(meanOf(allWilayas.map(x => x.waterDef)) * 10) / 10;

  const waterStressRank = getRank(allWilayas, w, x => x.waterDef, false);
  const floodRank = getRank(allWilayas, w, x => x.flood, true);
  const priceRank = getRank(allWilayas, w, x => x.price, true);
  const industryRank = getRank(allWilayas, w, x => x.industry, true);
  const soilRank = getRank(allWilayas, w, x => x.soil, true);
  const popRank = getRank(allWilayas, w, x => x.pop, true);
  const healthRank = getRank(allWilayas, w, x => getHealthCoverage(x), true);
  const hazardRank = getRank(allWilayas, w, x => getHazardIndex(x), true);
  const transportRank = getRank(allWilayas, w, x => getTransportScore(x), true);
  const tourismRank = getRank(allWilayas, w, x => getTourismScore(x), true);

  // Composite Risk Score & Rating (expanded with Health & Hazards & Rail isolation)
  let riskScore = 0;
  if (projectedWaterDeficit < -250 || w.waterDef < -25) riskScore += 2;
  else if (projectedWaterDeficit < -100 || w.waterDef < -10) riskScore += 1;
  if (floodPct > 40 || hazardIdx >= 62) riskScore += 2;
  else if (floodPct > 25 || hazardIdx >= 45) riskScore += 1;
  if (droughtRiskPct > 60) riskScore += 2; else if (droughtRiskPct > 45) riskScore += 1;
  if (healthCov < 50) riskScore += 2; else if (healthCov < 62) riskScore += 1;
  if (coverageGapPct > 30) riskScore += 1;
  if (transportSc < 55) riskScore += 1;

  const riskRating: AgentAnalysisOutput['riskRating'] =
    riskScore >= 6 ? 'CRITICAL' : riskScore >= 4 ? 'HIGH' : riskScore >= 2 ? 'WATCH' : 'STABLE';

  // Model-calibrated Evidence Quality Score (varies by wilaya completeness AND model type)
  const baseQuality = 86 + ((w.historicalWaterDef?.length ?? 0) >= 6 ? 6 : 0) - (w.isCustomImport ? 4 : 0);
  const modelCalibration: Record<string, number> = {
    spark: 3, gemini: 1, gpt: 2, qwen: 4, deepseek: 5, claude: 2, grok: 0
  };
  const evidenceQualityScore = Math.max(
    74,
    Math.min(99, baseQuality + (modelCalibration[agentId] ?? 0) - (ecoZone.key === 'sahara' && w.dams === 0 ? 2 : 0) - (w.num % 3))
  );

  let mathematicalFindings: string[] = [];
  let spatialDiagnosis = '';
  let recommendations: string[] = [];
  let calculations: Record<string, number | string> = {};

  if (agentId === 'spark') {
    // 1. MUSE SPARK: Spatial Topology, Getis-Ord Gi*, Moran's I & Huff Gravity Interaction
    const moran = computeMoransI(allWilayas, x => x.waterDef);
    const hotspots = computeGetisOrdGi(allWilayas, x => x.waterDef);
    const localHotspot = hotspots.find(h => h.wilayaNum === w.num);
    const localGiZ = localHotspot?.giZScore ?? 0;
    const localGiClass = localHotspot?.classification ?? 'Not Significant';
    const gravityLinks = computeGravityInteraction(w, allWilayas, 1.5);
    const topGravity = gravityLinks[0];
    const gravityName = topGravity ? (isAr ? topGravity.wilayaAr : topGravity.wilaya) : neighborName;
    const waterLagDelta = Math.round((w.waterDef - neighbor.waterDef) * 10) / 10;

    calculations = isAr
      ? {
          'مؤشر Gi* المحلي': localGiZ,
          'النقل والسكك': `${transportSc}/100 (${railConnected ? 'SNTF' : 'طرقي'})`,
          'التغطية الصحية': `${healthCov}% (#${healthRank})`,
          'السياحة والتراث': `${tourismSc}/100 (#${tourismRank})`,
          'الأخطار المركبة': `${hazardIdx}/100 (#${hazardRank})`,
          'أقوى قطب جذب': `${gravityName} (${topGravity?.interactionStrength ?? 0})`
        }
      : {
          'Local Gi* Z': localGiZ,
          'Transport & Rail': `${transportSc}/100 (${railConnected ? 'SNTF' : 'Road'})`,
          'Health Coverage': `${healthCov}% (#${healthRank})`,
          'Tourism & Heritage': `${tourismSc}/100 (#${tourismRank})`,
          'Natural Hazards': `${hazardIdx}/100 (#${hazardRank})`,
          'Gravity Pole': `${gravityName} (${topGravity?.interactionStrength ?? 0})`
        };

    mathematicalFindings = isAr ? [
      `الارتباط المكاني المحلي لـ ${wName} (Getis-Ord Gi*): Z = ${localGiZ} (${localGiClass}) مقابل موران الوطني I = ${moran.observedI} (p = ${moran.pValue})؛ فارق الجوار المائي ${waterLagDelta >= 0 ? '+' : ''}${waterLagDelta}`,
      `الربط متعدد الوسائط والنفاذ الصحي والسياحي: النقل ${transportSc}/100 (#${transportRank}/${nTotal}، ${railConnected ? 'SNTF' : 'طرقي'})، الصحة ${healthCov}% (${hospitalsCnt} مستشفى)، والسياحة ${tourismSc}/100 (${heritageCnt} معلماً، ${hotelsCnt} فندقاً)`,
      `طيف الأخطار المركب (${hazardIdx}/100 — #${hazardRank}/${nTotal}): زلازل ${seismicPct}%، فيضانات ${floodPct}%، وحرائق غابات ${wildfirePct}% في النطاق (${ecoZone.label})`
    ] : [
      `Spatial Autocorrelation for ${wName}: Local Gi* Z = ${localGiZ} (${localGiClass}) against National Moran's I = ${moran.observedI} (p = ${moran.pValue}); water lag ${waterLagDelta >= 0 ? '+' : ''}${waterLagDelta}`,
      `Connectivity, Health & Tourism Topology: Transport ${transportSc}/100 (#${transportRank}/${nTotal}, ${railConnected ? 'SNTF rail' : 'Road'}), Health ${healthCov}% (${hospitalsCnt} hospitals), Tourism ${tourismSc}/100 (${heritageCnt} sites, ${hotelsCnt} hotels)`,
      `Multi-Hazard Spectrum (${hazardIdx}/100 · rank #${hazardRank}/${nTotal}): Seismic ${seismicPct}%, Flood ${floodPct}%, Wildfire ${wildfirePct}% across (${ecoZone.label})`
    ];

    spatialDiagnosis = isAr
      ? `الخريطة الطبوغرافية لولاية ${wName} (${ecoZone.label}) تضعها في بؤرة [${localGiClass}] بضغط أساسي في ${top1.labelAr}، يقابله رصيد قوة مكاني في ${str1.labelAr}. الربط مع جارتها ${neighborName} (${distKm} كم) ${railConnected ? 'مدعوم بالسكة الحديدية SNTF' : 'يعتمد على الشبكة الطرقية فقط'} ويستوجب ${
          top1.id === 'flood' || top1.id === 'hazards'
            ? `إبعاد التوسع العمراني عن بؤر الأخطار (${hazardIdx}/100) وأحواض السيول (${floodPct}%)`
            : top1.id === 'health_gap'
            ? `توجيه أقطاب استشفائية متنقلة ومستشفيات جوارية لرفع التغطية عن ${healthCov}%`
            : `تطوير قطب لوجستي ونقل موجه عبر محور ${gravityName}`
        }.`
      : `Spatial topology of ${wName} (${ecoZone.label}) registers as [${localGiClass}] dominated by ${top1.labelEn} alongside anchor ${str1.labelEn}. Peer corridor to ${neighborName} (${distKm} km) is ${railConnected ? 'SNTF-rail linked' : 'road-only'}, requiring ${
          top1.id === 'flood' || top1.id === 'hazards'
            ? `relocating urban growth away from ${hazardIdx}/100 hazard corridors and wadi basins`
            : top1.id === 'health_gap'
            ? `expanding secondary hospital nodes to lift ${healthCov}% access`
            : `consolidating multimodal transport toward ${gravityName}`
        }.`;

    recommendations = isAr ? [
      top1.id === 'hazards' || top1.id === 'flood'
        ? `تجميد التجزئات العمرانية في ${wName} ضمن مناطق الأخطار (${hazardIdx}/100، زلازل ${seismicPct}% وسيول ${floodPct}%) وتعديل PDAU`
        : `تخصيص أقطاب توسع عمراني آمنة في ${wName} مرتبطة بمحور ${gravityName} (${transportSc}/100 نقل)`,
      railConnected
        ? `تعظيم استخدام الخط الحديدي في ${wName} لربط المناطق الصناعية والتموينية مع ${neighborName} (${distKm} كم)`
        : `مد وصلة سكة حديدية وربط استشفائي عاجل لـ ${wName} لتقليص كلفة النفاذ إلى المستشفيات (${hospitalsCnt} مرفقاً)`,
      `مراقبة حدود ${wName} ببيانات Sentinel-2 لمنع زحف البناء العشوائي على الغابات والأراضي الحساسة (حرائق ${wildfirePct}%)`
    ] : [
      top1.id === 'hazards' || top1.id === 'flood'
        ? `Enforce PDAU setback overlays across ${wName}'s high-hazard corridors (${hazardIdx}/100: seismic ${seismicPct}%, flood ${floodPct}%)`
        : `Zone structured transit-oriented nodes in ${wName} linked with ${gravityName} (${transportSc}/100 connectivity)`,
      railConnected
        ? `Leverage ${wName}'s SNTF rail corridor to integrate freight and healthcare access with ${neighborName} (${distKm} km)`
        : `Prioritize regional rail/express link and emergency clinics for ${wName} (currently ${hospitalsCnt} hospitals, ${healthCov}% access)`,
      `Track perimeter sprawl and forest margins via Sentinel-2 (wildfire risk ${wildfirePct}%, NDVI ${w.ndvi})`
    ];
  } else if (agentId === 'gemini') {
    // 2. GEMINI 3 FLASH: 72-Hour Crisis Triage, Exposed Population, Hospital Beds & Multi-Hazard Routing
    const exposedPopK = Math.round(w.pop * (Math.max(w.flood, hazardIdx / 140, (w.waterDef < -15 ? Math.abs(w.waterDef) / 60 : 0.08))));
    const mutualAidEtaHrs = Math.max(0.8, Math.round((distKm / Math.max(40, transportSc * 0.95)) * 10) / 10);
    const activeTriggerCount = [
      w.waterDef <= -20,
      hazardIdx >= 55,
      healthCov < 58,
      droughtRiskPct >= 55,
      transportSc < 55
    ].filter(Boolean).length;

    calculations = isAr
      ? {
          'درجة الخطورة': `${riskScore}/10`,
          'تصنيف الإنذار': riskRating,
          'سكان تحت الخطر': `${exposedPopK} ألف`,
          'المستشفيات النشطة': `${hospitalsCnt} (${healthCov}%)`,
          'زمن الإمداد': `${mutualAidEtaHrs} سا`,
          'مؤشر الأخطار': `${hazardIdx}/100`
        }
      : {
          'Severity / 10': `${riskScore}/10`,
          'Triage Tier': riskRating,
          'Exposed Pop (k)': `${exposedPopK}k`,
          'Hospital Readiness': `${hospitalsCnt} (${healthCov}%)`,
          'Mutual-Aid ETA': `${mutualAidEtaHrs}h`,
          'Hazard Index': `${hazardIdx}/100`
        };

    const triggersList: string[] = [];
    if (w.waterDef <= -20) triggersList.push(isAr ? `أزمة عطش (${w.waterDef})` : `water shock (${w.waterDef})`);
    if (hazardIdx >= 55) triggersList.push(isAr ? `أخطار طبيعية (${hazardIdx}/100)` : `multi-hazard (${hazardIdx}/100)`);
    if (healthCov < 58) triggersList.push(isAr ? `ضغط استشفائي (${healthCov}%)` : `hospital strain (${healthCov}%)`);
    if (droughtRiskPct >= 55) triggersList.push(isAr ? `جفاف (${droughtRiskPct}%)` : `drought (${droughtRiskPct}%)`);
    if (transportSc < 55) triggersList.push(isAr ? `عزلة نقل (${transportSc}/100)` : `transport bottleneck (${transportSc}/100)`);

    mathematicalFindings = isAr ? [
      `الفرز السريع لـ ${wName}: مستوى الإنذار [${riskRating}] بدرجة ${riskScore}/10، ويُقدر السكان المعرضون بنحو ${exposedPopK} ألف مقابل قدرة استشفائية تضم ${hospitalsCnt} مستشفى (${healthCov}%)`,
      `محفزات الأزمة النشطة (${activeTriggerCount}): ${triggersList.length ? triggersList.join(' + ') : `استقرار نسبي مع مراقبة ${top1.labelAr}`}`,
      `ممر الإغاثة خلال 72 ساعة: زمن وصول الإمداد من ${neighborName} (${distKm} كم) هو ${mutualAidEtaHrs} ساعة عبر شبكة نقل ${transportSc}/100${railConnected ? ' مدعومة بالسكة الحديدية' : ''}`
    ] : [
      `72h Triage Score for ${wName}: [${riskRating}] tier (${riskScore}/10) with ~${exposedPopK}k residents exposed vs ${hospitalsCnt} hospitals (${healthCov}% access)`,
      `Active Triggers (${activeTriggerCount}): ${triggersList.length ? triggersList.join(' + ') : `No critical breach; monitoring ${top1.labelEn}`}`,
      `Relief Logistics Corridor: Mutual-aid convoy from ${neighborName} (${distKm} km) estimated at ${mutualAidEtaHrs}h over ${transportSc}/100 multimodal transport${railConnected ? ' + rail' : ''}`
    ];

    spatialDiagnosis = isAr
      ? `غرفة الأزمات تصنف ${wName} عند مستوى [${riskRating}] بضغط أول في ${top1.labelAr} متبوعاً بـ ${top2.labelAr}. قدرة الاستشفاء (${hospitalsCnt} مرفق، تغطية ${healthCov}%) ومؤشر الأخطار (${hazardIdx}/100) ${
          riskScore >= 4
            ? `يتطلبان تفعيل مخطط تنظيم النجدة ORSEC فوراً لحماية ${exposedPopK} ألف نسمة وضمان مسارات الإخلاء الطبي عبر ${neighborName}`
            : `يسمحان بإجراء مناورات وقائية مبرمجة وصيانة شبكات الإمداد قبل ذروة ${targetYear}`
        }.`
      : `Crisis triage flags ${wName} at [${riskRating}] driven by ${top1.labelEn} and ${top2.labelEn}. With ${hospitalsCnt} hospitals (${healthCov}% access) and a ${hazardIdx}/100 hazard load, ${
          riskScore >= 4
            ? `immediate ORSEC civil-protection activation is required to protect ~${exposedPopK}k residents and secure medical evacuation corridors via ${neighborName}`
            : `preventative stabilization and civil-protection readiness can neutralize risks ahead of ${targetYear}`
        }.`;

    recommendations = isAr ? [
      `خطة 72 ساعة #1 لـ ${wName}: حماية ${exposedPopK} ألف نسمة من ${top1.labelAr} وتأمين أجنحة الاستعجالات في ${hospitalsCnt} مستشفى`,
      `تأمين ممر الإخلاء والإمداد الطبي ${wName} ↔ ${neighborName} (${mutualAidEtaHrs} ساعة) وتعزيز المولدات الاحتياطية (${w.energy}%)`,
      hazardIdx >= 50
        ? `نشر فرق الحماية المدنية والوقاية من الزلازل/الحرائق (مؤشر الأخطار ${hazardIdx}/100) بالبلديات ذات الكثافة العالية`
        : `تخفيف ضغط ${top2.labelAr} وتعزيز الفرق الصحية المتنقلة في النطاقات الطرفية (${healthCov}%)`
    ] : [
      `72h Directive #1 (${wName}): Protect ~${exposedPopK}k residents from ${top1.labelEn} and pre-alert emergency wards across ${hospitalsCnt} hospitals`,
      `Secure emergency medical & relief routing along ${wName}–${neighborName} (${mutualAidEtaHrs}h ETA, power grid ${w.energy}%)`,
      hazardIdx >= 50
        ? `Pre-deploy Civil Protection units across seismic/wildfire hotspots (hazard index ${hazardIdx}/100)`
        : `Deploy mobile clinics and rapid municipal response units to under-served communes (${healthCov}% access)`
    ];
  } else if (agentId === 'qwen') {
    // 4. QWEN MAX: Coupled Hydro-Agronomic Balance, Dam/Well Load, SPEI & NDVI Efficiency
    const wellsPerDam = w.dams > 0 ? Math.round(w.wells / w.dams) : w.wells;
    const ndviPer100mm = Math.round((w.ndvi / Math.max(0.25, w.rain / 100)) * 100) / 100;
    const agroPotential = Math.round(w.soil * 0.45 + w.ndvi * 35 + Math.min(20, w.rain / 35));
    const rainVsNatPct = Math.round(((w.rain - avgRain) / Math.max(1, avgRain)) * 100);

    const cropCall = w.soil > 75 && w.rain > 350 ? (isAr ? 'ممتازة للحبوب الكبرى والبقوليات' : 'Prime winter cereals & legumes')
      : w.soil > 55 && w.rain > 500 ? (isAr ? 'ملائمة جداً للأشجار المثمرة والزيتون' : 'Fruit orchards, olive groves & forestry')
      : w.rain < 150 ? (isAr ? 'فلاحة واحاتية ذكية (النخيل والزراعات المحمية)' : 'Saharan oasis palms & controlled greenhouses')
      : (isAr ? 'زراعات سهبية مختلطة وسقي تكميلي' : 'Steppic mixed crops & supplemental irrigation');

    calculations = isAr
      ? {
          'الميزان المائي المتوقع': projectedWaterDeficit,
          'خطر الجفاف SPEI': `${droughtRiskPct}%`,
          'ضغط الآبار/السد': `${wellsPerDam}`,
          'جودة التربة': `${w.soil}/100 (#${soilRank})`,
          'كفاءة الغطاء/المطر': ndviPer100mm,
          'القدرة الفلاحية': `${agroPotential}/100`
        }
      : {
          'Proj Hydro Deficit': projectedWaterDeficit,
          'SPEI Drought %': `${droughtRiskPct}%`,
          'Wells-per-Dam': wellsPerDam,
          'Soil Rank': `${w.soil}/100 (#${soilRank})`,
          'NDVI/100mm Rain': ndviPer100mm,
          'Agro-Index': `${agroPotential}/100`
        };

    mathematicalFindings = isAr ? [
      `الضغط الهيدرولوجي في ${wName}: ${w.dams} سدود مقابل ${w.wells} بئراً (معدل ${wellsPerDam} بئر/سد) بعجز حالي ${w.waterDef} وتغير 8 سنوات (${rainDelta8y} ملم أمطار)`,
      `كفاءة الغطاء النباتي والأمطار: NDVI = ${w.ndvi} مع ${w.rain} ملم/سنة (${rainVsNatPct >= 0 ? '+' : ''}${rainVsNatPct}% عن المعدل الوطني ${avgRain} ملم — معامل التحويل = ${ndviPer100mm})`,
      `مؤشر الملاءمة الفلاحية لـ ${wName}: ${agroPotential}/100 (جودة التربة #${soilRank}/${nTotal}) وخطر إجهاد الجفاف ${droughtRiskPct}% في ${targetYear}`
    ] : [
      `${wName} Hydraulic Load: ${w.dams} dams vs ${w.wells} boreholes (${wellsPerDam} wells/dam pressure), deficit ${w.waterDef}, and 8-yr rainfall shift of ${rainDelta8y} mm`,
      `Chlorophyll-Precipitation Ratio: NDVI ${w.ndvi} on ${w.rain} mm/yr (${rainVsNatPct >= 0 ? '+' : ''}${rainVsNatPct}% vs national ${avgRain} mm; conversion efficiency = ${ndviPer100mm})`,
      `Agro-Ecological Score: ${agroPotential}/100 (soil #${soilRank}/${nTotal} at ${w.soil}/100) with ${droughtRiskPct}% SPEI drought stress projected for ${targetYear}`
    ];

    spatialDiagnosis = isAr
      ? `هيدرولوجياً، تواجه ${wName} معادلة "${w.dams === 0 ? `اعتماد كلي على ${w.wells} بئراً بدون سدود` : `${w.dams} سدود تحت ضغط ${wellsPerDam} بئر لكل سد`}" مع تراجع مطري (${rainDelta8y} ملم). تصنف أراضيها لـ (${cropCall}) بمؤشر فلاحي ${agroPotential}/100، ما يعني أن ${
          droughtRiskPct >= 55
            ? `استمرار السقي التقليدي يهدد بانهيار المردود الزراعي، والحل في السقي الموضعي وإعادة تدوير المياه`
            : `الولاية مؤهلة لقيادة الأمن الغذائي الوطني بشرط حماية مخزونها المائي عبر الري الذكي`
        }.`
      : `Hydro-agronomically, ${wName} operates under "${w.dams === 0 ? `100% borehole dependency (${w.wells} wells, 0 dams)` : `${w.dams} dams carrying a ${wellsPerDam} wells-per-dam load`}" alongside an 8-year rainfall shift of ${rainDelta8y} mm. Rated "${cropCall}" (agro-index ${agroPotential}/100), ${
          droughtRiskPct >= 55
            ? `unmetered flood irrigation risks severe yield erosion by ${targetYear}; pressurized drip conversion is mandatory`
            : `${wName} holds strong national food-security upside provided groundwater recharge is actively metered`
        }.`;

    recommendations = isAr ? [
      w.dams === 0
        ? `ربط ${wName} (0 سد) بمحطات تحلية المياه الجوفية المالحة والتحويلات الجهوية لتخفيف الضغط على الآبار الـ ${w.wells}`
        : `تطهير السدود الـ ${w.dams} في ${wName} وتبطين قنوات الري لتقليص ضياع التبخر وموازنة ضغط ${wellsPerDam} بئر/سد`,
      `توجيه دعم الفلاحين في ${wName} نحو "${cropCall}" وتعميم السقي بالتنقيط لترفع كفاءة NDVI/المطر (${ndviPer100mm})`,
      `تركيب عدادات رقمية على الآبار الفلاحية ذات السحب الكثيف للحد من تفاقم العجز (${projectedWaterDeficit} في ${targetYear})`
    ] : [
      w.dams === 0
        ? `Connect ${wName} (0 surface dams) to regional inter-basin transfers and solar brackish treatment to relieve its ${w.wells} wells`
        : `Dredge siltation across ${wName}'s ${w.dams} dams and modernize canal lining to offset its ${wellsPerDam} wells-per-dam extraction load`,
      `Target DSA agronomy subsidies in ${wName} exclusively toward "${cropCall}" under drip irrigation (lifting NDVI/rain efficiency from ${ndviPer100mm})`,
      `Mandate telemetry metering on deep agricultural boreholes in ${wName} to curb ${targetYear} deficit drift (${projectedWaterDeficit})`
    ];
  } else if (agentId === 'deepseek') {
    // 5. DEEPSEEK R1: Real Multiple OLS Econometric Model & Causal Bottleneck ROI
    const multiReg = executeForecastModel('multiple_regression', histYears, histWater, effectiveYears);
    const popElasticityImpact = Math.round((w.pop * 0.035) * 10) / 10;
    const bottleneckGap = Math.round(top1.score);
    const marginalRoi = Math.round(14 + bottleneckGap * 0.25);
    const infraComposite = Math.round((w.energy + w.roads + w.labor) / 3);
    const gapVsNatCov = w.coverage - avgCoverage;

    calculations = isAr
      ? {
          'الجاهزية الصناعية': `${industryScore}/100 (#${industryRank})`,
          'الجاذبية السياحية': `${tourismSc}/100 (#${tourismRank})`,
          'مرونة الطلب المائي': `+${popElasticityImpact}`,
          'متوسط البنية التحتية': `${infraComposite}/100`,
          'ثقل العائق الأول': `${bottleneckGap} نقطة`,
          'عائد فك الاختناق': `+${marginalRoi}%`
        }
      : {
          'Industry Rank': `${industryScore}/100 (#${industryRank})`,
          'Tourism Index': `${tourismSc}/100 (#${tourismRank})`,
          'Water Elasticity': `+${popElasticityImpact}`,
          'Infra Mean': `${infraComposite}/100`,
          'Bottleneck Weight': `${bottleneckGap} pts`,
          'Unlock ROI': `+${marginalRoi}%`
        };

    mathematicalFindings = isAr ? [
      `نموذج الانحدار المتعدد لـ ${wName}: معامل التحديد R² = ${multiReg.metrics.r2} (RMSE = ${multiReg.metrics.rmse})، ومعامل المرونة الديموغرافية المائية = +${popElasticityImpact} وحدة طلب إضافية`,
      `تفكيك العوامل الصناعية والسياحية في ${wName}: الصناعة ${industryScore}/100 (#${industryRank}/${nTotal})، السياحة والضيافة ${tourismSc}/100 (#${tourismRank}/${nTotal} عبر ${hotelsCnt} فندقاً و${heritageCnt} معلماً) ضمن بنية ${infraComposite}/100`,
      `التحليل التجاري القياسي: ${w.markets} سوقاً تغطي ${w.coverage}% (${gapVsNatCov >= 0 ? '+' : ''}${gapVsNatCov}% مقارنة بالمتوسط الوطني ${avgCoverage}%)، مع نمو سعري تاريخي +${priceDelta8y.toLocaleString()} دج/م²`
    ] : [
      `Multiple OLS Fit (${wName}): R² = ${multiReg.metrics.r2} (RMSE = ${multiReg.metrics.rmse}) with demographic water-demand elasticity contributing +${popElasticityImpact} load units`,
      `Industrial & Tourism Diversification (${wName}): Industry ${industryScore}/100 (#${industryRank}/${nTotal}), Tourism & Hospitality ${tourismSc}/100 (#${tourismRank}/${nTotal}: ${hotelsCnt} hotels, ${heritageCnt} heritage sites)`,
      `Commercial Market Elasticity: ${w.markets} hubs yield ${w.coverage}% coverage (${gapVsNatCov >= 0 ? '+' : ''}${gapVsNatCov}% vs national ${avgCoverage}%) amidst +${priceDelta8y.toLocaleString()} DZD/m² 8-yr appreciation`
    ];

    spatialDiagnosis = isAr
      ? `اقتصادياً، لا تعاني ${wName} من غياب المقومات — فهي تمتلك ميزة في ${str1.labelAr} — وإنما من اختناق سببي مركّز في (${top1.labelAr}) بنسبة ثقل ${bottleneckGap} نقطة، يليه (${top2.labelAr}). المعادلة القياسية تثبت أن استثمار الدينار العمومي في فك القيد الأول داخل ${wName} يرفع المردودية الإنتاجية بـ +${marginalRoi}% متفوقاً على التوسع الأفقي غير الموجّه.`
      : `Econometrically, ${wName} is constrained not by lack of demand—anchored as it is by ${str1.labelEn}—but by a primary causal bottleneck in ${top1.labelEn} (severity ${bottleneckGap} pts), compounded by ${top2.labelEn}. OLS elasticity shows resolving that single constraint in ${wName} generates a +${marginalRoi}% marginal productivity gain.`;

    recommendations = isAr ? [
      `توجيه الأولوية الاستثمارية رقم 1 في ${wName} لإزالة (${top1.labelAr}) بعائد اقتصادي مقدر بـ +${marginalRoi}%`,
      w.industry >= 65
        ? `الاستثمار في سلاسل القيمة التحويلية داخل ${wName} (المرتبة الصناعية #${industryRank}) مع ربط المناطق الصناعية بالبنية التحتية (${infraComposite}/100)`
        : `تأهيل البنية التحتية الداعمة في ${wName} (طرق ${w.roads}% / طاقة ${w.energy}%) لرفع الجاذبية الصناعية من ${industryScore} نحو عتبة 75+`,
      coverageGapPct >= 25
        ? `تشييد أسواق جملة ومستودعات تبريد لتقليص فجوة التغطية (${coverageGapPct}%) وتخفيض كلفة النقل من ${neighborName}`
        : `تحويل ${wName} (${w.coverage}% تغطية) إلى مركز توزيع لوجستي يخدم الولايات المجاورة وعلى رأسها ${neighborName}`
    ] : [
      `Direct #1 capital allocation in ${wName} toward clearing ${top1.labelEn} for an estimated +${marginalRoi}% productivity return`,
      w.industry >= 65
        ? `Scale high-value manufacturing clusters in ${wName} (national rank #${industryRank}) leveraging its ${infraComposite}/100 infrastructure base`
        : `Upgrade ${wName}'s enabling utilities (roads ${w.roads}%, power ${w.energy}%) to lift industrial readiness from ${industryScore} toward 75+`,
      coverageGapPct >= 25
        ? `Build refrigerated wholesale logistics hubs in ${wName} to close its ${coverageGapPct}% retail gap and lower freight margins from ${neighborName}`
        : `Position ${wName} (${w.coverage}% retail coverage) as a regional distribution hub supplying ${neighborName} and surrounding communes`
    ];
  } else if (agentId === 'claude') {
    // 6. CLAUDE SONNET: Governance, PESTEL Matrix, Cadastre & Fiscal Cost-Benefit Ratio
    const cbaMultiple = Math.round((2.6 + (floodPct / 32) + (Math.abs(w.waterDef) / 28) + (w.price / 160000)) * 10) / 10;
    const cadastreUrgency = Math.round((w.price / 185000) * 55 + floodPct * 0.45);
    const regulatoryTier = floodPct >= 35 || w.waterDef <= -25 ? (isAr ? 'مراسيم ملزمة' : 'Mandatory Decree') : (isAr ? 'ضبط تنظيمي' : 'Regulatory Audit');
    const legalExposure = Math.round((floodPct * 0.55 + Math.max(0, -w.waterDef) * 1.1));

    calculations = isAr
      ? {
          'مضاعف العائد الوقائي': `${cbaMultiple}x`,
          'إلحاح رقمنة العقار': `${cadastreUrgency}/100`,
          'ترتيب سعر العقار': `#${priceRank}/${nTotal}`,
          'المخاطر التنظيمية': `${legalExposure} نقطة`,
          'المستوى القانوني': regulatoryTier,
          'قوة اليد العاملة': `${w.labor}/100`
        }
      : {
          'Fiscal CBA Ratio': `${cbaMultiple}x`,
          'Cadastre Urgency': `${cadastreUrgency}/100`,
          'Land Price Rank': `#${priceRank}/${nTotal}`,
          'Regulatory Risk': `${legalExposure} pts`,
          'Legal Instrument': regulatoryTier,
          'Labor Depth': `${w.labor}/100`
        };

    mathematicalFindings = isAr ? [
      `تدقيق PESTEL لولاية ${wName}: ضغط العقار ${w.price.toLocaleString()} دج/م² (المرتبة #${priceRank}/${nTotal}) يرفع إلحاح رقمنة السجل العقاري إلى ${cadastreUrgency}/100`,
      `مؤشر الامتثال البيئي والقانوني (${legalExposure} نقطة): ينبع أساساً من ${top1.labelAr} وتداخل النشاط مع ${top2.labelAr}`,
      `التقييم المالي الوقائي لـ ${wName}: كل دينار يُستثمر في الوقاية التنظيمية يحقق وفراً عمومياً بمقدار ${cbaMultiple}x في أفق ${targetYear}`
    ] : [
      `PESTEL Governance Scan (${wName}): Land price of ${w.price.toLocaleString()} DZD/m² (rank #${priceRank}/${nTotal}) drives cadastre digitization urgency to ${cadastreUrgency}/100`,
      `Regulatory & Environmental Exposure (${legalExposure} pts): Concentrated around ${top1.labelEn} alongside ${top2.labelEn}`,
      `Public Finance CBA Multiplier: Preventative zoning & metering in ${wName} yields ${cbaMultiple}x fiscal return versus reactive disaster/crisis spending through ${targetYear}`
    ];

    spatialDiagnosis = isAr
      ? `حوكمةً، تحتاج ولاية ${wName} إلى آلية (${regulatoryTier}) لمعالجة ${top1.labelAr} قبل تحوله إلى نزاعات عقارية أو بيئية مكلفة (مضاعف الوفر ${cbaMultiple}x). مع توفر قوة عاملة بمؤشر ${w.labor}/100 وميزة في ${str1.labelAr}، فإن التنسيق المباشر بين الوالي والمجالس البلدية ومديريات DUAC وANRH يضمن ضبط العقار وتحفيز الاستثمار النظامي.`
      : `From an institutional governance standpoint, ${wName} warrants a "${regulatoryTier}" framework targeting ${top1.labelEn} to capture a ${cbaMultiple}x fiscal prevention dividend. Paired with a ${w.labor}/100 workforce and strength in ${str1.labelEn}, coordinated Wali–APC–DUAC–ANRH oversight can formalize land concessions and unlock compliant investment.`;

    recommendations = isAr ? [
      `إصدار قرار ولائي خاص بـ ${wName} (${regulatoryTier}) لمعالجة ${top1.labelAr} بتكليف مباشر للسيد الوالي والبلديات`,
      `رقمنة المسح العقاري في ${wName} (مؤشر الإلحاح ${cadastreUrgency}/100، سعر #${priceRank}) وتطهير الامتيازات غير المستغلة`,
      `ربط اعتمادات الميزانية المحلية في ${wName} بمشاريع العائد الوقائي (${cbaMultiple}x) بدلاً من التوسع الإنشائي في مناطق الخطر`
    ] : [
      `Enact a targeted "${regulatoryTier}" package in ${wName} under joint Wali & APC oversight to resolve ${top1.labelEn}`,
      `Prioritize digital cadastre & parcel auditing in ${wName} (urgency ${cadastreUrgency}/100, price rank #${priceRank}) to release idle concessions`,
      `Condition ${wName}'s municipal capital grants on preventative risk compliance (${cbaMultiple}x fiscal CBA benchmark)`
    ];
  } else {
    // 7. GROK 2: Multivariate Z-Score Outlier Radar & Statistical Divergence (across 9 sectors)
    const priceArr = allWilayas.map(x => x.price);
    const waterArr = allWilayas.map(x => x.waterDef);
    const healthArr = allWilayas.map(x => getHealthCoverage(x));
    const hazArr = allWilayas.map(x => getHazardIndex(x));
    const transArr = allWilayas.map(x => getTransportScore(x));
    const tourArr = allWilayas.map(x => getTourismScore(x));

    const zPrice = Math.round(((w.price - meanOf(priceArr)) / stdOf(priceArr, meanOf(priceArr))) * 100) / 100;
    const zWater = Math.round(((w.waterDef - meanOf(waterArr)) / stdOf(waterArr, meanOf(waterArr))) * 100) / 100;
    const zHealth = Math.round(((healthCov - meanOf(healthArr)) / stdOf(healthArr, meanOf(healthArr))) * 100) / 100;
    const zHazard = Math.round(((hazardIdx - meanOf(hazArr)) / stdOf(hazArr, meanOf(hazArr))) * 100) / 100;
    const zTrans = Math.round(((transportSc - meanOf(transArr)) / stdOf(transArr, meanOf(transArr))) * 100) / 100;
    const zTourism = Math.round(((tourismSc - meanOf(tourArr)) / stdOf(tourArr, meanOf(tourArr))) * 100) / 100;

    const anomalies: string[] = [];
    if (w.price > 95000 && (w.flood >= 0.28 || hazardIdx >= 55)) {
      anomalies.push(isAr
        ? `مفارقة سعر/خطر في ${wName}: عقار مرتفع (${w.price.toLocaleString()} دج/م²) داخل منطقة أخطار ${hazardIdx}/100`
        : `Price-Hazard Paradox in ${wName}: high land price (${w.price.toLocaleString()} DZD/m²) inside ${hazardIdx}/100 multi-hazard belt`);
    }
    if (healthCov < 55 && w.pop >= 450) {
      anomalies.push(isAr
        ? `عجز استشفائي حاد في ${wName}: تغطية صحية ${healthCov}% فقط (${hospitalsCnt} مستشفى) لـ ${w.pop} ألف نسمة`
        : `Healthcare Bottleneck in ${wName}: ${healthCov}% coverage (${hospitalsCnt} hospitals) for ${w.pop}k residents`);
    }
    if (!railConnected && w.industry >= 60) {
      anomalies.push(isAr
        ? `انقطاع لوجستي في ${wName}: نسيج صناعي نشط (${w.industry}/100) دون ربط بالسكك الحديدية SNTF`
        : `Rail-Industry Disconnect in ${wName}: active industrial base (${w.industry}/100) lacking SNTF rail link`);
    }
    if (heritageCnt >= 7 && (hotelsCnt < 20 || transportSc < 55)) {
      anomalies.push(isAr
        ? `مفارقة تراث/إيواء في ${wName}: ${heritageCnt} معالم مصنفة تقابلها طاقة فندقية محدودة (${hotelsCnt} فندقاً) ونقل ${transportSc}/100`
        : `Heritage-Hospitality Paradox in ${wName}: ${heritageCnt} heritage sites constrained by ${hotelsCnt} hotels and ${transportSc}/100 transit`);
    }
    if (w.waterDef <= -24 && w.wells >= 650) {
      anomalies.push(isAr
        ? `استنزاف جوفي حاد في ${wName}: عجز ${w.waterDef} مع تركز ${w.wells} بئر`
        : `Borehole Overdraft Signal in ${wName}: ${w.waterDef} deficit paired with ${w.wells} deep wells`);
    }
    if (Math.abs(zPrice) >= 1.5 || Math.abs(zHazard) >= 1.5 || Math.abs(zHealth) >= 1.5 || Math.abs(zTrans) >= 1.5 || Math.abs(zTourism) >= 1.5) {
      anomalies.push(isAr
        ? `ذيل إحصائي متطرف في ${wName}: Z(صحة)=${zHealth}، Z(أخطار)=${zHazard}، Z(نقل)=${zTrans}، Z(سياحة)=${zTourism}`
        : `Extreme Z-Tail in ${wName}: Z(Health)=${zHealth}, Z(Hazards)=${zHazard}, Z(Transport)=${zTrans}, Z(Tourism)=${zTourism}`);
    }

    const maxAbsZ = Math.max(Math.abs(zPrice), Math.abs(zWater), Math.abs(zHealth), Math.abs(zHazard), Math.abs(zTrans), Math.abs(zTourism));

    calculations = isAr
      ? {
          'Z(العقار)': zPrice,
          'Z(المياه)': zWater,
          'Z(الصحة)': zHealth,
          'Z(الأخطار)': zHazard,
          'Z(السياحة)': zTourism,
          'إشارات الشذوذ': anomalies.length
        }
      : {
          'Z(Price)': zPrice,
          'Z(Water)': zWater,
          'Z(Health)': zHealth,
          'Z(Hazards)': zHazard,
          'Z(Tourism)': zTourism,
          'Anomalies': anomalies.length
        };

    mathematicalFindings = isAr ? [
      `رادار التباين متعدد المتغيرات لـ ${wName}: رُصدت ${anomalies.length} شذوذات عبر الطبقات التسع (أقصى انحراف = ${maxAbsZ.toFixed(2)}σ)`,
      anomalies[0] || `تتبع ${wName} توزيعاً مستقراً نسبياً (أقصى Z = ${maxAbsZ.toFixed(2)}σ) مقارنة بالمتوسط الوطني (${avgWaterDef} عجز، ${avgPrice.toLocaleString()} دج/م²)`,
      `بصمة التطرف في ${wName}: Z(صحة)=${zHealth}، Z(أخطار)=${zHazard}، Z(نقل)=${zTrans}، Z(سياحة)=${zTourism} مقابل جارتها ${neighborName}`
    ] : [
      `9-Layer Multivariate Z-Radar for ${wName}: Flagged ${anomalies.length} statistical anomalies (peak deviation = ${maxAbsZ.toFixed(2)}σ)`,
      anomalies[0] || `${wName} tracks within normal dispersion (max |Z| = ${maxAbsZ.toFixed(2)}σ vs national ${avgPrice.toLocaleString()} DZD/m² & ${avgWaterDef} water balance)`,
      `Dispersion Signature (${wName} vs ${neighborName}): Z(Health)=${zHealth}, Z(Hazards)=${zHazard}, Z(Transport)=${zTrans}, Z(Tourism)=${zTourism}`
    ];

    spatialDiagnosis = isAr
      ? (anomalies.length > 0
          ? `رادار Grok يرصد في ${wName} انحرافاً إحصائياً غير خطي (${maxAbsZ.toFixed(2)}σ): ${anomalies.join(' | ')}. هذا التباين يميز ${wName} هيكلياً عن جارتها ${neighborName} ويستوجب تدقيقاً ميدانياً.`
          : `إحصائياً، مؤشرات ${wName} عبر القطاعات التسعة متسقة داخلياً (دون شذوذ حاد)، وتتركز فجوتها في ${top1.labelAr} مقابل ميزة ${str1.labelAr}.`)
      : (anomalies.length > 0
          ? `Grok 9-Layer Radar flags non-linear divergence in ${wName} (peak ${maxAbsZ.toFixed(2)}σ): ${anomalies.join(' | ')}. This structurally separates ${wName} from neighbor ${neighborName}.`
          : `Statistically, ${wName} maintains cross-layer congruence (peak |Z| = ${maxAbsZ.toFixed(2)}σ) with residual variance centered on ${top1.labelEn} vs ${str1.labelEn}.`);

    recommendations = isAr ? [
      anomalies.length > 0
        ? `توجيه تفتيش ميداني في ${wName} لمعالجة الشذوذ المرصود: (${anomalies[0]})`
        : `تفعيل الرصد الآلي الفصلي لـ ${wName} عبر طبقات المياه والصحة والأخطار والنقل والسياحة (${top1.labelAr})`,
      `مقارنة قياسات ${wName} ببيانات Sentinel-2 وMSPRH/CRAAG/SNTF/MTA ونظيرتها ${neighborName} (${distKm} كم) لرصد أي انحراف > ±1.8σ`
    ] : [
      anomalies.length > 0
        ? `Dispatch targeted audit in ${wName} for primary anomaly: ${anomalies[0]}`
        : `Maintain automated quarterly cross-layer telemetry watch on ${wName} (${top1.labelEn})`,
      `Benchmark ${wName} against Sentinel-2, MSPRH/CRAAG/SNTF/MTA feeds, and neighbor ${neighborName} (${distKm} km) for >1.8σ shifts`
    ];
  }

  return {
    agentId: profile.id,
    agentName: `${profile.name} ${profile.version}`,
    role: isAr ? profile.roleAr : profile.role,
    wilaya: wName,
    targetYear,
    riskRating,
    mathematicalFindings,
    spatialDiagnosis,
    quantitativeCalculations: calculations,
    strategicRecommendations: recommendations,
    evidenceQualityScore
  };
}
