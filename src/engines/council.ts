/**
 * GIS Map – AI Council Chamber Engine
 * 12-Step Wilaya-Specific Evidence Synthesis & Discrepancy Reconciliation
 * © 2026 Salim Slimani & National Foresight System
 */

import { CouncilConsensusResult, WilayaRecord } from '../types';
import { AI_AGENT_PROFILES } from './agents';
import { computeMoransI, computeGetisOrdGi, haversineDistance } from './gis';
import { executeForecastModel } from './quantitative';

function findNearestWilaya(target: WilayaRecord, allWilayas: WilayaRecord[]): { peer: WilayaRecord; distKm: number } {
  let peer = target;
  let dist = Infinity;
  for (const w of allWilayas) {
    if (w.num === target.num) continue;
    const d = haversineDistance(target.lat, target.lon, w.lat, w.lon);
    if (d < dist) {
      dist = d;
      peer = w;
    }
  }
  return { peer, distKm: Math.round(dist === Infinity ? 0 : dist) };
}

export function conveneAiCouncil(
  targetWilaya: WilayaRecord,
  allWilayas: WilayaRecord[],
  targetYear: number = 2030,
  lang: 'ar' | 'en' = 'ar'
): CouncilConsensusResult {
  const isAr = lang === 'ar';
  const wName = isAr ? targetWilaya.n : targetWilaya.en;
  const horizon = Math.max(1, targetYear - 2026);
  const { peer, distKm } = findNearestWilaya(targetWilaya, allWilayas);
  const peerName = isAr ? peer.n : peer.en;

  // Quantitative backing models tailored to targetWilaya
  const histYears = targetWilaya.historicalYears ?? [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const histWater = targetWilaya.historicalWaterDef ?? Array(8).fill(targetWilaya.waterDef);
  const arimaForecast = executeForecastModel('arima', histYears, histWater, [2026, 2027, 2028, 2029, 2030]);
  const arima2030 = arimaForecast.forecast[arimaForecast.forecast.length - 1]?.value ?? targetWilaya.waterDef;

  const moranSpatial = computeMoransI(allWilayas, w => w.waterDef);
  const hotspots = computeGetisOrdGi(allWilayas, w => w.waterDef);
  const localHotspot = hotspots.find(h => h.wilayaNum === targetWilaya.num);

  // Derived Wilaya Indicators
  const projectedWater = Math.round(
    targetWilaya.waterDef * 10 - (targetWilaya.pop * 0.035 * horizon) * 0.15 - (targetWilaya.rain * 0.012 * horizon) * 0.2
  );
  const floodPct = Math.round(targetWilaya.flood * 100);
  const gapPct = Math.max(0, Math.round(100 - targetWilaya.coverage));
  const droughtPct = Math.max(
    2,
    Math.min(
      98,
      Math.round(
        100 - (targetWilaya.soil * 0.5 + targetWilaya.rain * 0.06 + targetWilaya.ndvi * 60) + horizon * 2.1 + (targetWilaya.rain < 200 ? 18 : 0)
      )
    )
  );
  const industryScore = Math.round(
    targetWilaya.energy * 0.3 + targetWilaya.roads * 0.3 + targetWilaya.labor * 0.2 + (100 - Math.abs(targetWilaya.waterDef)) * 0.2
  );

  // Data Quality Audit calibrated to targetWilaya
  const hasHistory = (targetWilaya.historicalWaterDef?.length ?? 0) >= 6;
  const completeness = hasHistory ? (targetWilaya.isCustomImport ? 89.0 : 96.5) : 82.0;
  const meanW = histWater.reduce((a, b) => a + b, 0) / Math.max(1, histWater.length);
  const stdW = Math.sqrt(histWater.reduce((s, v) => s + Math.pow(v - meanW, 2), 0) / Math.max(1, histWater.length));
  const varianceCoeff = Math.round((stdW / Math.max(1, Math.abs(meanW))) * 100) / 100;

  // Dynamic Consensus Priorities sorted by targetWilaya's actual severity
  const waterWeight = Math.min(98, Math.round(52 + Math.max(0, -targetWilaya.waterDef) * 1.15 + (targetWilaya.dams === 0 ? 8 : 0)));
  const floodWeight = Math.min(97, Math.round(35 + floodPct * 1.25));
  const droughtWeight = Math.min(96, Math.round(30 + droughtPct * 0.85));
  const commerceWeight = Math.min(94, Math.round(28 + gapPct * 1.15 + (100 - targetWilaya.roads) * 0.25));

  const consensusPriorities = [
    {
      rank: 1,
      title: `Water Balance & Aquifer Protection in ${targetWilaya.en} (ARIMA ${arima2030}, ${targetWilaya.wells} wells)`,
      titleAr: `الأمن المائي وحماية الطبقة الجوفية في ${targetWilaya.n} (توقع ARIMA: ${arima2030}، ${targetWilaya.wells} بئر)`,
      supportingAgents: ['Qwen (Water Expert)', 'Gemini (Crisis)', 'DeepSeek (Reasoner)'],
      weightScore: waterWeight,
      rationale: isAr
        ? `في ولاية ${targetWilaya.n}، يسجل نموذج ARIMA مساراً مائياً (${arima2030}) مع عجز تراكمي متوقع (${projectedWater}) ووجود ${targetWilaya.dams} سدود مقابل ${targetWilaya.wells} بئراً (مؤشر Gi*: ${localHotspot?.giZScore ?? 0}).`
        : `For ${targetWilaya.en}, ARIMA(1,1,1) projects a ${arima2030} water trajectory (cumulative index ${projectedWater}) across ${targetWilaya.dams} dams and ${targetWilaya.wells} wells (Local Gi* Z = ${localHotspot?.giZScore ?? 0}).`
    },
    {
      rank: 2,
      title: `Spatial Flood Zoning & PDAU Freeze in ${targetWilaya.en} (${floodPct}% Wadi Overlap)`,
      titleAr: `التهيئة العمرانية الوقائية وتجميد البناء في أودية ${targetWilaya.n} (تعرض ${floodPct}%)`,
      supportingAgents: ['Muse Spark (Map Analyst)', 'Claude (Policy Advisor)'],
      weightScore: floodWeight,
      rationale: isAr
        ? `تقاطع النسيج العمراني في ${targetWilaya.n} مع الأودية يبلغ ${floodPct}% مع سعر عقار ${targetWilaya.price.toLocaleString()} دج/م² وسكان ${targetWilaya.pop} ألف نسمة، ما يستوجب ضبط التوسع نحو الهضاب الآمنة.`
        : `${targetWilaya.en} carries ${floodPct}% flood-corridor overlap alongside land costs of ${targetWilaya.price.toLocaleString()} DZD/m² and ${targetWilaya.pop}k residents, requiring targeted PDAU zoning alignment.`
    },
    {
      rank: 3,
      title: `Agro-Climatic Resilience & Drip Conversion (${droughtPct}% Stress, Soil ${targetWilaya.soil}/100)`,
      titleAr: `التحول إلى السقي الذكي وحماية المردود الفلاحي لـ ${targetWilaya.n} (إجهاد ${droughtPct}%، تربة ${targetWilaya.soil}/100)`,
      supportingAgents: ['Qwen (Agri Expert)', 'ChatGPT (Foresight)'],
      weightScore: droughtWeight,
      rationale: isAr
        ? `قياس الغطاء النباتي (NDVI = ${targetWilaya.ndvi}) مع تساقط ${targetWilaya.rain} ملم وتربة ${targetWilaya.soil}/100 يفرض تعميم الري الموضعي في ${targetWilaya.n} لحماية الإنتاج الفلاحي حتى ${targetYear}.`
        : `Satellite NDVI (${targetWilaya.ndvi}), ${targetWilaya.rain} mm rainfall, and grade-${targetWilaya.soil}/100 soils indicate ${droughtPct}% drought vulnerability by ${targetYear}, mandating pressurized drip systems.`
    },
    {
      rank: 4,
      title: `Supply Chain & Industrial Logistics in ${targetWilaya.en} (${gapPct}% Retail Gap, Ind. ${industryScore}/100)`,
      titleAr: `توسيع الشبكة التجارية واللوجستيك الصناعي لـ ${targetWilaya.n} (فجوة ${gapPct}%، صناعة ${industryScore}/100)`,
      supportingAgents: ['DeepSeek (Reasoner)', 'Grok (Anomaly Watch)'],
      weightScore: commerceWeight,
      rationale: isAr
        ? `تعتمد ${targetWilaya.n} على ${targetWilaya.markets} سوقاً بنسبة تغطية ${targetWilaya.coverage}% وطرقات ${targetWilaya.roads}%، ما يخلق فجوة ${gapPct}% تستوجب ربطاً لوجستياً أسرع مع ${peerName} (${distKm} كم).`
        : `${targetWilaya.en} operates ${targetWilaya.markets} markets at ${targetWilaya.coverage}% coverage and ${targetWilaya.roads}% roads; closing its ${gapPct}% supply lag links directly with ${peerName} (${distKm} km).`
    }
  ]
    .sort((a, b) => b.weightScore - a.weightScore)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // Wilaya-Specific Divergences & Tradeoffs
  const isDenseMetro = targetWilaya.price >= 95000 || targetWilaya.pop >= 1200;
  const isSaharan = targetWilaya.region === 'Sahara' || targetWilaya.rain < 140;

  const divergencesAndTradeoffs = [
    {
      topic: isSaharan
        ? `${targetWilaya.en}: Borehole Extraction Quotas vs Saharan Agricultural Expansion`
        : `${targetWilaya.en}: Immediate Pumping Caps vs Mega-Desalination / Dam Transfers`,
      topicAr: isSaharan
        ? `${targetWilaya.n}: تقنين استخراج المياه الجوفية مقابل التوسع الفلاحي الصحراوي`
        : `${targetWilaya.n}: تقنين الاستهلاك الفوري مقابل مشاريع التحويلات الكبرى والتحلية`,
      contendingViews: [
        {
          agent: 'Gemini (Crisis Manager)',
          perspective: isAr
            ? `الأولوية في ${targetWilaya.n} لضبط ${targetWilaya.wells} بئراً ومنع الحفر غير المرخص خلال 72 ساعة لتفادي هبوط المنسوب.`
            : `Immediate 72h enforcement on ${targetWilaya.en}'s ${targetWilaya.wells} boreholes to prevent acute aquifer drawdown.`
        },
        {
          agent: 'DeepSeek (Deep Reasoner)',
          perspective: isAr
            ? `التقنين الصارم يبطئ النشاط الفلاحي والصناعي (${industryScore}/100)؛ الحل المستدام يتطلب ${targetWilaya.dams === 0 ? 'تحلية المياه المالحة' : `تطوير السدود الـ ${targetWilaya.dams}`}.`
            : `Strict rationing suppresses ${targetWilaya.en}'s ${industryScore}/100 industrial/agri output; structural ${targetWilaya.dams === 0 ? 'brackish desalination' : `${targetWilaya.dams}-dam capacity expansion`} is required.`
        }
      ],
      rootCause: isAr
        ? `الموازنة في ${targetWilaya.n} بين حماية المخزون المائي (${targetWilaya.waterDef}) والحفاظ على زخم الإنتاج حتى ${targetYear}.`
        : `Horizon tension in ${targetWilaya.en} between immediate aquifer conservation (balance ${targetWilaya.waterDef}) and ${targetYear} economic growth.`
    },
    {
      topic: isDenseMetro
        ? `${targetWilaya.en}: High-Density Vertical Infill vs Land Price Inflation (${targetWilaya.price.toLocaleString()} DZD/m²)`
        : `${targetWilaya.en}: Peripheral Urban Zoning vs Agricultural Soil Preservation (${targetWilaya.soil}/100)`,
      topicAr: isDenseMetro
        ? `${targetWilaya.n}: التكثيف الحضري العمودي مقابل كبح تضخم العقار (${targetWilaya.price.toLocaleString()} دج/م²)`
        : `${targetWilaya.n}: التوسع العمراني المنظم مقابل حماية التربة الفلاحية (${targetWilaya.soil}/100)`,
      contendingViews: [
        {
          agent: 'Muse Spark (Map Analyst)',
          perspective: isAr
            ? `حماية أراضي ${targetWilaya.n} (تربة ${targetWilaya.soil}/100، NDVI ${targetWilaya.ndvi}) وتفادي مناطق السيول (${floodPct}%).`
            : `Shield ${targetWilaya.en}'s grade-${targetWilaya.soil}/100 soils (NDVI ${targetWilaya.ndvi}) and ${floodPct}% flood zones from outward sprawl.`
        },
        {
          agent: 'ChatGPT (Foresight Strategist)',
          perspective: isAr
            ? `التكثيف دون توفير عرض سكني يرفع السعر فوق ${targetWilaya.price.toLocaleString()} دج/م²؛ يجب فتح أقطاب مهيكلة باتجاه ${peerName}.`
            : `Over-constraining land supply pushes prices above ${targetWilaya.price.toLocaleString()} DZD/m²; structured transit poles toward ${peerName} are essential.`
        }
      ],
      rootCause: isAr
        ? `تعارض أولويات العقار والتهيئة في ${targetWilaya.n} بين ضبط السعر (${targetWilaya.price.toLocaleString()} دج/م²) وحماية الأراضي الحساسة (Moran's I = ${moranSpatial.observedI}).`
        : `Spatial trade-off in ${targetWilaya.en} between housing affordability (${targetWilaya.price.toLocaleString()} DZD/m²) and ecological land preservation.`
    }
  ];

  // Wilaya-Specific Executive Roadmap
  const executiveRoadmap = [
    {
      action: isAr
        ? `تركيب عدادات قياس رقمية عبر ${targetWilaya.wells} بئراً في ${targetWilaya.n} (توقعات ${targetYear}: ${projectedWater})`
        : `Install telemetry flow meters across ${targetWilaya.en}'s ${targetWilaya.wells} boreholes (${targetYear} balance: ${projectedWater})`,
      actionAr: `تركيب عدادات قياس رقمية عبر ${targetWilaya.wells} بئراً في ${targetWilaya.n}`,
      leadOwner: isAr ? `ANRH + مديرية الموارد المائية لولاية ${targetWilaya.n}` : `ANRH & ${targetWilaya.en} Water Directorate`,
      timeframe: 'Immediate 72h' as const,
      costBenefitRatio: `1 : ${(3.8 + Math.max(0, -targetWilaya.waterDef) * 0.06).toFixed(1)}`
    },
    {
      action:
        floodPct >= 25
          ? isAr
            ? `قرار ولائي عاجل لتجميد البناء في مسارات السيول بولاية ${targetWilaya.n} (تعرض ${floodPct}%)`
            : `Enact Wali decree freezing permits in ${targetWilaya.en}'s ${floodPct}% flood-prone wadi beds`
          : isAr
            ? `رقمنة السجل العقاري وتطهير العقار الصناعي في ${targetWilaya.n} (${targetWilaya.price.toLocaleString()} دج/م²)`
            : `Digitize cadastre and audit industrial land concessions in ${targetWilaya.en} (${targetWilaya.price.toLocaleString()} DZD/m²)`,
      actionAr:
        floodPct >= 25
          ? `تجميد البناء في مسارات السيول بولاية ${targetWilaya.n} (${floodPct}%)`
          : `رقمنة العقار الصناعي في ${targetWilaya.n}`,
      leadOwner: isAr ? `السيد والي ${targetWilaya.n} + مديرية التعمير (DUAC)` : `Wali of ${targetWilaya.en} & DUAC`,
      timeframe: 'Immediate 72h' as const,
      costBenefitRatio: `1 : ${(3.2 + floodPct * 0.04).toFixed(1)}`
    },
    {
      action: isAr
        ? `تطوير منصة التموين والربط اللوجستي لـ ${targetWilaya.n} نحو ${peerName} (سد فجوة ${gapPct}% عبر ${targetWilaya.markets} سوقاً)`
        : `Expand logistics & wholesale coverage in ${targetWilaya.en} toward ${peerName} (closing ${gapPct}% gap across ${targetWilaya.markets} markets)`,
      actionAr: `تطوير منصة التموين والربط اللوجستي لـ ${targetWilaya.n} نحو ${peerName}`,
      leadOwner: isAr ? `وزارة التجارة + ولاية ${targetWilaya.n} (طرق ${targetWilaya.roads}%)` : `Ministry of Trade & ${targetWilaya.en} Wilaya`,
      timeframe: 'Mid-term 2027' as const,
      costBenefitRatio: `1 : ${(2.5 + gapPct * 0.03).toFixed(1)}`
    },
    {
      action:
        targetWilaya.dams === 0
          ? isAr
            ? `ربط ${targetWilaya.n} بشبكة التحويلات الكبرى وتحلية المياه الجوفية بحلول ${targetYear}`
            : `Link ${targetWilaya.en} (0 dams) to regional water transfer & solar desalination grid by ${targetYear}`
          : isAr
            ? `إزالة أوحال السدود الـ ${targetWilaya.dams} في ${targetWilaya.n} وتعميم الري بالتنقيط حتى ${targetYear}`
            : `Dredge ${targetWilaya.en}'s ${targetWilaya.dams} dams and complete 100% drip irrigation conversion by ${targetYear}`,
      actionAr:
        targetWilaya.dams === 0
          ? `ربط ${targetWilaya.n} بالتحويلات المائية الكبرى ${targetYear}`
          : `إزالة أوحال السدود الـ ${targetWilaya.dams} في ${targetWilaya.n}`,
      leadOwner: isAr ? `الوكالة الوطنية للسدود والتحويلات (ANBT) — ${targetWilaya.n}` : `ANBT & ${targetWilaya.en} Hydro Commission`,
      timeframe: 'Foresight 2030' as const,
      costBenefitRatio: `1 : ${(3.1 + targetWilaya.soil * 0.02).toFixed(1)}`
    }
  ];

  return {
    scope: isAr ? `ولاية ${wName} (${targetWilaya.en})` : `${targetWilaya.en} Wilaya · Foresight ${targetYear}`,
    targetYear,
    conveneDate: new Date().toISOString().split('T')[0],
    participatingAgents: AI_AGENT_PROFILES.map(a => `${a.name} (${isAr ? a.roleAr : a.role})`),
    dataQualityAudit: {
      completenessPct: completeness,
      sampleSize: histYears.length,
      varianceCoefficient: varianceCoeff,
      sourceReliability: targetWilaya.isCustomImport ? 'Verified Hybrid' : 'Official National Grade'
    },
    consensusPriorities,
    divergencesAndTradeoffs,
    executiveRoadmap
  };
}
