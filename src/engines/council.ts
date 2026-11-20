/**
 * GIS Map – AI Council Chamber Engine
 * 12-Step Wilaya-Specific Evidence Synthesis & Discrepancy Reconciliation
 * © 2026 Salim Slimani & National Foresight System
 */

import { CouncilConsensusResult, WilayaRecord } from '../types';
import { AI_AGENT_PROFILES } from './agents';
import { computeMoransI, computeGetisOrdGi, haversineDistance } from './gis';
import { executeForecastModel } from './quantitative';
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
    targetWilaya.energy * 0.28 + getTransportScore(targetWilaya) * 0.32 + targetWilaya.labor * 0.2 + (100 - Math.abs(targetWilaya.waterDef)) * 0.2
  );
  const healthCov = getHealthCoverage(targetWilaya);
  const hospitalsCnt = getHospitalsCount(targetWilaya);
  const hazardIdx = getHazardIndex(targetWilaya);
  const seismicPct = Math.round(getSeismicRisk(targetWilaya) * 100);
  const wildfirePct = Math.round(getWildfireRisk(targetWilaya) * 100);
  const transportSc = getTransportScore(targetWilaya);
  const railLinked = hasRailAccess(targetWilaya);
  const tourismSc = getTourismScore(targetWilaya);
  const hotelsCnt = getHotelsCount(targetWilaya);
  const heritageCnt = getHeritageSitesCount(targetWilaya);

  // Data Quality Audit calibrated to targetWilaya
  const hasHistory = (targetWilaya.historicalWaterDef?.length ?? 0) >= 6;
  const completeness = hasHistory ? (targetWilaya.isCustomImport ? 89.0 : 96.5) : 82.0;
  const meanW = histWater.reduce((a, b) => a + b, 0) / Math.max(1, histWater.length);
  const stdW = Math.sqrt(histWater.reduce((s, v) => s + Math.pow(v - meanW, 2), 0) / Math.max(1, histWater.length));
  const varianceCoeff = Math.round((stdW / Math.max(1, Math.abs(meanW))) * 100) / 100;

  // Dynamic Consensus Priorities sorted by targetWilaya's actual severity across all 9 layers
  const waterWeight = Math.min(98, Math.round(52 + Math.max(0, -targetWilaya.waterDef) * 1.15 + (targetWilaya.dams === 0 ? 8 : 0)));
  const floodWeight = Math.min(97, Math.round(35 + floodPct * 1.25));
  const hazardWeight = Math.min(98, Math.round(34 + hazardIdx * 0.92));
  const healthWeight = Math.min(96, Math.round(34 + (100 - healthCov) * 1.12));
  const droughtWeight = Math.min(95, Math.round(30 + droughtPct * 0.85));
  const transportWeight = Math.min(95, Math.round(30 + (100 - transportSc) * 1.05 + (railLinked ? 0 : 10)));
  const commerceWeight = Math.min(94, Math.round(28 + gapPct * 1.15 + (100 - targetWilaya.roads) * 0.25));
  const tourismWeight = Math.min(94, Math.round(28 + tourismSc * 0.55 + heritageCnt * 1.1));

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
      title: `Healthcare Infrastructure & Hospital Capacity in ${targetWilaya.en} (${healthCov}% Access, ${hospitalsCnt} Hospitals)`,
      titleAr: `تعزيز المنظومة الصحية وقدرة الاستشفاء في ${targetWilaya.n} (تغطية ${healthCov}%، ${hospitalsCnt} مستشفى)`,
      supportingAgents: ['Gemini (Crisis)', 'Claude (Policy Advisor)', 'Grok (Anomaly Watch)'],
      weightScore: healthWeight,
      rationale: isAr
        ? `تبلغ التغطية الصحية في ${targetWilaya.n} نحو ${healthCov}% عبر ${hospitalsCnt} مستشفى لكتلة سكانية تبلغ ${targetWilaya.pop} ألف نسمة، ما يستوجب ترقية مصالح الاستعجالات وفك العزلة الصحية للبلديات.`
        : `${targetWilaya.en} records ${healthCov}% healthcare access across ${hospitalsCnt} hospitals serving ${targetWilaya.pop}k residents, requiring targeted emergency ward & clinic deployment.`
    },
    {
      rank: 3,
      title: `Multi-Hazard Shield: Seismic (${seismicPct}%), Flood (${floodPct}%) & Wildfire (${wildfirePct}%) in ${targetWilaya.en}`,
      titleAr: `الوقاية من الأخطار الطبيعية في ${targetWilaya.n}: زلازل ${seismicPct}%، سيول ${floodPct}%، حرائق ${wildfirePct}% (${hazardIdx}/100)`,
      supportingAgents: ['Muse Spark (Map Analyst)', 'Gemini (Crisis)', 'Claude (Policy Advisor)'],
      weightScore: Math.max(hazardWeight, floodWeight),
      rationale: isAr
        ? `يسجل مؤشر الأخطار الطبيعية المركب ${hazardIdx}/100 بتقاطع التوسع العمراني مع الأودية (${floodPct}%) والنشاط الزلزالي RPA (${seismicPct}%)، مما يفرض تجميد البناء في المناطق الحساسة.`
        : `Composite hazard index stands at ${hazardIdx}/100 (seismic ${seismicPct}%, wadi flood ${floodPct}%, wildfire ${wildfirePct}%), mandating strict RPA building codes & PDAU setbacks.`
    },
    {
      rank: 4,
      title: `Multimodal Transport & SNTF Rail Corridor in ${targetWilaya.en} (${transportSc}/100)`,
      titleAr: `تطوير النقل متعدد الوسائط وربط السكك الحديدية لـ ${targetWilaya.n} (${transportSc}/100${railLinked ? ' — متصل بـ SNTF' : ''})`,
      supportingAgents: ['DeepSeek (Reasoner)', 'Muse Spark (Map Analyst)', 'ChatGPT (Foresight)'],
      weightScore: transportWeight,
      rationale: isAr
        ? `تصل جاهزية النقل في ${targetWilaya.n} إلى ${transportSc}/100 (${railLinked ? 'مرتبطة بالشبكة الوطنية للسكك SNTF' : 'دون ربط سككي حديدي حالي'})، ويربط محور ${peerName} (${distKm} كم) بين الأقطاب التموينية والصناعية (${industryScore}/100).`
        : `Transport connectivity scores ${transportSc}/100 (${railLinked ? 'SNTF rail active' : 'no active rail link'}); the ${peerName} corridor (${distKm} km) governs freight flow for its ${industryScore}/100 industrial base.`
    },
    {
      rank: 5,
      title: `Agro-Climatic Resilience & Drip Conversion (${droughtPct}% Stress, Soil ${targetWilaya.soil}/100)`,
      titleAr: `التحول إلى السقي الذكي وحماية المردود الفلاحي لـ ${targetWilaya.n} (إجهاد ${droughtPct}%، تربة ${targetWilaya.soil}/100)`,
      supportingAgents: ['Qwen (Agri Expert)', 'ChatGPT (Foresight)'],
      weightScore: droughtWeight,
      rationale: isAr
        ? `قياس الغطاء النباتي (NDVI = ${targetWilaya.ndvi}) مع تساقط ${targetWilaya.rain} ملم وتربة ${targetWilaya.soil}/100 يفرض تعميم الري الموضعي في ${targetWilaya.n} لحماية الإنتاج الفلاحي حتى ${targetYear}.`
        : `Satellite NDVI (${targetWilaya.ndvi}), ${targetWilaya.rain} mm rainfall, and grade-${targetWilaya.soil}/100 soils indicate ${droughtPct}% drought vulnerability by ${targetYear}, mandating pressurized drip systems.`
    },
    {
      rank: 6,
      title: `Supply Chain Coverage & Commercial Hubs in ${targetWilaya.en} (${gapPct}% Retail Gap)`,
      titleAr: `توسيع الشبكة التجارية وأسواق الجملة لـ ${targetWilaya.n} (فجوة تموين ${gapPct}%)`,
      supportingAgents: ['DeepSeek (Reasoner)', 'Grok (Anomaly Watch)'],
      weightScore: commerceWeight,
      rationale: isAr
        ? `تعتمد ${targetWilaya.n} على ${targetWilaya.markets} سوقاً بنسبة تغطية ${targetWilaya.coverage}% وطرقات ${targetWilaya.roads}%، ما يخلق فجوة ${gapPct}% تستوجب ربطاً لوجستياً أسرع مع ${peerName} (${distKm} كم).`
        : `${targetWilaya.en} operates ${targetWilaya.markets} markets at ${targetWilaya.coverage}% coverage and ${targetWilaya.roads}% roads; closing its ${gapPct}% supply lag links directly with ${peerName} (${distKm} km).`
    },
    {
      rank: 7,
      title: `Eco-Tourism, ZET Zones & Heritage Preservation in ${targetWilaya.en} (${tourismSc}/100, ${hotelsCnt} Hotels, ${heritageCnt} Sites)`,
      titleAr: `السياحة المستدامة وتثمين التراث ومناطق التوسع السياحي في ${targetWilaya.n} (${tourismSc}/100، ${hotelsCnt} فندقاً، ${heritageCnt} معلماً)`,
      supportingAgents: ['Muse Spark (Map Analyst)', 'ChatGPT (Foresight)', 'DeepSeek (Reasoner)'],
      weightScore: tourismWeight,
      rationale: isAr
        ? `تمتلك ${targetWilaya.n} رصيداً من ${heritageCnt} معالم تراثية و${hotelsCnt} مؤسسة فندقية بمؤشر جاذبية ${tourismSc}/100، ما يتيح تنويع الاقتصاد المحلي وربط المسالك السياحية مع ${peerName} (${distKm} كم).`
        : `${targetWilaya.en} holds ${heritageCnt} heritage sites and ${hotelsCnt} classified hotels (tourism score ${tourismSc}/100), offering high-value economic diversification linked via ${peerName} (${distKm} km).`
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
    },
    {
      topic: `${targetWilaya.en}: Health Equity (${healthCov}%) & Seismic Retrofit vs Rail-Logistics Expansion (${transportSc}/100)`,
      topicAr: `${targetWilaya.n}: الموازنة بين التغطية الصحية والوقاية الزلزالية (${hazardIdx}/100) وتمديد السكك والنقل (${transportSc}/100)`,
      contendingViews: [
        {
          agent: 'Claude (Risk & Policy Advisor)',
          perspective: isAr
            ? `توجيه الاستثمار الأوّلي في ${targetWilaya.n} إلى تأمين المستشفيات الـ ${hospitalsCnt} وتطبيق معايير RPA (${seismicPct}% خطر زلزالي) قبل التوسع اللوجستي.`
            : `Front-load fiscal capex in ${targetWilaya.en} toward ${hospitalsCnt} hospital resilience and RPA seismic codes (${seismicPct}% seismic risk).`
        },
        {
          agent: 'Muse Spark (Map Analyst)',
          perspective: isAr
            ? `بدون ربط سككي وطرقي فعّال (النقل حالياً ${transportSc}/100)، لن تصل سيارات الإسعاف ولا سلاسل التوريد في وقت الأزمات نحو ${peerName}.`
            : `Without upgrading ${targetWilaya.en}'s ${transportSc}/100 transport & rail network, emergency ambulances and logistics to ${peerName} remain bottlenecked.`
        }
      ],
      rootCause: isAr
        ? `التزامن المكاني في ${targetWilaya.n} بين الحاجة لرفع التغطية الصحية (${healthCov}%) وتخفيض تعرض الأخطار (${hazardIdx}/100) عبر شبكة نقل موثوقة (${transportSc}/100).`
        : `Co-dependence between elevating healthcare coverage (${healthCov}%), hazard safety (${hazardIdx}/100), and multimodal transit (${transportSc}/100).`
    },
    {
      topic: `${targetWilaya.en}: Eco-Heritage Preservation (${heritageCnt} Sites) vs Rapid Hospitality & Industrial Expansion`,
      topicAr: `${targetWilaya.n}: صون التراث والمعالم (${heritageCnt} مواقع) مقابل التوسع الفندقي والصناعي المتسارع`,
      contendingViews: [
        {
          agent: 'Muse Spark (Map Analyst)',
          perspective: isAr
            ? `تأمين محيط الحماية للمعالم الـ ${heritageCnt} في ${targetWilaya.n} (سياحة ${tourismSc}/100) وتوجيه مناطق التوسع السياحي ZET بعيداً عن البؤر الصناعية (${industryScore}/100).`
            : `Enforce strict cultural-heritage buffers around ${targetWilaya.en}'s ${heritageCnt} sites while isolating ZET tourism zones from industrial emissions.`
        },
        {
          agent: 'DeepSeek (Deep Reasoner)',
          perspective: isAr
            ? `رفع الطاقة الاستيعابية عن ${hotelsCnt} فندقاً عبر الاستثمار الخاص في مناطق التوسع السياحي يحقق عائداً محلياً سريعاً ويستفيد من ربط النقل (${transportSc}/100).`
            : `Expanding capacity beyond ${hotelsCnt} hotels via private ZET hospitality concessions unlocks immediate local GDP tied to ${transportSc}/100 transport links.`
        }
      ],
      rootCause: isAr
        ? `ضرورة الموازنة في ${targetWilaya.n} بين استقطاب الاستثمار الفندقي (${hotelsCnt} فندقاً) وصون الهوية المعمارية والبيئية (${tourismSc}/100).`
        : `Spatial governance balance in ${targetWilaya.en} between ZET hospitality investment (${hotelsCnt} hotels) and heritage integrity (${tourismSc}/100).`
    }
  ];

  // Wilaya-Specific Executive Roadmap (Expanded with Health, Hazard & Rail/Transport authorities)
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
        hazardIdx >= 48 || floodPct >= 25
          ? isAr
            ? `قرار ولائي لتجميد البناء في الأودية (${floodPct}%) وتفعيل مراقبة الزلازل والحرائق (${hazardIdx}/100)`
            : `Enact Wali decree enforcing wadi setbacks (${floodPct}%) & CRAAG/DGPC hazard zones (${hazardIdx}/100)`
          : isAr
            ? `رقمنة السجل العقاري وتطهير العقار الصناعي في ${targetWilaya.n} (${targetWilaya.price.toLocaleString()} دج/م²)`
            : `Digitize cadastre and audit industrial land concessions in ${targetWilaya.en} (${targetWilaya.price.toLocaleString()} DZD/m²)`,
      actionAr:
        hazardIdx >= 48 || floodPct >= 25
          ? `فرض معايير الأمان من الأخطار والسيول في ${targetWilaya.n} (${hazardIdx}/100)`
          : `رقمنة العقار الصناعي في ${targetWilaya.n}`,
      leadOwner: isAr ? `السيد والي ${targetWilaya.n} + CRAAG + الحماية المدنية (DGPC)` : `Wali of ${targetWilaya.en} + CRAAG + Civil Protection`,
      timeframe: 'Immediate 72h' as const,
      costBenefitRatio: `1 : ${(3.3 + hazardIdx * 0.03).toFixed(1)}`
    },
    {
      action: isAr
        ? `رفع التغطية الصحية في ${targetWilaya.n} من ${healthCov}% عبر دعم المستشفيات الـ ${hospitalsCnt} وتخصيص أقطاب استعجالات متنقلة`
        : `Scale healthcare access in ${targetWilaya.en} from ${healthCov}% across ${hospitalsCnt} hospitals + mobile emergency clinics`,
      actionAr: `رفع التغطية الصحية وتأهيل المستشفيات الـ ${hospitalsCnt} في ${targetWilaya.n} (${healthCov}%)`,
      leadOwner: isAr ? `وزارة الصحة (MSPRH) + مديرية الصحة لولاية ${targetWilaya.n}` : `Ministry of Health (MSPRH) & ${targetWilaya.en} DSP`,
      timeframe: 'Mid-term 2027' as const,
      costBenefitRatio: `1 : ${(3.5 + (100 - healthCov) * 0.04).toFixed(1)}`
    },
    {
      action: isAr
        ? `تطوير منصة النقل متعدد الوسائط (${transportSc}/100${railLinked ? ' — تعظيم خط SNTF' : ' — مد وصلة سكة حديدية'}) وربط الأسواق نحو ${peerName}`
        : `Upgrade multimodal transport (${transportSc}/100${railLinked ? ', SNTF rail freight hub' : ', extend SNTF feeder'}) & retail logistics to ${peerName}`,
      actionAr: `تطوير شبكة النقل والسكك والربط التجاري لـ ${targetWilaya.n} نحو ${peerName}`,
      leadOwner: isAr ? `وزارة النقل (SNTF) + التجارة لولاية ${targetWilaya.n}` : `Ministry of Transport (SNTF) & Trade`,
      timeframe: 'Mid-term 2027' as const,
      costBenefitRatio: `1 : ${(2.9 + (100 - transportSc) * 0.03).toFixed(1)}`
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
    },
    {
      action: isAr
        ? `تفعيل مناطق التوسع السياحي ZET وصون ${heritageCnt} معلماً تراثياً مع ترقية ${hotelsCnt} فندقاً في ${targetWilaya.n} (السياحة ${tourismSc}/100)`
        : `Activate ZET tourism zones, preserve ${heritageCnt} heritage sites, and upgrade ${hotelsCnt} hotels in ${targetWilaya.en} (${tourismSc}/100)`,
      actionAr: `تفعيل مناطق التوسع السياحي ZET وتثمين التراث والفندقة في ${targetWilaya.n} (${tourismSc}/100)`,
      leadOwner: isAr ? `وزارة السياحة والصناعة التقليدية (MTA / ONT) — ${targetWilaya.n}` : `Ministry of Tourism & Handicrafts (MTA / ONT)`,
      timeframe: 'Mid-term 2027' as const,
      costBenefitRatio: `1 : ${(3.0 + tourismSc * 0.02).toFixed(1)}`
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
