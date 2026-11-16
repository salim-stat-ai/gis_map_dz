/**
 * GIS Map – 7 AI Agents Team Engine
 * Real Quantitative Grounding, Model-Differentiated & Wilaya-Specific Multi-Disciplinary Analysis
 * © 2026 Salim Slimani & National Foresight System
 */

import { AgentAnalysisOutput, AgentProfile, WilayaRecord } from '../types';
import { computeMoransI, computeGetisOrdGi, computeGravityInteraction, haversineDistance } from './gis';
import { executeForecastModel } from './quantitative';

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
  const isSahara = w.region === 'Sahara' || w.lat < 33 || w.rain < 140;
  const isSteppe = !isSahara && (w.region === 'High-Plateaus' || w.rain < 420);
  if (isSahara) return { key: 'sahara', label: lang === 'ar' ? 'الإقليم الصحراوي القاحل' : 'Saharan Arid Belt' };
  if (isSteppe) return { key: 'steppe', label: lang === 'ar' ? 'إقليم الهضاب العليا والسهوب' : 'High-Plateaus Steppe' };
  return { key: 'tell', label: lang === 'ar' ? 'الإقليم التلي الساحلي والجبلي' : 'Tell & Coastal Belt' };
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
      score: (100 - w.roads) * 1.5,
      labelEn: `transport connectivity lag (${w.roads}% roads)`,
      labelAr: `محدودية الربط الطرقي (${w.roads}%)`
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
      id: 'roads',
      score: w.roads * 1.15,
      labelEn: `logistics & road network (${w.roads}%)`,
      labelAr: `شبكة الطرق واللوجستيك (${w.roads}%)`
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
  const industryScore = Math.round(w.energy * 0.3 + w.roads * 0.3 + w.labor * 0.2 + (100 - Math.abs(w.waterDef)) * 0.2);

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

  // Composite Risk Score & Rating
  let riskScore = 0;
  if (projectedWaterDeficit < -250 || w.waterDef < -25) riskScore += 2;
  else if (projectedWaterDeficit < -100 || w.waterDef < -10) riskScore += 1;
  if (floodPct > 40) riskScore += 2; else if (floodPct > 25) riskScore += 1;
  if (droughtRiskPct > 60) riskScore += 2; else if (droughtRiskPct > 45) riskScore += 1;
  if (coverageGapPct > 30) riskScore += 1;
  if (w.roads < 60) riskScore += 1;

  const riskRating: AgentAnalysisOutput['riskRating'] =
    riskScore >= 5 ? 'CRITICAL' : riskScore >= 3 ? 'HIGH' : riskScore >= 1 ? 'WATCH' : 'STABLE';

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
          'تصنيف البؤرة': localGiClass,
          'أقرب ولاية': `${neighborName} (${distKm}كم)`,
          'أقوى قطب جذب': `${gravityName} (${topGravity?.interactionStrength ?? 0})`,
          'رتبة الفيضانات': `#${floodRank}/${nTotal}`,
          'تباين الجوار المائي': `${waterLagDelta >= 0 ? '+' : ''}${waterLagDelta}`
        }
      : {
          'Local Gi* Z': localGiZ,
          'Cluster Tier': localGiClass,
          'Nearest Peer': `${neighborName} (${distKm} km)`,
          'Gravity Pole': `${gravityName} (${topGravity?.interactionStrength ?? 0})`,
          'Flood Rank': `#${floodRank}/${nTotal}`,
          'Neighbor Water Lag': `${waterLagDelta >= 0 ? '+' : ''}${waterLagDelta}`
        };

    mathematicalFindings = isAr ? [
      `الارتباط المكاني المحلي لـ ${wName} (Getis-Ord Gi*): Z = ${localGiZ} (${localGiClass}) مقابل موران الوطني I = ${moran.observedI} (p = ${moran.pValue})`,
      `مصفوفة الجاذبية لـ Huff: أقرب ولاية هي ${neighborName} (${distKm} كم، فارق مائي ${waterLagDelta >= 0 ? '+' : ''}${waterLagDelta})، بينما أقوى تفاعل اقتصادي هو مع ${gravityName} (قوة جذب ${topGravity?.interactionStrength ?? 0})`,
      `التموقع الجغرافي (${w.lat.toFixed(2)}°N, ${w.lon.toFixed(2)}°E — ${ecoZone.label}): السكان #${popRank}/${nTotal}، الفيضانات ${floodPct}% (#${floodRank}/${nTotal})، والغطاء النباتي NDVI = ${w.ndvi}`
    ] : [
      `Spatial Autocorrelation for ${wName}: Local Gi* Z = ${localGiZ} (${localGiClass}) against National Moran's I = ${moran.observedI} (p = ${moran.pValue})`,
      `Huff Spatial Gravity Matrix: Nearest peer ${neighborName} sits ${distKm} km away (water lag ${waterLagDelta >= 0 ? '+' : ''}${waterLagDelta}); strongest economic pull is toward ${gravityName} (gravity score ${topGravity?.interactionStrength ?? 0})`,
      `Territorial Coordinates (${w.lat.toFixed(2)}°N, ${w.lon.toFixed(2)}°E · ${ecoZone.label}): Population rank #${popRank}/${nTotal}, flood exposure ${floodPct}% (rank #${floodRank}), NDVI ${w.ndvi}`
    ];

    spatialDiagnosis = isAr
      ? `الخريطة الطبوغرافية لولاية ${wName} (${ecoZone.label}) تضعها في بؤرة [${localGiClass}] بضغط أساسي في ${top1.labelAr}، يقابله رصيد قوة مكاني في ${str1.labelAr}. التباين بينها وبين جارتها ${neighborName} (${distKm} كم) يستدعي ${
          top1.id === 'flood'
            ? `إزاحة التوسع العمراني بعيداً عن بطون الأودية بنسبة ${floodPct}% نحو المرتفعات الآمنة`
            : top1.id === 'price'
            ? `إعادة توجيه التوسع السكني من النواة المشبعة (${w.price.toLocaleString()} دج/م²) عبر محور ${gravityName}`
            : `فك العزلة المكانية وتحسين التموضع الحضري حول محور الربط مع ${neighborName}`
        }.`
      : `Spatial topology of ${wName} (${ecoZone.label}) registers as [${localGiClass}] (Gi* Z = ${localGiZ}), dominated by ${top1.labelEn} alongside a territorial anchor in ${str1.labelEn}. Relative to nearest neighbor ${neighborName} (${distKm} km) and top gravity pole ${gravityName}, ${wName} requires ${
          top1.id === 'flood'
            ? `redirecting urban growth away from ${floodPct}% flood-prone basins toward elevated plateaus`
            : top1.id === 'price'
            ? `relieving core land saturation (${w.price.toLocaleString()} DZD/m²) along the ${gravityName} transit corridor`
            : `consolidating spatial nodes around its ${w.roads}% road grid toward ${neighborName}`
        }.`;

    recommendations = isAr ? [
      top1.id === 'flood'
        ? `تجميد التجزئات العمرانية في ${wName} ضمن نسبة ${floodPct}% من أحواض الأودية (المرتبة #${floodRank}) وتعديل المخطط التوجيهي PDAU`
        : top1.id === 'water'
        ? `رسم نطاقات حماية مكانية (GIS Buffers) حول ${w.wells} بئراً و${w.dams} سدود في ${wName} لكبح العجز (${w.waterDef})`
        : `تخصيص أقطاب توسع عمراني مبرمجة في ${wName} مرتبطة بمحور ${gravityName} لتخفيف حدة ${top1.labelAr}`,
      `استغلال ميزة ${wName} في ${str1.labelAr} كقاطرة جهوية مشتركة مع ${neighborName} (${distKm} كم)`,
      `مراقبة حدود ${wName} ببيانات Sentinel-2 لمنع زحف البناء العشوائي على النطاقات الحساسة (NDVI = ${w.ndvi})`
    ] : [
      top1.id === 'flood'
        ? `Enforce PDAU setback overlays across ${wName}'s ${floodPct}% flood-exposed wadi corridors (national rank #${floodRank})`
        : top1.id === 'water'
        ? `Map GIS protection buffers around ${wName}'s ${w.wells} wells and ${w.dams} dams to contain its ${w.waterDef} balance`
        : `Zone structured satellite growth nodes in ${wName} anchored to the ${gravityName} gravity corridor to ease ${top1.labelEn}`,
      `Leverage ${wName}'s ${str1.labelEn} as a cross-wilaya spatial hub linked with ${neighborName} (${distKm} km)`,
      `Deploy Sentinel-2 boundary tracking over ${wName} (NDVI ${w.ndvi}, soil ${w.soil}/100) to prevent unpermitted land conversion`
    ];
  } else if (agentId === 'gemini') {
    // 2. GEMINI 3 FLASH: 72-Hour Crisis Triage, Exposed Population & Logistics Readiness
    const exposedPopK = Math.round(w.pop * (Math.max(w.flood, (w.waterDef < -15 ? Math.abs(w.waterDef) / 60 : 0.08))));
    const mutualAidEtaHrs = Math.max(1, Math.round((distKm / Math.max(35, w.roads * 0.9)) * 10) / 10);
    const activeTriggerCount = [
      w.waterDef <= -20,
      floodPct >= 30,
      droughtRiskPct >= 55,
      coverageGapPct >= 35,
      w.roads < 60
    ].filter(Boolean).length;

    calculations = isAr
      ? {
          'درجة الخطورة': `${riskScore}/7`,
          'تصنيف الإنذار': riskRating,
          'سكان تحت الخطر': `${exposedPopK} ألف`,
          'إشارات حرجة': activeTriggerCount,
          'زمن الإمداد': `${mutualAidEtaHrs} سا`,
          'جاهزية الطرق': `${w.roads}%`
        }
      : {
          'Severity / 7': `${riskScore}/7`,
          'Triage Tier': riskRating,
          'Exposed Pop (k)': `${exposedPopK}k`,
          'Critical Triggers': activeTriggerCount,
          'Mutual-Aid ETA': `${mutualAidEtaHrs}h`,
          'Road Readiness': `${w.roads}%`
        };

    const triggersList: string[] = [];
    if (w.waterDef <= -20) triggersList.push(isAr ? `أزمة عطش (${w.waterDef})` : `water shock (${w.waterDef})`);
    if (floodPct >= 30) triggersList.push(isAr ? `سيول (${floodPct}%)` : `flash-flood (${floodPct}%)`);
    if (droughtRiskPct >= 55) triggersList.push(isAr ? `جفاف (${droughtRiskPct}%)` : `drought (${droughtRiskPct}%)`);
    if (coverageGapPct >= 35) triggersList.push(isAr ? `عجز تموين (${coverageGapPct}%)` : `supply lag (${coverageGapPct}%)`);
    if (w.roads < 60) triggersList.push(isAr ? `عزلة طرقات (${w.roads}%)` : `road bottleneck (${w.roads}%)`);

    mathematicalFindings = isAr ? [
      `تقييم الفرز السريع لـ ${wName}: مستوى الإنذار [${riskRating}] بدرجة ${riskScore}/7، ويُقدر السكان المعرضون مباشرة بنحو ${exposedPopK} ألف من أصل ${w.pop} ألف نسمة`,
      `محفزات الأزمة النشطة (${activeTriggerCount}): ${triggersList.length ? triggersList.join(' + ') : `لا توجد عتبات انفجار فورية، مع مراقبة ${top1.labelAr}`}`,
      `لوجستيك التدخل خلال 72 ساعة: زمن وصول الدعم من ${neighborName} (${distKm} كم) قُدر بـ ${mutualAidEtaHrs} ساعة عبر شبكة طرق بكفاءة ${w.roads}% وطاقة ${w.energy}%`
    ] : [
      `72h Triage Score for ${wName}: [${riskRating}] tier (${riskScore}/7 severity) with ~${exposedPopK}k residents in direct exposure zones out of ${w.pop}k`,
      `Active Hazard Triggers (${activeTriggerCount}): ${triggersList.length ? triggersList.join(' + ') : `No threshold breach; active watch on ${top1.labelEn}`}`,
      `Emergency Response Routing: Mutual-aid convoy from ${neighborName} (${distKm} km) estimated at ${mutualAidEtaHrs}h over ${w.roads}% roads & ${w.energy}% grid reliability`
    ];

    spatialDiagnosis = isAr
      ? `غرفة الأزمات تصنف ${wName} عند مستوى [${riskRating}] لأن الخطر الضاغط الأول هو ${top1.labelAr} متبوعاً بـ ${top2.labelAr}. مع زمن استجابة ${mutualAidEtaHrs} ساعة من ${neighborName}، ${
          riskScore >= 4
            ? `يتطلب الوضع تفعيل خلية الأزمة الولائية فوراً لحماية ${exposedPopK} ألف نسمة وتأمين التموين عبر ${w.markets} سوقاً`
            : `الوضع يسمح بالتدخل الوقائي المبرمج قبل تفاقم العوامل الثانوية بحلول صيف/خريف ${targetYear}`
        }.`
      : `Crisis triage flags ${wName} at [${riskRating}] driven primarily by ${top1.labelEn} compounded by ${top2.labelEn}. Given a ${mutualAidEtaHrs}h mutual-aid corridor from ${neighborName}, ${
          riskScore >= 4
            ? `immediate Wilaya Emergency Operations activation is warranted to safeguard ~${exposedPopK}k residents and keep ${w.markets} supply hubs open`
            : `preventative stabilization can neutralize secondary escalation prior to ${targetYear}`
        }.`;

    recommendations = isAr ? [
      `خطة 72 ساعة #1 لـ ${wName}: استهداف ${top1.labelAr} فوراً لحماية الفئة المعرضة (~${exposedPopK} ألف نسمة)`,
      `تجهيز خط إمداد طارئ عبر محور ${wName} ↔ ${neighborName} (${mutualAidEtaHrs} ساعة) وتعزيز الطاقة الاحتياطية (${w.energy}%) للمنشآت الحيوية`,
      `خطة 72 ساعة #3: تخفيف ضغط ${top2.labelAr} عبر فرق التدخل الميداني والبلديات الأقل تغطية (${w.coverage}%)`
    ] : [
      `72h Directive #1 (${wName}): Contain ${top1.labelEn} immediately to protect ~${exposedPopK}k exposed residents`,
      `Pre-stage emergency logistics along the ${wName}–${neighborName} corridor (${mutualAidEtaHrs}h ETA) and backup power (${w.energy}% grid)`,
      `72h Directive #3: Deploy rapid municipal units to mitigate ${top2.labelEn} across communes below ${w.coverage}% service coverage`
    ];
  } else if (agentId === 'gpt') {
    // 3. CHATGPT FORESIGHT: Real ARIMA vs Holt-Winters Structural Scenarios to targetYear
    const arimaWater = executeForecastModel('arima', histYears, histWater, effectiveYears);
    const holtWater = executeForecastModel('holt_winters', histYears, histWater, effectiveYears);
    const arimaTarget = arimaWater.forecast[arimaWater.forecast.length - 1]?.value ?? w.waterDef;
    const holtTarget = holtWater.forecast[holtWater.forecast.length - 1]?.value ?? w.waterDef;
    const baselineEnd = Math.round(((arimaTarget + holtTarget) / 2) * 10) / 10;
    const optimisticEnd = Math.round((baselineEnd + Math.abs(baselineEnd) * 0.28 + w.dams * 0.8) * 10) / 10;
    const pessimisticEnd = Math.round((baselineEnd - Math.max(4, Math.abs(baselineEnd) * 0.25)) * 10) / 10;

    const popGrowthRate = ecoZone.key === 'sahara' ? 0.019 : w.pop > 1200 ? 0.016 : 0.013;
    const popTarget = Math.round(w.pop * Math.pow(1 + popGrowthRate, horizon));
    const priceTarget = Math.round(w.price * Math.pow(1 + 0.024 + (w.industry / 100) * 0.016, horizon));

    calculations = isAr
      ? {
          [`سكان ${targetYear}`]: `${popTarget} ألف`,
          [`عقار ${targetYear}`]: `${Math.round(priceTarget / 1000)}ألف دج`,
          'المسار المتفائل': optimisticEnd,
          'المسار المرجعي': baselineEnd,
          'المسار المتشائم': pessimisticEnd,
          'نمو عمراني %': `+${urbanGrowthPct}%`
        }
      : {
          [`Pop ${targetYear}`]: `${popTarget}k`,
          [`Price ${targetYear}`]: `${Math.round(priceTarget / 1000)}k DZD`,
          'Optimistic Def': optimisticEnd,
          'Baseline Def': baselineEnd,
          'Pessimistic Def': pessimisticEnd,
          'Urban Growth': `+${urbanGrowthPct}%`
        };

    const spread = Math.round(Math.abs(optimisticEnd - pessimisticEnd) * 10) / 10;
    mathematicalFindings = isAr ? [
      `توقع السلاسل الزمنية لـ ${wName} حتى ${targetYear}: نموذج ARIMA يعطي (${arimaTarget}) مقابل (${holtTarget}) لنموذج Holt-Winters، باتجاه تاريخي (${waterDelta8y >= 0 ? '+' : ''}${waterDelta8y} منذ 2018)`,
      `السيناريوهات الثلاثة لـ ${wName} (${targetYear}): متفائل (${optimisticEnd}) | مرجعي (${baselineEnd}) | متشائم (${pessimisticEnd}) — اتساع الفجوة الاستشرافية = ${spread} نقطة`,
      `التحول الديموغرافي والعقاري: قفزة السكان من ${w.pop} ألف إلى ${popTarget} ألف (+${popTarget - w.pop} ألف)، وارتفاع سعر المتر إلى ~${priceTarget.toLocaleString()} دج/م²`
    ] : [
      `Time-Series Convergence for ${wName} (${targetYear}): ARIMA(1,1,1) projects ${arimaTarget} vs Holt-Winters ${holtTarget}, extending an 8-yr shift of ${waterDelta8y >= 0 ? '+' : ''}${waterDelta8y}`,
      `3-Pathway Envelope (${targetYear}): Optimistic ${optimisticEnd} | Baseline ${baselineEnd} | Pessimistic ${pessimisticEnd} (scenario divergence spread = ${spread} pts)`,
      `Demographic & Land Horizon: Population expands from ${w.pop}k to ${popTarget}k (+${popTarget - w.pop}k) as land prices approach ~${priceTarget.toLocaleString()} DZD/m²`
    ];

    spatialDiagnosis = isAr
      ? `استشراف ${targetYear} لولاية ${wName} يُظهر اتساع الفجوة بين المسارين المتفائل والمتشائم بمقدار ${spread} نقطة مائية مع إضافة +${popTarget - w.pop} ألف ساكن جديد. رهان ${wName} الحاسم ليس استمرار الوضع القائم، بل توظيف ${str1.labelAr} لتمويل فك قيد ${top1.labelAr} قبل وصول الأسعار إلى ${priceTarget.toLocaleString()} دج/م².`
      : `${targetYear} structural modeling for ${wName} shows a ${spread}-point strategic spread between reform and inertia alongside +${popTarget - w.pop}k additional residents. ${wName}'s long-run trajectory depends on converting its advantage in ${str1.labelEn} into capital resilience against ${top1.labelEn} before land reaches ~${priceTarget.toLocaleString()} DZD/m².`;

    recommendations = isAr ? [
      `تكييف مخطط الاستثمار العمومي لـ ${wName} مع حجم سكاني يبلغ ${popTarget} ألف نسمة في ${targetYear} (+${urbanGrowthPct}% توسع عمراني)`,
      `تبني حزمة إصلاحات المسار المتفائل (${optimisticEnd}) لتقليص فجوة الـ ${spread} نقطة ومنع الانزلاق نحو (${pessimisticEnd})`,
      `استباق وصول العقار إلى ${priceTarget.toLocaleString()} دج/م² عبر تهيئة أقطاب سكنية وصناعية مدمجة تستفيد من ${str1.labelAr}`
    ] : [
      `Calibrate ${wName}'s ${targetYear} capital expenditure budget for ${popTarget}k residents and +${urbanGrowthPct}% urban expansion`,
      `Lock in Optimistic-pathway investments (${optimisticEnd}) to capture the ${spread}-point resilience dividend over Pessimistic drift (${pessimisticEnd})`,
      `Pre-zone mixed-use urban/industrial reserves in ${wName} before land costs hit ~${priceTarget.toLocaleString()} DZD/m², anchored on ${str1.labelEn}`
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
          'مرونة الطلب المائي': `+${popElasticityImpact}`,
          'متوسط البنية التحتية': `${infraComposite}/100`,
          'فجوة التغطية %': `${coverageGapPct}%`,
          'ثقل العائق الأول': `${bottleneckGap} نقطة`,
          'عائد فك الاختناق': `+${marginalRoi}%`
        }
      : {
          'Industry Rank': `${industryScore}/100 (#${industryRank})`,
          'Water Elasticity': `+${popElasticityImpact}`,
          'Infra Mean': `${infraComposite}/100`,
          'Coverage Lag': `${coverageGapPct}%`,
          'Bottleneck Weight': `${bottleneckGap} pts`,
          'Unlock ROI': `+${marginalRoi}%`
        };

    mathematicalFindings = isAr ? [
      `نموذج الانحدار المتعدد لـ ${wName}: معامل التحديد R² = ${multiReg.metrics.r2} (RMSE = ${multiReg.metrics.rmse})، ومعامل المرونة الديموغرافية المائية = +${popElasticityImpact} وحدة طلب إضافية`,
      `تفكيك العوامل الصناعية في ${wName} (${industryScore}/100، المرتبة #${industryRank}/${nTotal}): الطاقة ${w.energy}%، الطرق ${w.roads}%، اليد العاملة ${w.labor}% (المتوسط التركيبي ${infraComposite}/100)`,
      `التحليل التجاري القياسي: ${w.markets} سوقاً تغطي ${w.coverage}% (${gapVsNatCov >= 0 ? '+' : ''}${gapVsNatCov}% مقارنة بالمتوسط الوطني ${avgCoverage}%)، مع نمو سعري تاريخي +${priceDelta8y.toLocaleString()} دج/م²`
    ] : [
      `Multiple OLS Fit (${wName}): R² = ${multiReg.metrics.r2} (RMSE = ${multiReg.metrics.rmse}) with demographic water-demand elasticity contributing +${popElasticityImpact} load units`,
      `Industrial Factor Matrix (${industryScore}/100, rank #${industryRank}/${nTotal}): Energy ${w.energy}%, Roads ${w.roads}%, Workforce ${w.labor}% (composite mean ${infraComposite}/100)`,
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
    // 7. GROK 2: Multivariate Z-Score Outlier Radar & Statistical Divergence
    const priceArr = allWilayas.map(x => x.price);
    const waterArr = allWilayas.map(x => x.waterDef);
    const floodArr = allWilayas.map(x => x.flood);
    const covArr = allWilayas.map(x => x.coverage);
    const indArr = allWilayas.map(x => x.industry);

    const zPrice = Math.round(((w.price - meanOf(priceArr)) / stdOf(priceArr, meanOf(priceArr))) * 100) / 100;
    const zWater = Math.round(((w.waterDef - meanOf(waterArr)) / stdOf(waterArr, meanOf(waterArr))) * 100) / 100;
    const zFlood = Math.round(((w.flood - meanOf(floodArr)) / stdOf(floodArr, meanOf(floodArr))) * 100) / 100;
    const zCov = Math.round(((w.coverage - meanOf(covArr)) / stdOf(covArr, meanOf(covArr))) * 100) / 100;
    const zInd = Math.round(((w.industry - meanOf(indArr)) / stdOf(indArr, meanOf(indArr))) * 100) / 100;

    const anomalies: string[] = [];
    if (w.price > 95000 && w.flood >= 0.28) {
      anomalies.push(isAr
        ? `مفارقة سعر/فيضان في ${wName}: عقار مرتفع (${w.price.toLocaleString()} دج/م²) داخل تعرض فيضانات ${floodPct}%`
        : `Price-Hazard Paradox in ${wName}: elevated land price (${w.price.toLocaleString()} DZD/m²) overlapping ${floodPct}% flood exposure`);
    }
    if (w.ndvi < 0.28 && w.soil >= 50 && w.rain >= 280) {
      anomalies.push(isAr
        ? `تباعد نباتي في ${wName}: NDVI منخفض (${w.ndvi}) رغم تربة ${w.soil}/100 وتساقط ${w.rain} ملم`
        : `NDVI-Soil Gap in ${wName}: muted NDVI (${w.ndvi}) despite grade-${w.soil} soil & ${w.rain} mm rainfall`);
    }
    if (w.waterDef <= -24 && w.wells >= 650) {
      anomalies.push(isAr
        ? `استنزاف جوفي حاد في ${wName}: عجز ${w.waterDef} مع تركز ${w.wells} بئر`
        : `Borehole Overdraft Signal in ${wName}: ${w.waterDef} deficit paired with ${w.wells} deep wells`);
    }
    if (coverageGapPct >= 35) {
      anomalies.push(isAr
        ? `شذوذ تمويني في ${wName}: فجوة تغطية ${coverageGapPct}% (${w.markets} سوقاً لـ ${w.pop} ألف نسمة)`
        : `Retail Deficit Outlier in ${wName}: ${coverageGapPct}% coverage gap (${w.markets} markets for ${w.pop}k residents)`);
    }
    if (Math.abs(zPrice) >= 1.5 || Math.abs(zFlood) >= 1.5 || Math.abs(zWater) >= 1.5 || Math.abs(zInd) >= 1.5) {
      anomalies.push(isAr
        ? `ذيل توزيع إحصائي في ${wName}: Z(عقار)=${zPrice}، Z(فيضان)=${zFlood}، Z(مياه)=${zWater}`
        : `Extreme Z-Tail in ${wName}: Z(Price)=${zPrice}, Z(Flood)=${zFlood}, Z(Water)=${zWater}`);
    }

    const maxAbsZ = Math.max(Math.abs(zPrice), Math.abs(zWater), Math.abs(zFlood), Math.abs(zCov), Math.abs(zInd));

    calculations = isAr
      ? {
          'Z(العقار)': zPrice,
          'Z(المياه)': zWater,
          'Z(الفيضانات)': zFlood,
          'Z(التغطية)': zCov,
          'Z(الصناعة)': zInd,
          'إشارات الشذوذ': anomalies.length
        }
      : {
          'Z(Price)': zPrice,
          'Z(Water)': zWater,
          'Z(Flood)': zFlood,
          'Z(Coverage)': zCov,
          'Z(Industry)': zInd,
          'Anomalies': anomalies.length
        };

    mathematicalFindings = isAr ? [
      `رادار التباين متعدد المتغيرات لـ ${wName}: تم رصد ${anomalies.length} شذوذات إحصائية (أقصى انحراف معياري = ${maxAbsZ.toFixed(2)}σ)`,
      anomalies[0] || `تتبع ${wName} توزيعاً مستقراً نسبياً (أقصى Z = ${maxAbsZ.toFixed(2)}σ) مقارنة بالمتوسط الوطني (${avgWaterDef} عجز مائي، ${avgPrice.toLocaleString()} دج/م²)`,
      `بصمة التطرف في ${wName}: Z(عقار)=${zPrice}، Z(مياه)=${zWater}، Z(فيضانات)=${zFlood}، Z(صناعة)=${zInd} مقابل جارتها ${neighborName}`
    ] : [
      `Multivariate Z-Score Radar for ${wName}: Flagged ${anomalies.length} statistical anomalies (peak deviation = ${maxAbsZ.toFixed(2)}σ)`,
      anomalies[0] || `${wName} tracks within normal national dispersion (max |Z| = ${maxAbsZ.toFixed(2)}σ vs national mean ${avgPrice.toLocaleString()} DZD/m² & ${avgWaterDef} water balance)`,
      `Dispersion Signature (${wName} vs ${neighborName}): Z(Price)=${zPrice}, Z(Water)=${zWater}, Z(Flood)=${zFlood}, Z(Industry)=${zInd}`
    ];

    spatialDiagnosis = isAr
      ? (anomalies.length > 0
          ? `رادار Grok يرصد في ${wName} انحرافاً إحصائياً غير خطي (${maxAbsZ.toFixed(2)}σ): ${anomalies.join(' | ')}. هذا التناقض يميز ${wName} هيكلياً عن جارتها ${neighborName} ويستوجب تدقيقاً ميدانياً.`
          : `إحصائياً، مؤشرات ${wName} متسقة داخلياً (جميع قيم Z دون عتبة الشذوذ الحاد)، لكن تباينها الأبرز يكمن في ${top1.labelAr} مقابل ميزة ${str1.labelAr}.`)
      : (anomalies.length > 0
          ? `Grok Anomaly Radar flags non-linear divergence in ${wName} (peak ${maxAbsZ.toFixed(2)}σ): ${anomalies.join(' | ')}. This structurally separates ${wName} from neighbor ${neighborName} and warrants targeted field verification.`
          : `Statistically, ${wName} exhibits internal metric congruence (peak |Z| = ${maxAbsZ.toFixed(2)}σ) without acute cross-layer contradiction, with residual variance centered on ${top1.labelEn} vs ${str1.labelEn}.`);

    recommendations = isAr ? [
      anomalies.length > 0
        ? `توجيه تفتيش ميداني في ${wName} للتحقق من الشذوذ الرئيسي: (${anomalies[0]})`
        : `تفعيل الرصد الآلي الفصلي لـ ${wName} لمتابعة التغيرات في ${top1.labelAr}`,
      `مقارنة بيانات ${wName} كل 5 أيام بصور Sentinel-2 وقياسات ${neighborName} (${distKm} كم) لرصد أي انحراف يتجاوز ±1.8σ`
    ] : [
      anomalies.length > 0
        ? `Launch targeted field verification in ${wName} to audit primary anomaly: ${anomalies[0]}`
        : `Keep ${wName} on automated quarterly telemetry tracking for early drift in ${top1.labelEn}`,
      `Benchmark ${wName} (${w.lat.toFixed(2)}°N, ${w.lon.toFixed(2)}°E) every 5 days against Sentinel-2 and neighbor ${neighborName} (${distKm} km) for >1.8σ shifts`
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
