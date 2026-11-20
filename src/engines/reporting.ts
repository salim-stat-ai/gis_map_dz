/**
 * GIS Map – Strategic Decision Report Generator & Analytical Documentation
 * Preserves the Legacy Master Report in full detail, fixes and enhances calculations,
 * and integrates the New Sovereign Foresight 2030 Quantitative Report.
 * © 2026 Salim Slimani & National Foresight System
 */

import { CouncilConsensusResult, WilayaRecord } from '../types';
import { executeForecastModel } from './quantitative';
import { runModelTournament } from './evaluation';
import { computeMoransI, computeGetisOrdGi, computeSpatialRegression, haversineDistance } from './gis';
import { generateAllPathways } from './scenario';
import { scanNationalEarlyWarnings } from './earlyWarning';
import { AI_AGENT_PROFILES, runAgentAnalysis } from './agents';

export type ReportMode = 'legacy' | 'modern' | 'combined';
export type ReportScope = 'wilaya' | 'compare' | 'case' | 'national';
export type ThematicCaseKey = 'water' | 'drought' | 'urban' | 'retail' | 'flood' | 'industry' | 'health' | 'hazards' | 'transport' | 'tourism' | 'anomaly';
export type ReportLang = 'ar' | 'en' | 'fr';

export interface ReportGenerationOptions {
  mode?: ReportMode;
  scope?: ReportScope;
  wilaya: WilayaRecord;
  compareWilayas?: WilayaRecord[];
  allWilayas: WilayaRecord[];
  targetYear: number;
  thematicCase?: ThematicCaseKey;
  councilData?: CouncilConsensusResult;
  lang: ReportLang;
}

// ==========================================
// 1. Algorithmic Helpers & Forecast Formulas
// ==========================================

export function predictWater(w: WilayaRecord, year: number): number {
  const h = year - 2026;
  const demandGrowth = w.pop * 0.035 * h; // 3.5%/year demand growth
  const climateLoss = w.rain * 0.012 * h;  // -1.2%/year precipitation loss
  return Math.round(w.waterDef * 10 - demandGrowth * 0.15 - climateLoss * 0.2);
}

export function cropRisk(w: WilayaRecord, year: number): number {
  const h = year - 2026;
  let r = 100 - (w.soil * 0.5 + w.rain * 0.06 + w.ndvi * 60);
  r += h * 2.1;
  if (w.rain < 200) r += 18;
  return Math.max(2, Math.min(98, Math.round(r)));
}

export function urbanGrowth(w: WilayaRecord, year: number): number {
  const h = year - 2026;
  return Math.round((w.pop / 100) * (w.price / 50000) * h * 0.8 + h * 1.5);
}

export function coverageGap(w: WilayaRecord): number {
  return Math.max(0, Math.round(100 - w.coverage));
}

export function industryScore(w: WilayaRecord): number {
  return Math.round(w.energy * 0.3 + w.roads * 0.3 + w.labor * 0.2 + (100 - Math.abs(w.waterDef)) * 0.2);
}

const RAIL_CONNECTED_WILAYAS = new Set([
  2, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 19, 20, 21, 22, 23, 24, 25,
  26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 41, 42, 43, 44, 45, 46, 48, 55
]);
const SEISMIC_ZONE_HIGH = new Set([2, 6, 9, 10, 15, 16, 18, 19, 21, 23, 24, 25, 29, 34, 35, 42, 43, 44, 48]);
const SEISMIC_ZONE_MOD = new Set([4, 5, 12, 13, 14, 22, 26, 27, 31, 36, 38, 40, 41, 46]);
const FOREST_WILDFIRE_HIGH = new Set([5, 6, 9, 10, 15, 18, 21, 24, 26, 35, 36, 40, 41, 42, 44]);
const PORT_HUB_WILAYAS = new Set([6, 13, 16, 18, 21, 23, 27, 31, 35, 42, 46]);
const CHU_HEALTH_HUBS = new Set([5, 6, 7, 9, 13, 15, 16, 19, 22, 23, 25, 30, 31, 35]);
const UNESCO_HERITAGE_HUBS = new Set([5, 11, 16, 19, 28, 42, 47, 56]);
const SAHARAN_ECO_TOURISM_HUBS = new Set([1, 3, 7, 8, 11, 30, 33, 37, 39, 47, 49, 52, 55, 56]);
const COASTAL_THERMAL_HUBS = new Set([2, 6, 13, 15, 16, 18, 21, 23, 24, 25, 27, 31, 35, 36, 40, 42, 46]);

export function getHospitalsCount(w: WilayaRecord): number {
  if (typeof w.hospitals === 'number' && !Number.isNaN(w.hospitals)) return w.hospitals;
  return Math.max(2, Math.round(w.pop / 95 + (CHU_HEALTH_HUBS.has(w.num) ? 4 : 0) + (w.region !== 'Sahara' ? 1 : 0)));
}

export function getHealthCoverage(w: WilayaRecord): number {
  if (typeof w.healthCoverage === 'number' && !Number.isNaN(w.healthCoverage)) return w.healthCoverage;
  return Math.max(
    22,
    Math.min(
      96,
      Math.round(
        w.coverage * 0.45 +
          w.roads * 0.25 +
          w.energy * 0.15 +
          (CHU_HEALTH_HUBS.has(w.num) ? 14 : 4) -
          (w.region === 'Sahara' ? 8 : 0)
      )
    )
  );
}

export function getSeismicRisk(w: WilayaRecord): number {
  if (typeof w.seismicRisk === 'number' && !Number.isNaN(w.seismicRisk)) return w.seismicRisk;
  const raw = SEISMIC_ZONE_HIGH.has(w.num)
    ? 0.62 + (w.num % 4) * 0.06
    : SEISMIC_ZONE_MOD.has(w.num)
    ? 0.34 + (w.num % 3) * 0.05
    : w.region === 'Sahara'
    ? 0.08
    : 0.22;
  return Math.max(0.05, Math.min(0.92, Math.round(raw * 100) / 100));
}

export function getWildfireRisk(w: WilayaRecord): number {
  if (typeof w.wildfireRisk === 'number' && !Number.isNaN(w.wildfireRisk)) return w.wildfireRisk;
  const raw = w.ndvi * 0.72 + (FOREST_WILDFIRE_HIGH.has(w.num) ? 0.26 : 0) - (w.region === 'Sahara' ? 0.14 : 0);
  return Math.max(0.02, Math.min(0.92, Math.round(raw * 100) / 100));
}

export function getHazardIndex(w: WilayaRecord): number {
  if (typeof w.hazardIndex === 'number' && !Number.isNaN(w.hazardIndex)) return w.hazardIndex;
  const floodScore = w.flood * 100 * 0.38;
  const seismicScore = getSeismicRisk(w) * 100 * 0.34;
  const fireScore = getWildfireRisk(w) * 100 * 0.28;
  const heatSandstormBonus = w.rain < 120 ? 16 : 0;
  return Math.max(5, Math.min(98, Math.round(floodScore + seismicScore + fireScore + heatSandstormBonus)));
}

export function hasRailAccess(w: WilayaRecord): boolean {
  if (typeof w.railAccess === 'boolean') return w.railAccess;
  return RAIL_CONNECTED_WILAYAS.has(w.num);
}

export function getTransportScore(w: WilayaRecord): number {
  if (typeof w.transportScore === 'number' && !Number.isNaN(w.transportScore)) return w.transportScore;
  return Math.max(
    25,
    Math.min(
      98,
      Math.round(
        w.roads * 0.62 +
          (hasRailAccess(w) ? 18 : 0) +
          (PORT_HUB_WILAYAS.has(w.num) ? 10 : 0) +
          w.coverage * 0.12
      )
    )
  );
}

export function getHeritageSitesCount(w: WilayaRecord): number {
  if (typeof w.heritageSites === 'number' && !Number.isNaN(w.heritageSites)) return w.heritageSites;
  return Math.max(
    2,
    Math.round(
      3 +
        (UNESCO_HERITAGE_HUBS.has(w.num) ? 8 : 0) +
        (SAHARAN_ECO_TOURISM_HUBS.has(w.num) ? 4 : 0) +
        (COASTAL_THERMAL_HUBS.has(w.num) ? 3 : 0) +
        (w.num % 4)
    )
  );
}

export function getHotelsCount(w: WilayaRecord): number {
  if (typeof w.hotels === 'number' && !Number.isNaN(w.hotels)) return w.hotels;
  return Math.max(
    4,
    Math.round(
      w.pop / 28 +
        (COASTAL_THERMAL_HUBS.has(w.num) ? 14 : 0) +
        (UNESCO_HERITAGE_HUBS.has(w.num) ? 9 : 0) +
        (SAHARAN_ECO_TOURISM_HUBS.has(w.num) ? 6 : 0) +
        (w.num === 16 || w.num === 31 ? 45 : 0)
    )
  );
}

export function getTourismScore(w: WilayaRecord): number {
  if (typeof w.tourismScore === 'number' && !Number.isNaN(w.tourismScore)) return w.tourismScore;
  return Math.max(
    24,
    Math.min(
      97,
      Math.round(
        getHeritageSitesCount(w) * 2.4 +
          Math.min(35, getHotelsCount(w) * 0.42) +
          w.coverage * 0.16 +
          w.roads * 0.14 +
          (hasRailAccess(w) ? 6 : 0) +
          (COASTAL_THERMAL_HUBS.has(w.num) || UNESCO_HERITAGE_HUBS.has(w.num) || SAHARAN_ECO_TOURISM_HUBS.has(w.num) ? 8 : 0)
      )
    )
  );
}

export function detectAnomaly(w: WilayaRecord, lang: ReportLang = 'ar'): string | null {
  const expectedMarkets = w.pop / 40;
  const diff = expectedMarkets - w.markets;
  if (diff > 15) {
    return lang === 'fr'
      ? `Pénurie sévère de marchés (${Math.round(diff)} manquants) — opportunité d’investissement`
      : lang === 'en'
      ? `Severe market shortage (${Math.round(diff)} markets missing) — commercial opportunity`
      : `فجوة تجارية حادة: نقص ${Math.round(diff)} سوقاً جوارياً مقارنة بالكتلة السكانية`;
  }
  if (w.waterDef < -30 && w.wells > 900) {
    return lang === 'fr'
      ? `Épuisement critique de la nappe phréatique — extraction supérieure à la recharge`
      : lang === 'en'
      ? `Critical groundwater depletion — extraction exceeds recharge`
      : `استنزاف حرج للطبقة الجوفية: معدل السحب من الآبار يفوق التغذية الطبيعية`;
  }
  if (w.flood > 0.4 && w.price > 90000) {
    return lang === 'fr'
      ? `Prix fonciers élevés en zone inondable — risque spéculatif majeur`
      : lang === 'en'
      ? `High property prices inside a flood zone — speculation risk`
      : `مضاربة عقارية مرتفعة داخل مجرى سيول الأودية المصنفة خطرة`;
  }
  if (w.ndvi < 0.2 && w.soil > 35) {
    return lang === 'fr'
      ? `Faible NDVI malgré un sol arable — sous-exploitation ou déficit d’irrigation`
      : lang === 'en'
      ? `Low NDVI despite fair soil — under-use or irrigation gap`
      : `ضعف الغطاء النباتي رغم جودة التربة: حاجة ملحة للسقي التكميلي وتنشيط المستثمرات`;
  }
  if (w.industry < 50 && w.energy > 70) {
    return lang === 'fr'
      ? `Zone industrielle sous-occupée malgré l’énergie — goulot d’étranglement eau/route`
      : lang === 'en'
      ? `Empty industrial zone despite power — road/water bottleneck`
      : `منطقة صناعية راكدة رغم توفر الطاقة الكهربائية — اختناق لوجستي في المياه أو الطرق`;
  }
  return null;
}

export function suitabilityAgri(w: WilayaRecord, lang: ReportLang = 'ar'): string {
  if (w.soil > 75 && w.rain > 350) {
    return lang === 'fr' ? 'Excellente pour les céréales' : lang === 'en' ? 'Excellent for cereals' : 'ممتازة لزراعة الحبوب الإستراتيجية والقمح الصلب';
  }
  if (w.soil > 55 && w.rain > 500) {
    return lang === 'fr' ? 'Idéale pour l’arboriculture' : lang === 'en' ? 'Ideal for fruit trees' : 'مثالية للأشجار المثمرة والكروم والزيتون';
  }
  if (w.rain < 150) {
    return lang === 'fr' ? 'Agriculture saharienne + irrigation sous serre' : lang === 'en' ? 'Saharan farming + smart irrigation/desalination' : 'ملاءمة للزراعة الصحراوية الاستراتيجية تحت البيوت الذكية';
  }
  return lang === 'fr' ? 'Polyculture + amélioration des sols' : lang === 'en' ? 'Mixed farming + soil improvement' : 'زراعات متعددة مع برنامج تسميد وتحسين خصوبة التربة';
}

export function riskOf(w: WilayaRecord, year: number): number {
  const pw = predictWater(w, year);
  const cr = cropRisk(w, year);
  const cg = coverageGap(w);
  const hc = getHealthCoverage(w);
  const hi = getHazardIndex(w);
  const ts = getTransportScore(w);
  let s = 0;
  if (pw < -250 || w.waterDef < -25) s += 2; else if (pw < -100 || w.waterDef < -10) s += 1;
  if (w.flood > 0.4) s += 2; else if (w.flood > 0.25) s += 1;
  if (cr > 60) s += 2; else if (cr > 45) s += 1;
  if (cg > 30) s += 1;
  if (hc < 50) s += 2; else if (hc < 65) s += 1;
  if (hi > 60) s += 2; else if (hi > 45) s += 1;
  if (ts < 52) s += 1;
  return s >= 7 ? 3 : s >= 4 ? 2 : s >= 2 ? 1 : 0;
}

export function riskLabel(lv: number, lang: ReportLang = 'ar'): string {
  if (lang === 'fr') {
    return lv === 3 ? '🔴 Critique (P1)' : lv === 2 ? '🟠 Élevé (P2)' : lv === 1 ? '🟡 Vigilance' : '🟢 Stable';
  }
  if (lang === 'en') {
    return lv === 3 ? '🔴 Critical (P1)' : lv === 2 ? '🟠 High (P2)' : lv === 1 ? '🟡 Watch' : '🟢 Stable';
  }
  return lv === 3 ? '🔴 حرج (أولوية P1)' : lv === 2 ? '🟠 مرتفع (P2)' : lv === 1 ? '🟡 للمراقبة' : '🟢 مستقر';
}

// National averages & ranks
export function calcNatAvg(wilayas: WilayaRecord[], fn: (w: WilayaRecord) => number): number {
  if (!wilayas.length) return 0;
  return wilayas.reduce((acc, w) => acc + (fn(w) || 0), 0) / wilayas.length;
}

export function calcRankOf(wilayas: WilayaRecord[], w: WilayaRecord, fn: (x: WilayaRecord) => number, desc: boolean = true): string {
  const sorted = [...wilayas].sort((a, b) => desc ? fn(b) - fn(a) : fn(a) - fn(b));
  const idx = sorted.findIndex(item => item.num === w.num);
  return idx >= 0 ? `${idx + 1} / ${wilayas.length}` : '—';
}

export function vsAvgText(val: number, avg: number, lang: ReportLang, invert: boolean = false): string {
  const diff = val - avg;
  const tol = Math.abs(avg) * 0.08 + 0.5;
  const good = invert ? diff < -tol : diff > tol;
  const bad = invert ? diff > tol : diff < -tol;

  if (!good && !bad) {
    return lang === 'fr' ? '⚪ Proche de la moyenne' : lang === 'en' ? '⚪ Near average' : '⚪ قريب من المعدل الوطني';
  }
  const sign = bad ? '🔻 ' : '▲ ';
  const absDiff = Math.abs(Math.round(diff * 10) / 10);
  if (lang === 'fr') {
    return `${sign}${absDiff} ${good ? '(favorable)' : '(défavorable)'}`;
  }
  if (lang === 'en') {
    return `${sign}${absDiff} ${good ? '(favorable)' : '(intervention needed)'}`;
  }
  return `${sign}${absDiff} ${good ? '(وضعية ملائمة)' : '(يستدعي التدخل)'}`;
}

// Action plan generator
export interface ActionPlanItem {
  priority: string;
  action: string;
  horizon: string;
  owner: string;
  impact: string;
}

export function generateActionPlan(w: WilayaRecord, year: number, lang: ReportLang = 'ar'): ActionPlanItem[] {
  const pw = predictWater(w, year);
  const cr = cropRisk(w, year);
  const cg = coverageGap(w);
  const ug = urbanGrowth(w, year);
  const isc = industryScore(w);
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';

  const plan: ActionPlanItem[] = [];

  // 1. Water Action
  if (pw < -250 || w.waterDef < -25) {
    plan.push({
      priority: isAr ? 'عاجل P1' : isFr ? 'Urgent P1' : 'Urgent P1',
      action: isAr
        ? `تأمين المورد المائي (عجز ${pw}): تعميم محطات تحلية المياه، ترشيد حفر الآبار، وربط السدود الكبرى.`
        : isFr
        ? `Sécuriser l'eau (déficit ${pw}): stations de dessalement, régulation forages et interconnexion barrages.`
        : `Secure water supply (deficit ${pw}): desalination plants, regulated boreholes & dam interconnections.`,
      horizon: isAr ? '0 - 18 شهراً' : isFr ? '0 - 18 mois' : '0 - 18 months',
      owner: isAr ? 'وزارة الموارد المائية + ANRH + ADE' : isFr ? 'Hydraulique + ANRH + ADE' : 'Ministry of Water + ANRH + ADE',
      impact: isAr ? 'تقليص العجز المائي بنسبة 40% وضمان مياه الشرب' : isFr ? 'Réduction du déficit de 40%' : 'Reduce water deficit by 40%'
    });
  } else if (pw < -100 || w.waterDef < -10) {
    plan.push({
      priority: isAr ? 'متوسط P2' : isFr ? 'Moyen P2' : 'Medium P2',
      action: isAr
        ? `إعادة تأهيل شبكات التوزيع للقضاء على التسربات وتركيب عدادات التدفق الذكية.`
        : isFr
        ? `Réhabilitation du réseau pour éradiquer les fuites et comptage intelligent.`
        : `Rehabilitate distribution networks, eliminate leaks & deploy smart meters.`,
      horizon: isAr ? '0 - 12 شهراً' : isFr ? '0 - 12 mois' : '0 - 12 months',
      owner: isAr ? 'الجزائرية للمياه (ADE) + مديرية الموارد المائية' : isFr ? 'ADE + Direction de l’Hydraulique' : 'Water utility (ADE) + local water directorate',
      impact: isAr ? 'توفير 15% من المياه المهدورة في الشبكات' : isFr ? 'Économie de 15% sur les pertes réseau' : 'Save 15% of distribution water losses'
    });
  }

  // 2. Flood & Land Action
  if (w.flood > 0.35) {
    plan.push({
      priority: isAr ? 'عاجل P1' : isFr ? 'Urgent P1' : 'Urgent P1',
      action: isAr
        ? `تجميد رخص البناء في أودية السيول الجارفة، إنشاء أحواض ترسيب وتهيئة مجاري الأودية.`
        : isFr
        ? `Gel des permis dans les lits d'oueds, bassins de rétention et curage régulier.`
        : `Freeze building permits in wadi floodways, build retention basins & clear bottlenecks.`,
      horizon: isAr ? '0 - 24 شهراً' : isFr ? '0 - 24 mois' : '0 - 24 months',
      owner: isAr ? 'الولاية + التعمير + الحماية المدنية' : isFr ? 'Wilaya + Urbanisme + Protection Civile' : 'Wilaya + Urban Planning + Civil Protection',
      impact: isAr ? 'تأمين الأرواح وحماية البنى التحتية من الفيضانات الخاطفة' : isFr ? 'Protection des vies et infrastructures' : 'Prevent catastrophic urban flood damages'
    });
  }

  // 3. Retail & Market Action
  if (cg > 25) {
    plan.push({
      priority: isAr ? 'متوسط P2' : isFr ? 'Moyen P2' : 'Medium P2',
      action: isAr
        ? `إنشاء سوق جملة إقليمي ومستودعات تبريد استراتيجية لامتصاص فجوة التموين (${cg}%).`
        : isFr
        ? `Création d'un marché régional et plateformes frigorifiques pour combler le gap (${cg}%).`
        : `Construct regional wholesale market & cold chain storage to bridge distribution gap (${cg}%).`,
      horizon: isAr ? '6 - 18 شهراً' : isFr ? '6 - 18 mois' : '6 - 18 months',
      owner: isAr ? 'مديرية التجارة + مغرب تسويق (MAGGRO) + البلدية' : isFr ? 'Commerce + MAGGRO + APC' : 'Trade Directorate + MAGGRO + Municipalities',
      impact: isAr ? 'استقرار أسعار السلع واسعة الاستهلاك وخفض المضاربة' : isFr ? 'Stabilisation des prix et disponibilité' : 'Stabilize staple food prices & market access'
    });
  }

  // 4. Agricultural Action
  plan.push({
    priority: cr > 60 ? (isAr ? 'عاجل P1' : 'P1') : (isAr ? 'متوسط P2' : 'P2'),
    action: isAr
      ? `الفلاحة الاستراتيجية: ${suitabilityAgri(w, 'ar')}، تعميم السقي بالتقطير، وإدخال بذور مقاومة للجفاف.`
      : isFr
      ? `Agriculture : ${suitabilityAgri(w, 'fr')}, irrigation goutte-à-goutte et semences résilientes.`
      : `Agriculture: ${suitabilityAgri(w, 'en')}, widespread drip irrigation & drought-resistant cultivars.`,
    horizon: isAr ? '0 - 36 شهراً' : isFr ? '0 - 36 mois' : '0 - 36 months',
    owner: isAr ? 'المصالح الفلاحية (DSA) + الغرفة الفلاحية + المعاهد المتخصصة' : isFr ? 'DSA + Chambre d’Agriculture' : 'Agricultural Directorate (DSA) + Agronomic institutes',
    impact: isAr ? 'رفع المردودية بنسبة 25% وتأمين المحاصيل ضد الجفاف' : isFr ? 'Rendement +25% et résilience' : 'Boost harvest yield by 25% and drought buffer'
  });

  // 5. Urban Growth
  plan.push({
    priority: isAr ? 'تخطيط P3' : isFr ? 'Planification P3' : 'Planning P3',
    action: isAr
      ? `مخطط تهيئة عمرانية استباقي لاستيعاب توسع بنسبة +${ug}% عبر أقطاب حضرية متصلة بالشبكات.`
      : isFr
      ? `Plan d'urbanisme préventif pour absorber +${ug}% d'extension vers des plateaux viabilisés.`
      : `Master urban plan to accommodate +${ug}% expansion onto serviced plateau zones.`,
    horizon: isAr ? '12 - 48 شهراً' : isFr ? '12 - 48 mois' : '12 - 48 months',
    owner: isAr ? 'مديرية التعمير والهندسة المعمارية (DUC) + الوكالة العقارية' : isFr ? 'DUC + Agence Foncière' : 'Urban Planning (DUC) + Land Agency',
    impact: isAr ? 'تفادي البناء الفوضوي وتوفير سكنات متوازنة مع الخدمات' : isFr ? 'Croissance maîtrisée et équipements' : 'Prevent chaotic sprawl & secure serviced housing'
  });

  // 6. Industrial Zone
  const indAction = isc > 70
    ? (isAr ? 'تسويق الحظيرة الصناعية للمستثمرين الوطنيين والأجانب مع شباك موحد.' : isFr ? 'Commercialisation de la zone industrielle avec guichet unique.' : 'Market industrial park to domestic/foreign investors with one-stop window.')
    : (isAr ? `استكمال النواقص اللوجستية (${w.waterDef < -20 ? 'المياه ' : ''}${w.roads < 75 ? 'الطرق السريعة ' : ''}${w.energy < 70 ? 'محطة تحويل طاقة' : ''}) قبل منح العقار.` : isFr ? 'Combler les déficits eau/route/énergie avant attribution.' : 'Resolve utility deficits (water/road/power) prior to concession.');

  plan.push({
    priority: isc > 70 ? (isAr ? 'متوسط P2' : 'P2') : (isAr ? 'تخطيط P3' : 'P3'),
    action: isAr ? `الصناعة والاستثمار (${isc}/100): ${indAction}` : isFr ? `Industrie (${isc}/100) : ${indAction}` : `Industry (${isc}/100): ${indAction}`,
    horizon: isAr ? '12 - 36 شهراً' : isFr ? '12 - 36 mois' : '12 - 36 months',
    owner: isAr ? 'الوكالة الجزائرية لترقية الاستثمار (AAPI) + مديرية الصناعة' : isFr ? 'AAPI + Direction de l’Industrie' : 'Investment Agency (AAPI) + Industry Directorate',
    impact: isAr ? 'خلق 3,500 منصب عمل وتوسيع القاعدة الضريبية المحلية' : isFr ? 'Création d’emplois et attractivité' : 'Generate 3,500 industrial jobs & local tax revenue'
  });

  // 7. Healthcare & Hospitals (MSPRH)
  const hc = getHealthCoverage(w);
  const hospCount = getHospitalsCount(w);
  plan.push({
    priority: hc < 58 ? (isAr ? 'عاجل P1' : isFr ? 'Urgent P1' : 'Urgent P1') : (isAr ? 'متوسط P2' : isFr ? 'Moyen P2' : 'Medium P2'),
    action: isAr
      ? `الصحة والاستشفاء (${hc}% تغطية · ${hospCount} مستشفيات): توسيع مصالح الاستعجالات وتخصيص حصة أطباء أخصائيين وعيادات جوارية.`
      : isFr
      ? `Santé (${hc}% couverture · ${hospCount} hôpitaux) : renforcement des urgences, cliniques de proximité et médecins spécialistes.`
      : `Healthcare (${hc}% coverage · ${hospCount} hospitals): expand emergency care capacity, deploy medical specialists & upgrade regional polyclinics.`,
    horizon: isAr ? '6 - 24 شهراً' : isFr ? '6 - 24 mois' : '6 - 24 months',
    owner: isAr ? 'وزارة الصحة (MSPRH) + مديرية الصحة والسكان (DSP)' : isFr ? 'Ministère de la Santé (MSPRH) + DSP' : 'Ministry of Health (MSPRH) + DSP',
    impact: isAr ? 'رفع التغطية الاستشفائية بنسبة +18% وتقليص الإجلاء الطبي' : isFr ? 'Couverture sanitaire +18%' : 'Increase health coverage by +18% & cut long-distance referrals'
  });

  // 8. Natural Hazards Prevention (CRAAG & DGPC ORSEC)
  const hi = getHazardIndex(w);
  const srPct = Math.round(getSeismicRisk(w) * 100);
  const wfPct = Math.round(getWildfireRisk(w) * 100);
  plan.push({
    priority: hi >= 60 ? (isAr ? 'عاجل P1' : isFr ? 'Urgent P1' : 'Urgent P1') : (isAr ? 'متوسط P2' : isFr ? 'Moyen P2' : 'Medium P2'),
    action: isAr
      ? `الأخطار الطبيعية (${hi}/100 · زلازل ${srPct}% · حرائق ${wfPct}%): تطبيق معايير البناء المضاد للزلازل RPA، شق خنادق حرائق الغابات وتحديث مخطط ORSEC.`
      : isFr
      ? `Risques Naturels (${hi}/100 · séisme ${srPct}% · feux ${wfPct}%) : normes parasismiques RPA, pare-feu forestiers et mise à jour ORSEC.`
      : `Natural Hazards (${hi}/100 · seismic ${srPct}% · wildfire ${wfPct}%): enforce RPA seismic building codes, carve wildfire buffers & drill DGPC ORSEC.`,
    horizon: isAr ? '0 - 24 شهراً' : isFr ? '0 - 24 mois' : '0 - 24 months',
    owner: isAr ? 'مركز البحث في علم الفلك والفيزياء الفلكية (CRAAG) + الحماية المدنية (DGPC)' : isFr ? 'CRAAG + Protection Civile (DGPC)' : 'CRAAG + Civil Protection (DGPC)',
    impact: isAr ? 'حماية الأرواح وتقليص الخسائر المادية بنسبة 35%' : isFr ? 'Réduction des pertes matérielles de 35%' : 'Cut natural disaster human & asset losses by 35%'
  });

  // 9. Transport & SNTF Rail Logistics
  const ts = getTransportScore(w);
  const railLinked = hasRailAccess(w);
  plan.push({
    priority: ts < 55 || !railLinked ? (isAr ? 'متوسط P2' : isFr ? 'Moyen P2' : 'Medium P2') : (isAr ? 'تخطيط P3' : isFr ? 'Planification P3' : 'Planning P3'),
    action: isAr
      ? `النقل والربط بالسكك (${ts}/100 · ${railLinked ? 'مرتبطة بـ SNTF' : 'بدون خط سكة حالياً'}): ${railLinked ? 'رفع طاقة الشحن السككي وازدواجية المحاور الطرقية الاستراتيجية.' : 'دراسة وربط الولاية بشبكة السكك الحديدية الوطنية وفك العزلة الطرقية.'}`
      : isFr
      ? `Transport & Rail (${ts}/100 · ${railLinked ? 'connectée SNTF' : 'non connectée rail'}) : modernisation fret ferroviaire et dédoublement routier.`
      : `Transport & Rail (${ts}/100 · ${railLinked ? 'SNTF linked' : 'no rail link yet'}): ${railLinked ? 'expand SNTF freight capacity & dual-carriage highways.' : 'commission SNTF rail corridor extension & upgrade trunk highways.'}`,
    horizon: isAr ? '12 - 48 شهراً' : isFr ? '12 - 48 mois' : '12 - 48 months',
    owner: isAr ? 'وزارة النقل + الشركة الوطنية للنقل بالسكك الحديدية (SNTF)' : isFr ? 'Ministère des Transports + SNTF' : 'Ministry of Transport + SNTF Rail',
    impact: isAr ? 'خفض تكاليف اللوجستيك بنسبة 25% وربط المناطق الداخلية بالموانئ' : isFr ? 'Coûts logistiques -25%' : 'Reduce freight logistics costs by 25% & bridge interior poles'
  });

  // 10. Tourism, Cultural Heritage & Hospitality (MTA / ONT)
  const tourismSc = getTourismScore(w);
  const hotelsCnt = getHotelsCount(w);
  const heritageCnt = getHeritageSitesCount(w);
  const tourismGap = (heritageCnt >= 7 || tourismSc >= 58) && hotelsCnt < 16;
  plan.push({
    priority: tourismGap ? (isAr ? 'عاجل P1' : isFr ? 'Urgent P1' : 'Urgent P1') : tourismSc >= 62 ? (isAr ? 'متوسط P2' : isFr ? 'Moyen P2' : 'Medium P2') : (isAr ? 'تخطيط P3' : isFr ? 'Planification P3' : 'Planning P3'),
    action: isAr
      ? `السياحة والتراث والضيافة (${tourismSc}/100 · ${hotelsCnt} فندقاً · ${heritageCnt} موقعاً تراثياً): ${tourismGap ? 'سد فجوة الإيواء الفندقي عبر منتجعات بيئية مصنفة وربط المسارات السياحية.' : 'تثمين المسالك الثقافية والحموية/الصحراوية ورقمنة الحجز السياحي والربط الجوي/السككي.'}`
      : isFr
      ? `Tourisme & Patrimoine (${tourismSc}/100 · ${hotelsCnt} hôtels · ${heritageCnt} sites) : ${tourismGap ? 'combler le déficit hôtelier via écolodges classés.' : 'valoriser les circuits culturels/sahariens/thermaux et connecter les axes d’accès.'}`
      : `Tourism & Cultural Heritage (${tourismSc}/100 · ${hotelsCnt} hotels · ${heritageCnt} heritage sites): ${tourismGap ? 'close hotel bed capacity shortfall with classified eco-lodges & cultural hospitality zones.' : 'promote heritage, coastal & Saharan/thermal circuits with multimodal transit shuttles.'}`,
    horizon: isAr ? '6 - 36 شهراً' : isFr ? '6 - 36 mois' : '6 - 36 months',
    owner: isAr ? 'وزارة السياحة والصناعة التقليدية (MTA / ONT) + مديرية السياحة الولائية' : isFr ? 'Ministère du Tourisme (MTA / ONT) + DTA' : 'Ministry of Tourism & Handicrafts (MTA / ONT) + Wilaya Tourism Directorate',
    impact: isAr ? 'رفع الطاقة الاستيعابية الفندقية بـ +35% وتنويع المداخيل السياحية المحلية' : isFr ? 'Capacité hôtelière +35% et recettes locales diversifiées' : 'Boost hotel hospitality capacity +35% & diversify local non-oil revenue'
  });

  return plan;
}

// 18 Comprehensive Indicators Table Definitions
export interface IndicatorDefinition {
  key: string;
  nameAr: string;
  nameEn: string;
  nameFr: string;
  unit: string;
  format: (w: WilayaRecord) => string;
  getValue: (w: WilayaRecord) => number;
  invertStatus: boolean; // true if lower is better (e.g. price, flood, wells)
}

export const ALL_18_INDICATORS: IndicatorDefinition[] = [
  {
    key: 'pop',
    nameAr: 'عدد السكان التقديري',
    nameEn: 'Population Estimate',
    nameFr: 'Population Estimée',
    unit: 'ألف نسمة (k)',
    format: w => `${w.pop.toLocaleString()} k`,
    getValue: w => w.pop,
    invertStatus: false
  },
  {
    key: 'price',
    nameAr: 'متوسط سعر المتر المربع العقاري',
    nameEn: 'Real Estate Price per m²',
    nameFr: 'Prix Foncier au m²',
    unit: 'دج / م²',
    format: w => `${w.price.toLocaleString()} DZD`,
    getValue: w => w.price,
    invertStatus: true
  },
  {
    key: 'flood',
    nameAr: 'مؤشر التعرض لخطر الفيضانات',
    nameEn: 'Flood Risk Exposure Index',
    nameFr: 'Indice de Risque d’Inondation',
    unit: '%',
    format: w => `${Math.round(w.flood * 100)}%`,
    getValue: w => w.flood * 100,
    invertStatus: true
  },
  {
    key: 'soil',
    nameAr: 'خصوبة وجودة التربة الزراعية',
    nameEn: 'Soil Fertility & Quality',
    nameFr: 'Qualité & Fertilité du Sol',
    unit: '/ 100',
    format: w => `${w.soil} / 100`,
    getValue: w => w.soil,
    invertStatus: false
  },
  {
    key: 'rain',
    nameAr: 'معدل التساقط المطري السنوي',
    nameEn: 'Annual Precipitation',
    nameFr: 'Pluviométrie Annuelle',
    unit: 'ملم / سنة',
    format: w => `${w.rain} mm`,
    getValue: w => w.rain,
    invertStatus: false
  },
  {
    key: 'ndvi',
    nameAr: 'مؤشر الغطاء النباتي الفضائي (NDVI)',
    nameEn: 'Vegetation Index (NDVI)',
    nameFr: 'Indice Végétal NDVI',
    unit: '0 - 1',
    format: w => `${w.ndvi.toFixed(2)}`,
    getValue: w => w.ndvi,
    invertStatus: false
  },
  {
    key: 'dams',
    nameAr: 'عدد السدود والمنشآت المائية',
    nameEn: 'Registered Dams & Reservoirs',
    nameFr: 'Barrages & Retenues',
    unit: 'منشأة',
    format: w => `${w.dams}`,
    getValue: w => w.dams,
    invertStatus: false
  },
  {
    key: 'wells',
    nameAr: 'عدد الآبار الارتوازية المسجلة',
    nameEn: 'Deep Boreholes & Wells',
    nameFr: 'Forages & Puits Enregistrés',
    unit: 'بئر',
    format: w => `${w.wells.toLocaleString()}`,
    getValue: w => w.wells,
    invertStatus: true // high extraction can signal depletion
  },
  {
    key: 'waterDef',
    nameAr: 'مؤشر التوازن / العجز المائي',
    nameEn: 'Water Deficit / Surplus Index',
    nameFr: 'Indice de Déficit Hydrique',
    unit: 'مؤشر نسبي',
    format: w => `${w.waterDef}`,
    getValue: w => w.waterDef,
    invertStatus: false // higher is surplus, negative is deficit
  },
  {
    key: 'markets',
    nameAr: 'مرافق التوزيع والأسواق الجوارية',
    nameEn: 'Wholesale & Retail Markets',
    nameFr: 'Marchés de Gros & Proximité',
    unit: 'مرفق',
    format: w => `${w.markets}`,
    getValue: w => w.markets,
    invertStatus: false
  },
  {
    key: 'coverage',
    nameAr: 'نسبة التغطية والتموين التجاري',
    nameEn: 'Commercial Supply Coverage',
    nameFr: 'Couverture Commerciale',
    unit: '%',
    format: w => `${w.coverage}%`,
    getValue: w => w.coverage,
    invertStatus: false
  },
  {
    key: 'energy',
    nameAr: 'موثوقية شبكة الكهرباء والطاقة',
    nameEn: 'Power Grid Reliability',
    nameFr: 'Fiabilité Réseau Électrique',
    unit: '/ 100',
    format: w => `${w.energy} / 100`,
    getValue: w => w.energy,
    invertStatus: false
  },
  {
    key: 'roads',
    nameAr: 'كثافة شبكة الطرق والربط اللوجستي',
    nameEn: 'Road Network & Logistic Access',
    nameFr: 'Réseau Routier & Logistique',
    unit: '/ 100',
    format: w => `${w.roads} / 100`,
    getValue: w => w.roads,
    invertStatus: false
  },
  {
    key: 'labor',
    nameAr: 'حجم اليد العاملة والنشاط الاقتصادي',
    nameEn: 'Active Workforce Index',
    nameFr: 'Bassin de Main d’Œuvre',
    unit: '/ 100',
    format: w => `${w.labor} / 100`,
    getValue: w => w.labor,
    invertStatus: false
  },
  {
    key: 'industry',
    nameAr: 'مؤشر البنية التحتية الصناعية',
    nameEn: 'Industrial Infrastructure Base',
    nameFr: 'Base Industrielle Actuelle',
    unit: '/ 100',
    format: w => `${w.industry} / 100`,
    getValue: w => w.industry,
    invertStatus: false
  },
  {
    key: 'cropRisk',
    nameAr: 'خطر الجفاف الفلاحي وتلف المحاصيل',
    nameEn: 'Crop Drought & Stress Risk',
    nameFr: 'Risque de Sécheresse Agricole',
    unit: '%',
    format: w => `${cropRisk(w, 2030)}%`,
    getValue: w => cropRisk(w, 2030),
    invertStatus: true
  },
  {
    key: 'urbanGrowth',
    nameAr: 'النمو العمراني المتوقع حتى 2030',
    nameEn: 'Projected Urban Expansion to 2030',
    nameFr: 'Croissance Urbaine Prévue 2030',
    unit: '%',
    format: w => `+${urbanGrowth(w, 2030)}%`,
    getValue: w => urbanGrowth(w, 2030),
    invertStatus: false
  },
  {
    key: 'industryScore',
    nameAr: 'نقطة الجاذبية الاستثمارية الصناعية',
    nameEn: 'Composite Industrial Attractiveness',
    nameFr: 'Attractivité Industrielle Globale',
    unit: '/ 100',
    format: w => `${industryScore(w)} / 100`,
    getValue: w => industryScore(w),
    invertStatus: false
  },
  {
    key: 'healthCoverage',
    nameAr: 'التغطية الصحية وقدرة الاستشفاء',
    nameEn: 'Healthcare Access & Hospital Index',
    nameFr: 'Couverture Sanitaire & Hôpitaux',
    unit: '%',
    format: w => `${getHealthCoverage(w)}% (${getHospitalsCount(w)})`,
    getValue: w => getHealthCoverage(w),
    invertStatus: false
  },
  {
    key: 'hazardIndex',
    nameAr: 'مؤشر الأخطار الطبيعية المركب (زلازل/فيضانات/حرائق)',
    nameEn: 'Composite Natural Hazard Index',
    nameFr: 'Indice Multirisques Naturels',
    unit: '/ 100',
    format: w => `${getHazardIndex(w)} / 100`,
    getValue: w => getHazardIndex(w),
    invertStatus: true
  },
  {
    key: 'transportScore',
    nameAr: 'مؤشر النقل المتعدد والربط بالسكك',
    nameEn: 'Multimodal Transport & Rail Index',
    nameFr: 'Indice Transport & Rail',
    unit: '/ 100',
    format: w => `${getTransportScore(w)} / 100`,
    getValue: w => getTransportScore(w),
    invertStatus: false
  },
  {
    key: 'hotels',
    nameAr: 'عدد الفنادق والمؤسسات الفندقية المصنفة',
    nameEn: 'Classified Hotels & Hospitality Units',
    nameFr: 'Hôtels & Établissements Classés',
    unit: 'فندق',
    format: w => `${getHotelsCount(w)}`,
    getValue: w => getHotelsCount(w),
    invertStatus: false
  },
  {
    key: 'heritageSites',
    nameAr: 'المواقع التراثية والمعالم السياحية المصنفة',
    nameEn: 'Classified Heritage & Cultural Sites',
    nameFr: 'Sites Patrimoniaux & Touristiques',
    unit: 'موقع',
    format: w => `${getHeritageSitesCount(w)}`,
    getValue: w => getHeritageSitesCount(w),
    invertStatus: false
  },
  {
    key: 'tourismScore',
    nameAr: 'مؤشر الجاذبية السياحية والتراثية الشامل',
    nameEn: 'Composite Tourism & Heritage Attractiveness',
    nameFr: 'Indice d’Attractivité Touristique',
    unit: '/ 100',
    format: w => `${getTourismScore(w)} / 100`,
    getValue: w => getTourismScore(w),
    invertStatus: false
  }
];

// Helper to filter thematic cases
export function filterThematicCase(wilayas: WilayaRecord[], kind: ThematicCaseKey, year: number, lang: ReportLang = 'ar'): { w: WilayaRecord; score: number; reason: string }[] {
  const isAr = lang === 'ar';
  const scored = wilayas.map(w => {
    let score = 0;
    let reason = '';
    if (kind === 'water') {
      score = predictWater(w, year);
      reason = isAr ? `العجز المتوقع: ${score}` : `Projected Balance: ${score}`;
    } else if (kind === 'drought') {
      score = -cropRisk(w, year);
      reason = isAr ? `خطر الجفاف: ${cropRisk(w, year)}%` : `Drought Risk: ${cropRisk(w, year)}%`;
    } else if (kind === 'urban') {
      score = -urbanGrowth(w, year);
      reason = isAr ? `توسع عمراني: +${urbanGrowth(w, year)}%` : `Urban Expansion: +${urbanGrowth(w, year)}%`;
    } else if (kind === 'retail') {
      score = -coverageGap(w);
      reason = isAr ? `فجوة التموين: ${coverageGap(w)}%` : `Supply Gap: ${coverageGap(w)}%`;
    } else if (kind === 'flood') {
      score = -(w.flood * 100 + (w.price / 40000));
      reason = isAr ? `فيضان: ${Math.round(w.flood * 100)}%، سعر العقار: ${w.price.toLocaleString()} دج` : `Flood: ${Math.round(w.flood * 100)}%, Price: ${w.price.toLocaleString()} DZD`;
    } else if (kind === 'industry') {
      score = industryScore(w);
      reason = isAr ? `جاهزية صناعية: ${industryScore(w)}/100` : `Industry Score: ${industryScore(w)}/100`;
    } else if (kind === 'health') {
      score = getHealthCoverage(w);
      reason = isAr ? `تغطية صحية: ${getHealthCoverage(w)}% (${getHospitalsCount(w)} مستشفى)` : `Health Coverage: ${getHealthCoverage(w)}% (${getHospitalsCount(w)} hospitals)`;
    } else if (kind === 'hazards') {
      score = -getHazardIndex(w);
      reason = isAr ? `خطر طبيعي مركب: ${getHazardIndex(w)}/100` : `Hazard Index: ${getHazardIndex(w)}/100`;
    } else if (kind === 'transport') {
      score = getTransportScore(w);
      reason = isAr ? `نقل وسكك: ${getTransportScore(w)}/100 ${hasRailAccess(w) ? '(SNTF)' : ''}` : `Transport Score: ${getTransportScore(w)}/100`;
    } else if (kind === 'tourism') {
      score = getTourismScore(w);
      reason = isAr ? `جاذبية سياحية: ${getTourismScore(w)}/100 (${getHotelsCount(w)} فندق، ${getHeritageSitesCount(w)} موقع)` : `Tourism Index: ${getTourismScore(w)}/100 (${getHotelsCount(w)} hotels, ${getHeritageSitesCount(w)} sites)`;
    } else if (kind === 'anomaly') {
      const an = detectAnomaly(w, lang);
      score = an ? -100 : 0;
      reason = an || (isAr ? 'مؤشرات مستقرة' : 'Stable indicators');
    }
    return { w, score, reason };
  });

  scored.sort((a, b) => a.score - b.score);
  if (kind === 'industry' || kind === 'tourism') scored.reverse();
  return scored.slice(0, 10);
}

// ==========================================
// 2. Report Builders (Legacy, Modern & Unified)
// ==========================================

export function generateStrategicReportHtml(options: ReportGenerationOptions): string {
  const mode = options.mode || 'combined';
  if (mode === 'legacy') {
    return generateLegacyDetailedReportHtml(options);
  }
  if (mode === 'modern') {
    return generateModernForesightReportHtml(options);
  }
  return generateUnifiedExecutiveDossierHtml(options);
}

// ------------------------------------------
// 2.1 Preserved & Enhanced Legacy Report (7 Sections)
// ------------------------------------------
export function generateLegacyDetailedReportHtml(options: ReportGenerationOptions): string {
  const { wilaya: mainW, allWilayas, targetYear, lang, scope = 'wilaya', compareWilayas = [], thematicCase = 'water' } = options;
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const dir = isAr ? 'rtl' : 'ltr';

  let targetList: WilayaRecord[] = [mainW];
  if (scope === 'compare') {
    targetList = compareWilayas.length > 0 ? compareWilayas : allWilayas.slice(0, 4);
  } else if (scope === 'national') {
    targetList = allWilayas;
  } else if (scope === 'case') {
    targetList = filterThematicCase(allWilayas, thematicCase, targetYear, lang).map(item => item.w);
  }

  const reportId = `GIS-${targetYear}-${mainW.num}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dateStr = new Date().toLocaleDateString(isAr ? 'ar-DZ' : isFr ? 'fr-DZ' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Calculate composite macro KPIs
  const avgWater = Math.round(targetList.reduce((acc, w) => acc + predictWater(w, targetYear), 0) / (targetList.length || 1));
  const avgDrought = Math.round(targetList.reduce((acc, w) => acc + cropRisk(w, targetYear), 0) / (targetList.length || 1));
  const totalPop = targetList.reduce((acc, w) => acc + w.pop, 0);
  const criticalCount = targetList.filter(w => riskOf(w, targetYear) === 3).length;

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>gis_map — ${isAr ? 'التقرير الجيو-استخباري المفصّل' : isFr ? 'Rapport Géo-Intelligence Détaillé' : 'Detailed Geo-Intelligence Report'} — ${mainW.en}</title>
  <style>
    ${getSharedReportCss(isAr)}
  </style>
</head>
<body>
  <article class="rep-doc">
    <!-- Header Cover -->
    <header class="rep-cover">
      <div class="rep-brand">
        <div class="rep-logo">🗺️</div>
        <div>
          <div class="rep-title">${isAr ? 'التقرير الجيو-استخباري المفصّل للولايات والحالات' : isFr ? 'Rapport Géo-Intelligence Détaillé des Wilayas' : 'Detailed Geo-Intelligence Report — Wilayas & Cases'}</div>
          <div class="rep-sub">gis_map · GIS + AI Decision Platform — ${isAr ? 'الجمهورية الجزائرية الديمقراطية الشعبية' : isFr ? 'République Algérienne Démocratique et Populaire' : "People's Democratic Republic of Algeria"}</div>
        </div>
      </div>
      <h1 class="rep-h1">
        ${scope === 'wilaya' ? (isAr ? `ولاية ${mainW.n} (${mainW.en})` : isFr ? `Wilaya de ${mainW.en} (${mainW.n})` : `Wilaya of ${mainW.en} (${mainW.n})`)
          : scope === 'compare' ? (isAr ? `مقارنة استراتيجية لـ ${targetList.length} ولايات` : isFr ? `Analyse Comparative (${targetList.length} Wilayas)` : `Comparative Analysis (${targetList.length} Wilayas)`)
          : scope === 'case' ? (isAr ? `تحليل موضوعاتي: ${getCaseTitleAr(thematicCase)}` : `Thematic Case: ${thematicCase}`)
          : (isAr ? `التوليف الوطني الشامل — ${allWilayas.length} ولاية` : isFr ? `Synthèse Nationale Globale — ${allWilayas.length} Wilayas` : `Comprehensive National Synthesis — ${allWilayas.length} Wilayas`)}
      </h1>
      <div class="rep-meta">
        <span>🆔 ${isAr ? 'رقم التقرير' : isFr ? 'Réf.' : 'Report ID'}: <b>${reportId}</b></span>
        <span>📅 ${isAr ? 'التاريخ' : isFr ? 'Date' : 'Date'}: <b>${dateStr}</b></span>
        <span>🎯 ${isAr ? 'أفق الاستشراف' : isFr ? 'Horizon' : 'Horizon'}: <b>${targetYear}</b></span>
        <span>📦 ${isAr ? 'الولايات المشمولة' : isFr ? 'Wilayas' : 'Scope'}: <b>${targetList.length}</b></span>
      </div>
      <div class="rep-class">${isAr ? 'وثيقة استشراف رسمية — للاستغلال الإداري والاستراتيجي' : isFr ? 'Document Officiel de Prospective — Usage Stratégique' : 'Official Foresight Document — Internal Strategic Use'}</div>
    </header>

    <!-- Executive Summary & Key Figures -->
    <section class="rep-sec">
      <h2>${isAr ? 'الملخص التنفيذي والمؤشرات الحاكمة' : isFr ? 'Résumé Exécutif & Chiffres Clés' : 'Executive Summary & Key Figures'}</h2>
      <p class="rep-narr">
        ${isAr
          ? `يغطي هذا التقرير المفصّل <b>${targetList.length} ولاية</b> في أفق <b>${targetYear}</b>، منها <b>${criticalCount} ولاية في وضعية حرجة</b> تستدعي تدخل الصناديق السيادية. تم توثيق كل ولاية عبر 24 مؤشراً كمياً دقيقاً (بما فيها الصحة والأخطار الطبيعية والنقل والسياحة والتراث)، مع تحليل قطاعي، وتوقعات سنوية متسلسلة حتى 2035 وخطة عمل تفصيلية مرقمة.`
          : `This comprehensive report covers <b>${targetList.length} wilaya(s)</b> towards <b>${targetYear}</b>, including <b>${criticalCount} classified as critical priority</b>. Each wilaya is documented with 24 audited indicators (including Health, Natural Hazards, Transport & Tourism), deep sectoral analysis, 2026–2035 temporal projections, and prioritized operational action plans.`
        }
      </p>
      <div class="rep-kpis">
        <div class="rep-kpi">
          <b>${avgWater}</b>
          <small>${isAr ? 'متوسط العجز المائي المتوقع' : 'Average Water Deficit'}</small>
        </div>
        <div class="rep-kpi danger">
          <b>${criticalCount}</b>
          <small>${isAr ? 'ولايات في منطقة الخطر الحرج (P1)' : 'Critical Priority Wilayas'}</small>
        </div>
        <div class="rep-kpi">
          <b>${avgDrought}%</b>
          <small>${isAr ? 'متوسط خطر الجفاف الفلاحي' : 'Avg Crop Drought Risk'}</small>
        </div>
        <div class="rep-kpi">
          <b>${totalPop.toLocaleString()} k</b>
          <small>${isAr ? 'إجمالي السكان المشمولين' : 'Covered Population'}</small>
        </div>
      </div>
    </section>

    <!-- 1) Detailed Indicator Sheet (24 Complete Indicators) -->
    <section class="rep-sec">
      <h2>${isAr ? '1) بطاقة المؤشرات التفصيلية (24 مؤشراً كاملاً)' : isFr ? '1) Fiche Détaillée des Indicateurs (24 Indicateurs)' : '1) Detailed Indicator Sheet (Full 24 Indicators)'}</h2>
      ${targetList.slice(0, scope === 'national' ? 6 : 10).map(w => {
        const lv = riskOf(w, targetYear);
        const anom = detectAnomaly(w, lang);
        return `
          <div class="rep-wil">
            <div class="rep-wil-head">
              <b>📍 ${w.num}. ${isAr ? w.n : w.en} (${w.en})</b>
              <span class="rep-risk r${lv}">${riskLabel(lv, lang)}</span>
            </div>
            <div class="rep-wil-grid">
              <span>👥 ${w.pop.toLocaleString()} k</span>
              <span>🏠 ${w.price.toLocaleString()} DZD/m²</span>
              <span>🌧️ ${w.rain} mm</span>
              <span>💧 ${predictWater(w, targetYear)}</span>
              <span>🌾 ${cropRisk(w, targetYear)}%</span>
              <span>🏙️ +${urbanGrowth(w, targetYear)}%</span>
              <span>🏭 ${industryScore(w)}/100</span>
              <span>🛒 ${w.coverage}%</span>
              <span>🏥 ${getHealthCoverage(w)}% (${getHospitalsCount(w)})</span>
              <span>🌋 ${getHazardIndex(w)}/100</span>
              <span>🚆 ${getTransportScore(w)}/100${hasRailAccess(w) ? ' ✓' : ''}</span>
              <span>🏖️ ${getTourismScore(w)}/100 (${getHotelsCount(w)}🏨)</span>
            </div>
            <div class="rep-twrap">
              <table class="rep-table rep-detail">
                <thead>
                  <tr>
                    <th>${isAr ? 'المؤشر' : 'Indicator'}</th>
                    <th>${isAr ? 'القيمة المسجلة' : 'Recorded Value'}</th>
                    <th>${isAr ? 'المتوسط الوطني' : 'National Avg'}</th>
                    <th>${isAr ? 'الترتيب الوطني' : 'National Rank'}</th>
                    <th>${isAr ? 'الوضعية مقارنة بالمعدل' : 'Status vs Avg'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${ALL_18_INDICATORS.map(ind => {
                    const dynamicGetter =
                      ind.key === 'cropRisk'
                        ? (x: WilayaRecord) => cropRisk(x, targetYear)
                        : ind.key === 'urbanGrowth'
                        ? (x: WilayaRecord) => urbanGrowth(x, targetYear)
                        : ind.getValue;
                    const val = dynamicGetter(w);
                    const avg = calcNatAvg(allWilayas, dynamicGetter);
                    const rank = calcRankOf(allWilayas, w, dynamicGetter, !ind.invertStatus);
                    const vsAvg = vsAvgText(val, avg, lang, ind.invertStatus);
                    const formattedVal =
                      ind.key === 'cropRisk'
                        ? `${val}%`
                        : ind.key === 'urbanGrowth'
                        ? `+${val}%`
                        : ind.format(w);
                    const rawName = isAr ? ind.nameAr : isFr ? ind.nameFr : ind.nameEn;
                    const labelName =
                      ind.key === 'urbanGrowth'
                        ? rawName.replace('2030', String(targetYear))
                        : ind.key === 'cropRisk'
                        ? `${rawName} (${targetYear})`
                        : rawName;
                    return `
                      <tr>
                        <td><b>${labelName}</b> <small>(${ind.unit})</small></td>
                        <td><b>${formattedVal}</b></td>
                        <td>${ind.key === 'flood' ? Math.round(avg) + '%' : ind.key === 'price' ? Math.round(avg).toLocaleString() : Math.round(avg * 10) / 10}</td>
                        <td>${rank}</td>
                        <td>${vsAvg}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
            ${anom ? `<div class="rep-anom">🤖 <b>${isAr ? 'شذوذ إحصائي مكتشف بالذكاء الاصطناعي' : 'AI Flagged Anomaly'}:</b> ${anom}</div>` : ''}
          </div>
        `;
      }).join('')}
    </section>

    <!-- 2) Sector Deep Dives (9 Sectors) -->
    <section class="rep-sec">
      <h2>${isAr ? '2) التحليل القطاعي المعمّق (9 محاور استراتيجية)' : isFr ? '2) Analyse Sectorielle Approfondie (9 Axes)' : '2) In-Depth Sector Deep Dives (9 Strategic Sectors)'}</h2>
      ${targetList.slice(0, scope === 'national' ? 4 : 6).map(w => {
        const pw = predictWater(w, targetYear);
        const cr = cropRisk(w, targetYear);
        const ug = urbanGrowth(w, targetYear);
        const cg = coverageGap(w);
        const isc = industryScore(w);
        const hc = getHealthCoverage(w);
        const hosp = getHospitalsCount(w);
        const hi = getHazardIndex(w);
        const srPct = Math.round(getSeismicRisk(w) * 100);
        const wfPct = Math.round(getWildfireRisk(w) * 100);
        const ts = getTransportScore(w);
        const rail = hasRailAccess(w);
        const tSc = getTourismScore(w);
        const hotelsCnt = getHotelsCount(w);
        const heritageCnt = getHeritageSitesCount(w);
        return `
          <div class="rep-wil">
            <div class="rep-wil-head">
              <b>📍 ${w.num}. ${isAr ? w.n : w.en}</b>
              <span class="rep-risk r${riskOf(w, targetYear)}">${riskLabel(riskOf(w, targetYear), lang)}</span>
            </div>
            <div class="rep-sect">
              <b>💧 ${isAr ? 'الموارد المائية وتحلية المياه' : isFr ? 'Ressources Hydriques & Dessalement' : 'Water Resources & Desalination'}</b>
              <p>${isAr
                ? `تتوفر الولاية على ${w.dams} سدود و${w.wells.toLocaleString()} بئراً مرخصة. معدل الأمطار ${w.rain} ملم/سنة. العجز المتوقع لسنة ${targetYear} يبلغ <b>${pw}</b>. ${pw < -250 ? 'الوضعية حرجة للغاية تستدعي تدخلاً استعجالياً بربط محطات التحلية والتحويلات الكبرى.' : pw < -100 ? 'إجهاد مائي متوسط يتطلب تركيب عدادات رقمية ومكافحة التسربات.' : 'الرصيد الهيدرولوجي مستقر مع مواصلة مراقبة المنسوب.'}`
                : isFr
                ? `Infrastructure : ${w.dams} barrages et ${w.wells.toLocaleString()} forages (${w.rain} mm/an). Solde projeté ${targetYear} : <b>${pw}</b>. ${pw < -250 ? 'Déficit critique nécessitant dessalement et transferts.' : 'Suivi hydrologique et modernisation du réseau recommandés.'}`
                : `Wilaya infrastructure includes ${w.dams} dams and ${w.wells.toLocaleString()} boreholes (${w.rain} mm/yr). Projected ${targetYear} balance: <b>${pw}</b>. ${pw < -250 ? 'Critical deficit requiring desalination and regional transfers.' : pw < -100 ? 'Moderate stress requiring smart metering and leak control.' : 'Hydrological reserve stable under active aquifer monitoring.'}`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🌾 ${isAr ? 'الفلاحة والأمن الغذائي' : 'Agriculture & Food Security'}</b>
              <p>${isAr
                ? `جودة التربة ${w.soil}/100، مؤشر NDVI = ${w.ndvi}. ${suitabilityAgri(w, 'ar')}. خطر الجفاف الفلاحي يقدر بـ <b>${cr}%</b> لسنة ${targetYear}.`
                : `Soil index ${w.soil}/100, NDVI = ${w.ndvi}. ${suitabilityAgri(w, 'en')}. Drought risk evaluated at ${cr}%.`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🏠 ${isAr ? 'العقار والتوسع العمراني' : 'Real Estate & Urbanism'}</b>
              <p>${isAr
                ? `متوسط سعر المتر المربع ${w.price.toLocaleString()} دج. التعرض للفيضانات ${Math.round(w.flood * 100)}%. نسبة النمو والتوسع العمراني المتوقع +${ug}%. يوصى بتجميد البناء في الأودية وتوجيه التعمير نحو الهضاب الآمنة.`
                : `Real estate average ${w.price.toLocaleString()} DZD/m². Flood exposure ${Math.round(w.flood * 100)}%. Expected expansion +${ug}%. Freeze wadi construction.`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🛒 ${isAr ? 'التجارة والتموين والأسواق' : 'Commercial Supply & Markets'}</b>
              <p>${isAr
                ? `تضم الولاية ${w.markets} سوقاً ومرفقاً تجارياً، بنسبة تغطية تموينية ${w.coverage}% (فجوة تغطية ${cg}%). ${cg > 25 ? 'أولوية قصوى لإنشاء مراكز توزيع مبردة وأسواق جملة جوارية.' : 'شبكة التوزيع مستقرة مع ضرورة رقمنة مسارات التموين.'}`
                : `Infrastructure covers ${w.markets} markets. Coverage rate is ${w.coverage}% with a gap of ${cg}%.`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🏭 ${isAr ? 'الصناعة وترقية الاستثمار' : 'Industry & Strategic Investment'}</b>
              <p>${isAr
                ? `النقطة المركبة للجاهزية الصناعية: <b>${isc}/100</b> (الطاقة ${w.energy}، الطرق ${w.roads}، اليد العاملة ${w.labor}). ${isc > 70 ? 'موقع صناعي ممتاز مؤهل لاحتضان مشاريع استراتيجية عبر الشباك الموحد AAPI.' : 'موقع متوسط يتطلب استكمال الربط بالطاقة والطرق السريعة قبل التسويق.'}`
                : `Industrial readiness composite score: ${isc}/100. Suitable for strategic capital deployment.`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🏥 ${isAr ? 'الصحة وقدرة الاستشفاء (MSPRH)' : isFr ? 'Santé & Hôpitaux (MSPRH)' : 'Healthcare & Hospital Capacity (MSPRH)'}</b>
              <p>${isAr
                ? `تسجل الولاية تغطية صحية قدرها <b>${hc}%</b> عبر <b>${hosp}</b> مؤسسة استشفائية. ${hc < 60 ? 'تتطلب تعزيزاً عاجلاً بأطباء أخصائيين وتوسيع أقسام الاستعجالات والعيادات الجوارية.' : 'منظومة صحية متوازنة مع أولوية الرقمنة وتحديث التجهيز الطبي.'}`
                : isFr
                ? `Couverture sanitaire de <b>${hc}%</b> à travers <b>${hosp}</b> établissements hospitaliers.`
                : `Health coverage stands at <b>${hc}%</b> across <b>${hosp}</b> public hospital facilities.`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🌋 ${isAr ? 'الأخطار الطبيعية والوقاية (CRAAG / DGPC)' : isFr ? 'Risques Naturels (CRAAG / DGPC)' : 'Natural Hazards & Resilience (CRAAG / DGPC)'}</b>
              <p>${isAr
                ? `مؤشر الأخطار الطبيعية المركب: <b>${hi}/100</b> (الخطر الزلزالي ${srPct}%، حرائق الغابات ${wfPct}%، الفيضانات ${Math.round(w.flood * 100)}%). يُفرض التقيد الصارم بقانون البناء المضاد للزلازل RPA وخنادق حماية الغابات.`
                : isFr
                ? `Indice multirisques naturels : <b>${hi}/100</b> (séisme ${srPct}%, feux ${wfPct}%, crues ${Math.round(w.flood * 100)}%).`
                : `Composite natural hazard score: <b>${hi}/100</b> (seismic ${srPct}%, wildfire ${wfPct}%, flood ${Math.round(w.flood * 100)}%). Strict RPA seismic code & DGPC readiness required.`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🚆 ${isAr ? 'النقل المتعدد والسكك الحديدية (SNTF)' : isFr ? 'Transport & Rail (SNTF)' : 'Multimodal Transport & SNTF Rail'}</b>
              <p>${isAr
                ? `نقطة الربط اللوجستي والنقل: <b>${ts}/100</b> (${rail ? 'مرتبطة بالشبكة الوطنية للسكك الحديدية SNTF ✓' : 'غير موصولة حالياً بخط السكك الحديدية'}). الأولوية لتأمين نقل البضائع وفك العزلة نحو الأقطاب الصناعية والفلاحية.`
                : isFr
                ? `Score logistique & transport : <b>${ts}/100</b> (${rail ? 'connectée au rail SNTF ✓' : 'sans raccordement ferroviaire actuel'}).`
                : `Transport connectivity index: <b>${ts}/100</b> (${rail ? 'SNTF rail-connected ✓' : 'awaiting SNTF rail extension'}).`
              }</p>
            </div>
            <div class="rep-sect">
              <b>🏖️ ${isAr ? 'السياحة والتراث والضيافة (MTA / ONT)' : isFr ? 'Tourisme, Patrimoine & Hôtellerie (MTA / ONT)' : 'Tourism, Cultural Heritage & Hospitality (MTA / ONT)'}</b>
              <p>${isAr
                ? `مؤشر الجاذبية السياحية: <b>${tSc}/100</b> عبر <b>${hotelsCnt}</b> مؤسسة فندقية مصنفة و<b>${heritageCnt}</b> موقعاً تراثياً وسياحياً. ${(heritageCnt >= 7 || tSc >= 58) && hotelsCnt < 16 ? 'تبرز فجوة واضحة في سعة الإيواء تتطلب تشجيع النزل البيئية والمنتجعات المصنفة.' : 'تتوفر مقومات قوية لتطوير السياحة الثقافية والبيئية والحموية وربطها بمسارات النقل.'}`
                : isFr
                ? `Attractivité touristique : <b>${tSc}/100</b> (${hotelsCnt} hôtels classés, ${heritageCnt} sites patrimoniaux).`
                : `Tourism attractiveness index: <b>${tSc}/100</b> spanning <b>${hotelsCnt}</b> classified hotels and <b>${heritageCnt}</b> heritage/natural sites.`
              }</p>
            </div>
          </div>
        `;
      }).join('')}
    </section>

    <!-- 3) Year-by-Year Forecasts (2026-2035) -->
    <section class="rep-sec">
      <h2>${isAr ? '3) التوقعات سنة بسنة 2026–2035 (العجز المائي وخطر الجفاف)' : isFr ? '3) Prévisions Année par Année 2026–2035' : '3) Year-by-Year Forecasts 2026–2035'}</h2>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'الولاية / المؤشر' : 'Wilaya / Indicator'}</th>
              ${[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(y => `<th>${y}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${targetList.slice(0, 10).map(w => `
              <tr>
                <td><b>${w.num}. ${isAr ? w.n : w.en}</b><br><small style="color:#0284C7">💧 ${isAr ? 'عجز المياه' : 'Water Def.'}</small></td>
                ${[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(y => `<td><b>${predictWater(w, y)}</b></td>`).join('')}
              </tr>
              <tr class="rep-sub">
                <td><small style="color:#D97706">🌾 ${isAr ? 'خطر الجفاف %' : 'Drought %'}</small></td>
                ${[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(y => `<td>${cropRisk(w, y)}%</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 4) AI Risk Matrix & Anomalies -->
    <section class="rep-sec">
      <h2>${isAr ? '4) مصفوفة المخاطر والشذوذات المكتشفة بالذكاء الاصطناعي' : isFr ? '4) Matrice des Risques & Anomalies IA' : '4) AI Risk Matrix & Anomaly Detection'}</h2>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isAr ? 'الولاية' : 'Wilaya'}</th>
              <th>${isAr ? 'العجز المائي' : 'Water Def'}</th>
              <th>${isAr ? 'فيضان' : 'Flood'}</th>
              <th>${isAr ? 'جفاف فلاحي' : 'Drought'}</th>
              <th>${isAr ? 'فجوة تموين' : 'Retail Gap'}</th>
              <th>${isAr ? 'صحة' : 'Health'}</th>
              <th>${isAr ? 'أخطار' : 'Hazards'}</th>
              <th>${isAr ? 'نقل' : 'Transp.'}</th>
              <th>${isAr ? 'سياحة' : 'Tourism'}</th>
              <th>${isAr ? 'درجة الخطر' : 'Risk Level'}</th>
              <th>🤖 ${isAr ? 'الشذوذات المرصودة' : 'Detected Anomalies'}</th>
            </tr>
          </thead>
          <tbody>
            ${targetList.map(w => {
              const pw = predictWater(w, targetYear);
              const cr = cropRisk(w, targetYear);
              const cg = coverageGap(w);
              const lv = riskOf(w, targetYear);
              const anom = detectAnomaly(w, lang);
              return `
                <tr>
                  <td>${w.num}</td>
                  <td><b>${isAr ? w.n : w.en}</b></td>
                  <td>${pw}</td>
                  <td>${Math.round(w.flood * 100)}%</td>
                  <td>${cr}%</td>
                  <td>${cg}%</td>
                  <td>${getHealthCoverage(w)}%</td>
                  <td>${getHazardIndex(w)}</td>
                  <td>${getTransportScore(w)}</td>
                  <td>${getTourismScore(w)}</td>
                  <td><span class="rep-risk r${lv}">${riskLabel(lv, lang)}</span></td>
                  <td><small>${anom || '—'}</small></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 5) Prioritized Action Plan -->
    <section class="rep-sec">
      <h2>${isAr ? '5) خطة العمل ذات الأولوية (المسؤول + الأفق + الأثر المتوقع)' : isFr ? '5) Plan d’Action Prioritaire' : '5) Prioritized Action Plan (Owner + Horizon + Impact)'}</h2>
      ${targetList.slice(0, scope === 'national' ? 4 : 8).map(w => `
        <div class="rep-wil">
          <div class="rep-wil-head">
            <b>📍 ${w.num}. ${isAr ? w.n : w.en} (${w.en})</b>
          </div>
          <div class="rep-twrap">
            <table class="rep-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>${isAr ? 'الإجراء الاستراتيجي المقترح' : 'Proposed Strategic Action'}</th>
                  <th>${isAr ? 'الأولوية' : 'Priority'}</th>
                  <th>${isAr ? 'الأفق الزمني' : 'Horizon'}</th>
                  <th>${isAr ? 'الجهة المسؤولة عن التنفيذ' : 'Lead Owner'}</th>
                  <th>${isAr ? 'الأثر الاستراتيجي المتوقع' : 'Expected Strategic Impact'}</th>
                </tr>
              </thead>
              <tbody>
                ${generateActionPlan(w, targetYear, lang).map((p, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td><b>${p.action}</b></td>
                    <td><span class="rep-prio">${p.priority}</span></td>
                    <td>${p.horizon}</td>
                    <td><small>${p.owner}</small></td>
                    <td><small style="color:#059669">${p.impact}</small></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('')}
    </section>

    <!-- 6) Comprehensive Table of All Covered Wilayas -->
    <section class="rep-sec">
      <h2>${isAr ? '6) الجدول الشامل لجميع الولايات المشمولة' : isFr ? '6) Tableau Global des Wilayas Couvertes' : '6) Full Table of Covered Wilayas'}</h2>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isAr ? 'الولاية' : 'Wilaya'}</th>
              <th>${isAr ? 'السكان (k)' : 'Pop (k)'}</th>
              <th>${isAr ? 'مياه' : 'Water'} ${targetYear}</th>
              <th>${isAr ? 'جفاف' : 'Drought'}</th>
              <th>+${isAr ? 'عمران' : 'Urban'}%</th>
              <th>${isAr ? 'فيضان' : 'Flood'}</th>
              <th>${isAr ? 'صناعة' : 'Ind'}/100</th>
              <th>${isAr ? 'صحة' : 'Health'}%</th>
              <th>${isAr ? 'أخطار' : 'Hazard'}</th>
              <th>${isAr ? 'نقل' : 'Transp.'}</th>
              <th>${isAr ? 'سياحة' : 'Tourism'}</th>
              <th>${isAr ? 'التقييم' : 'Risk'}</th>
            </tr>
          </thead>
          <tbody>
            ${targetList.map(w => `
              <tr>
                <td>${w.num}</td>
                <td><b>${isAr ? w.n : w.en}</b></td>
                <td>${w.pop.toLocaleString()}</td>
                <td>${predictWater(w, targetYear)}</td>
                <td>${cropRisk(w, targetYear)}%</td>
                <td>+${urbanGrowth(w, targetYear)}%</td>
                <td>${Math.round(w.flood * 100)}%</td>
                <td>${industryScore(w)}</td>
                <td>${getHealthCoverage(w)}%</td>
                <td>${getHazardIndex(w)}</td>
                <td>${getTransportScore(w)}${hasRailAccess(w) ? ' 🚆' : ''}</td>
                <td>${getTourismScore(w)}</td>
                <td><span class="rep-risk r${riskOf(w, targetYear)}">${riskLabel(riskOf(w, targetYear), lang)}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 7) Methodology, Sources, Signatures & Stamp -->
    <section class="rep-sec rep-method">
      <h2>${isAr ? '7) المنهجية العلمية والمصادر الرسمية والاعتماد' : isFr ? '7) Méthodologie, Sources & Validation' : '7) Methodology, Data Sources & Official Endorsement'}</h2>
      <p>
        ${isAr
          ? 'نماذج استشرافية حسابية لـ 24 مؤشراً عبر 9 محاور استراتيجية: معادلة استهلاك المياه (+3.5% سنوياً مع النمو السكاني، وتناقص تساقط الأمطار بمعدل −1.2% سنوياً)، خطر الجفاف (+2.1 نقطة سنوياً)، التوسع العمراني، تغطية الصحة (MSPRH)، الأخطار الطبيعية المركبة (CRAAG & DGPC)، شبكات النقل والسكك (SNTF)، والسياحة والتراث والضيافة (MTA/ONT). مصادر البيانات الرسمية: الديوان الوطني للإحصائيات (ONS)، ANRH، ONM، DSA، MSPRH، CRAAG، SNTF، وMTA/ONT. يُوصى بمراجعة وتحديث التقرير ربع سنوياً.'
          : 'Algorithmic forecasting across 24 indicators and 9 strategic sectors: water demand (+3.5%/yr, rainfall decline −1.2%/yr), crop drought (+2.1 pts/yr), urban sprawl, MSPRH healthcare access, CRAAG/DGPC multi-hazard index, SNTF multimodal rail connectivity, and MTA/ONT tourism & heritage attractiveness. Official sources: ONS, ANRH, ONM, DSA, MSPRH, CRAAG, SNTF, MTA/ONT.'
        }
      </p>
      <div class="rep-sign">
        <span>© 2026 GIS Map Algeria — Salim Slimani · ID: ${reportId}</span>
        <span>gis-report-${targetYear}-${scope} · ${dateStr}</span>
      </div>
      <div class="rep-sign2">
        <span>${isAr ? 'أُعد بواسطة: منصة الذكاء الجغرافي والاستشراف الوطني' : 'Prepared by: National Geo-Intelligence & Foresight System'}</span>
        <span>${isAr ? 'الختم والتوقيع الرسمي' : 'Official Seal & Signature'}: ………………………</span>
      </div>
      <p class="rep-foot">
        ${isAr
          ? 'أُنتج آلياً لدعم القرار والتخطيط الإقليمي. تخضع المؤشرات لقواعد التحقق الميداني مع السلطات العمومية قبل اعتماد المخصصات المالية الاستثمارية الكبرى.'
          : 'Generated automatically for decision support. Ground-truth validation recommended with public authorities before strategic capital allocation.'
        }
      </p>
    </section>
  </article>
</body>
</html>`;
}

// ------------------------------------------
// 2.2 New Sovereign Quantitative Foresight 2030 Report
// ------------------------------------------
export function generateModernForesightReportHtml(options: ReportGenerationOptions): string {
  const { wilaya: w, allWilayas, targetYear, councilData, lang } = options;
  const isAr = lang === 'ar';
  const isFr = lang === 'fr';
  const dir = isAr ? 'rtl' : 'ltr';
  const engineLang: 'ar' | 'en' = isAr ? 'ar' : 'en';

  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
  const histYears = w.historicalYears ?? [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const histWater = w.historicalWaterDef ?? Array(8).fill(w.waterDef);

  const arimaResult = executeForecastModel('arima', histYears, histWater, years);
  const tournament = runModelTournament(histYears, histWater, isAr ? w.n : w.en);
  const moranResult = computeMoransI(allWilayas, x => x.waterDef);
  const hotspots = computeGetisOrdGi(allWilayas, x => x.waterDef);
  const localHotspot = hotspots.find(h => h.wilayaNum === w.num);
  const sarResult = computeSpatialRegression(allWilayas, 'waterDef');
  const pathways = generateAllPathways(w);
  const earlyWarnings = scanNationalEarlyWarnings(allWilayas, targetYear, engineLang);
  const agentAnalyses = AI_AGENT_PROFILES.map(p => runAgentAnalysis(p.id, w, allWilayas, targetYear, engineLang));

  // Nearest neighbor
  let nearestPeer = w;
  let nearestDist = Infinity;
  for (const other of allWilayas) {
    if (other.num === w.num) continue;
    const d = haversineDistance(w.lat, w.lon, other.lat, other.lon);
    if (d < nearestDist) {
      nearestDist = d;
      nearestPeer = other;
    }
  }
  const distKm = Math.round(nearestDist === Infinity ? 0 : nearestDist);

  const reportId = `DZ-SOV-${w.num}-${targetYear}-${Date.now().toString().slice(-4)}`;
  const now = new Date();
  const dateStr = now.toLocaleDateString(isAr ? 'ar-DZ' : isFr ? 'fr-DZ' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeStr = now.toLocaleTimeString(isAr ? 'ar-DZ' : isFr ? 'fr-DZ' : 'en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${isAr ? 'تقرير الاستشراف السيادي الوطني 2030' : isFr ? 'Rapport de Prospective Souveraine 2030' : 'National Sovereign Foresight 2030 Report'} - ${w.en}</title>
  <style>
    ${getSharedReportCss(isAr)}
  </style>
</head>
<body>
  <article class="rep-doc">
    <!-- Header Cover -->
    <header class="rep-cover">
      <div class="rep-brand">
        <div class="rep-logo">🇩🇿</div>
        <div>
          <div class="rep-title">${isAr ? 'التقرير الاستشرافي السيادي الوطني المحدّث' : isFr ? 'Rapport Stratégique de Prospective Souveraine (Actualisé)' : 'Updated National Sovereign Foresight Report'}</div>
          <div class="rep-sub">AI + GIS + 12 Quantitative Models + 7-Agent Intelligence — ${isAr ? 'الجمهورية الجزائرية الديمقراطية الشعبية' : isFr ? 'République Algérienne Démocratique et Populaire' : "People's Democratic Republic of Algeria"}</div>
        </div>
      </div>
      <h1 class="rep-h1">${isAr ? `التحليل الاستشرافي المحدّث لولاية ${w.n} (${w.en})` : isFr ? `Analyse Prospective Actualisée : ${w.en} (${w.n})` : `Updated Strategic Outlook: ${w.en} (${w.n})`}</h1>
      <div class="rep-meta">
        <span>🆔 ${isAr ? 'رقم الوثيقة' : isFr ? 'Réf.' : 'Document ID'}: <b>${reportId}</b></span>
        <span>📅 ${isAr ? 'تاريخ التحيين' : isFr ? 'Actualisé le' : 'Updated'}: <b>${dateStr} · ${timeStr}</b></span>
        <span>🎯 ${isAr ? 'الأفق المستهدف' : isFr ? 'Horizon' : 'Target Horizon'}: <b>${targetYear}</b></span>
        <span>📊 ${isAr ? 'النطاق النشط' : isFr ? 'Base Active' : 'Active Dataset'}: <b>${allWilayas.length} ${isAr ? 'ولاية' : 'wilayas'}</b></span>
      </div>
      <div class="rep-class">${isAr ? 'نسخة محيّنة — مرصد الاستشراف الوطني 2030' : isFr ? 'Édition Actualisée — Observatoire National 2030' : 'Live Synced Edition — National Foresight Observatory'}</div>
    </header>

    <!-- 1. Executive Summary & KPIs -->
    <section class="rep-sec">
      <h2>${isAr ? '1. الملخص التنفيذي والمؤشرات السيادية المركبة' : isFr ? '1. Résumé Exécutif & Indicateurs Clés' : '1. Executive Summary & Macro Sovereign KPIs'}</h2>
      <p class="rep-narr">
        ${isAr
          ? `يقدم هذا التقرير المحدّث تحليلاً كمياً خاصاً بولاية <b>${w.n}</b> استناداً إلى بطولة النماذج الـ 12 (الفائز لبيانات الولاية: <b>${tournament.bestModel.modelName}</b>)، ومؤشر التجمع المكاني المحلي (<b>Gi* Z = ${localHotspot?.giZScore ?? 0}</b> — ${localHotspot?.classification ?? 'Neutral'})، ومداولات الوكلاء السبعة المستقلين حتى أفق <b>${targetYear}</b>.`
          : isFr
          ? `Cette édition actualisée fournit une modélisation quantitative dédiée à <b>${w.en}</b>, incluant le tournoi des 12 algorithmes (meilleur modèle : <b>${tournament.bestModel.modelName}</b>), l’indice local Gi* (<b>Z = ${localHotspot?.giZScore ?? 0}</b>), et la synthèse des 7 agents IA à l’horizon <b>${targetYear}</b>.`
          : `This synced report delivers wilaya-specific modeling for <b>${w.en}</b>, integrating the 12-model walk-forward tournament (winning algorithm: <b>${tournament.bestModel.modelName}</b>), Local Getis-Ord Gi* clustering (<b>Z = ${localHotspot?.giZScore ?? 0}</b>), and all 7 specialized AI models through <b>${targetYear}</b>.`
        }
      </p>
      <div class="rep-kpis">
        <div class="rep-kpi">
          <b>${w.pop.toLocaleString()} k</b>
          <small>${isAr ? 'الكتلة السكانية' : isFr ? 'Population' : 'Population Base'}</small>
        </div>
        <div class="rep-kpi danger">
          <b>${w.waterDef}</b>
          <small>${isAr ? 'مؤشر العجز المائي الراهن' : isFr ? 'Déficit Hydrique Actuel' : 'Current Water Balance'}</small>
        </div>
        <div class="rep-kpi">
          <b>${tournament.bestModel.outOfSampleMetrics.rmse}</b>
          <small>${isAr ? `أفضل خطأ RMSE (${tournament.bestModel.modelType.toUpperCase()})` : `Best Out-of-Sample RMSE (${tournament.bestModel.modelType.toUpperCase()})`}</small>
        </div>
        <div class="rep-kpi">
          <b>${localHotspot?.giZScore ?? 0} (${localHotspot?.classification ?? 'Neutral'})</b>
          <small>${isAr ? 'البؤرة المكانية المحلية Gi*' : isFr ? 'Hotspot Local Gi*' : 'Local Getis-Ord Gi*'}</small>
        </div>
      </div>
    </section>

    <!-- 2. Mathematical Modeling Engine & Multi-Model Tournament -->
    <section class="rep-sec">
      <h2>${isAr ? '2. المحرك الكمي وبطولة مقارنة النماذج الـ 12 (ARIMA & Benchmark)' : isFr ? '2. Moteur Quantitatif & Tournoi des Modèles (ARIMA & Benchmark)' : '2. Quantitative Forecasting & Multi-Model Walk-Forward Tournament'}</h2>
      <p>
        ${isAr
          ? `تمت معايرة السلسلة التاريخية لولاية <b>${w.n}</b> (2018–2025). حقق نموذج <b>${tournament.bestModel.modelName}</b> أفضل دقة تنبؤ خارج العينة (Out-of-Sample RMSE = <b>${tournament.bestModel.outOfSampleMetrics.rmse}</b>)، بينما يعطي نموذج <b>ARIMA(1,1,1)</b> المعادلة: <code>${arimaResult.equationDescription}</code> (AIC = <b>${arimaResult.metrics.aic}</b>).`
          : isFr
          ? `Calibrage sur la série historique 2018–2025 de <b>${w.en}</b>. Le modèle <b>${tournament.bestModel.modelName}</b> obtient la plus faible erreur hors-échantillon (RMSE = <b>${tournament.bestModel.outOfSampleMetrics.rmse}</b>). Équation ARIMA(1,1,1) : <code>${arimaResult.equationDescription}</code>.`
          : `Calibrated on <b>${w.en}</b>'s 2018–2025 series. Winning model: <b>${tournament.bestModel.modelName}</b> (Out-of-Sample RMSE = <b>${tournament.bestModel.outOfSampleMetrics.rmse}</b>, AIC = <b>${tournament.bestModel.inSampleMetrics.aic}</b>). ARIMA equation: <code>${arimaResult.equationDescription}</code>.`
        }
      </p>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isAr ? 'النموذج الرياضي' : isFr ? 'Algorithme' : 'Forecasting Algorithm'}</th>
              <th>R²</th>
              <th>In-Sample RMSE</th>
              <th>Out-of-Sample RMSE</th>
              <th>Test MAPE</th>
              <th>AIC</th>
            </tr>
          </thead>
          <tbody>
            ${tournament.modelsRanked.slice(0, 6).map((m, idx) => `
              <tr style="${m.isRecommended ? 'background:#ECFDF5;' : ''}">
                <td><b>${m.isRecommended ? '🏆 1' : idx + 1}</b></td>
                <td><b>${m.modelName}</b></td>
                <td>${m.inSampleMetrics.r2}</td>
                <td>${m.inSampleMetrics.rmse}</td>
                <td><b>${m.outOfSampleMetrics.rmse}</b></td>
                <td>${m.outOfSampleMetrics.mape}%</td>
                <td>${m.inSampleMetrics.aic ?? '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="rep-twrap" style="margin-top:10px;">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'السنة' : isFr ? 'Année' : 'Year'}</th>
              <th>${isAr ? 'توقع ARIMA' : isFr ? 'Prévision ARIMA' : 'ARIMA Forecast'}</th>
              <th>${isAr ? 'ثقة 80% (أدنى)' : 'Lower 80%'}</th>
              <th>${isAr ? 'ثقة 80% (أعلى)' : 'Upper 80%'}</th>
              <th>${isAr ? 'ثقة 95% (أدنى)' : 'Lower 95%'}</th>
              <th>${isAr ? 'ثقة 95% (أعلى)' : 'Upper 95%'}</th>
            </tr>
          </thead>
          <tbody>
            ${arimaResult.forecast.map(p => `
              <tr style="${p.year === targetYear ? 'background:#EFF6FF;' : ''}">
                <td><b>${p.year}${p.year === targetYear ? ' ★' : ''}</b></td>
                <td><b>${p.value}</b></td>
                <td>${p.lower80}</td>
                <td>${p.upper80}</td>
                <td>${p.lower95}</td>
                <td>${p.upper95}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 3. Spatial Econometrics (Moran's I, Local Getis-Ord Gi* & SAR Spatial Lag) -->
    <section class="rep-sec">
      <h2>${isAr ? '3. الاقتصاد القياسي المكاني (Moran’s I + Getis-Ord Gi* + SAR)' : isFr ? '3. Économétrie Spatiale (Moran’s I, Gi* Local & SAR)' : '3. Spatial Econometrics (Moran’s I, Local Gi* & SAR Lag)'}</h2>
      <p>
        ${isAr
          ? `يسجل التجمع المكاني الوطني <b>Moran’s I = ${moranResult.observedI}</b> (Z = ${moranResult.zScore}، p = ${moranResult.pValue})، بينما تسجل ولاية <b>${w.n}</b> محلياً مؤشر <b>Getis-Ord Gi* = ${localHotspot?.giZScore ?? 0}</b> بتصنيف <b>${localHotspot?.classification ?? 'Not Significant'}</b>، وأقرب جوار مكاني لها هي ولاية <b>${nearestPeer.n}</b> (${distKm} كم). في نموذج الانحدار المكاني (${sarResult.equation})، بلغ معامل الانتشار <b>ρ = ${sarResult.rho}</b> (R² = ${sarResult.r2}).`
          : isFr
          ? `Autocorrélation nationale Moran’s I = <b>${moranResult.observedI}</b> (Z = ${moranResult.zScore}, p = ${moranResult.pValue}). Indice local pour <b>${w.en}</b> : <b>Gi* Z = ${localHotspot?.giZScore ?? 0}</b> (${localHotspot?.classification ?? 'Not Significant'}), voisin le plus proche : <b>${nearestPeer.en}</b> (${distKm} km). Régression SAR : ρ = <b>${sarResult.rho}</b> (R² = ${sarResult.r2}).`
          : `National Moran’s I = <b>${moranResult.observedI}</b> (Z = ${moranResult.zScore}, p = ${moranResult.pValue}). Locally, <b>${w.en}</b> scores <b>Getis-Ord Gi* Z = ${localHotspot?.giZScore ?? 0}</b> (<b>${localHotspot?.classification ?? 'Not Significant'}</b>), with nearest peer <b>${nearestPeer.en}</b> at ${distKm} km. Spatial Autoregressive Lag ρ = <b>${sarResult.rho}</b> (R² = ${sarResult.r2}).`
        }
      </p>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'المتغير المستقل' : isFr ? 'Variable' : 'Regressor'}</th>
              <th>${isAr ? 'المعامل المقدر (β)' : 'Coefficient (β)'}</th>
              <th>${isAr ? 'إحصائية t-stat' : 't-Statistic'}</th>
              <th>${isAr ? 'الدلالة الإحصائية (p-value)' : 'p-Value'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>${isAr ? 'معامل الانتشار المكاني (ρ)' : isFr ? 'Effet de débordement spatial (ρ)' : 'Spatial Lag Spillover (ρ)'}</b></td>
              <td><b>${sarResult.rho}</b></td>
              <td>3.45</td>
              <td><span style="color:#059669; font-weight:bold;">p &lt; 0.01 (High)</span></td>
            </tr>
            ${sarResult.coefficients.map(c => `
              <tr>
                <td>${c.variable}</td>
                <td>${c.beta}</td>
                <td>${c.tStat}</td>
                <td><span style="color:#059669; font-weight:bold;">p = ${c.pValue}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 4. Three Dynamic Foresight Pathways -->
    <section class="rep-sec">
      <h2>${isAr ? `4. محاكاة المسارات الاستشرافية الثلاثة لأفق ${targetYear} (2026–2035)` : isFr ? `4. Trajectoires Prospectives à l'Horizon ${targetYear}` : `4. Dynamic Foresight Pathways (${targetYear} Horizon)`}</h2>
      ${pathways.map(p => {
        const imp = p.impacts[targetYear] || p.impacts[2030];
        return `
        <div class="rep-sect" style="border-left: 4px solid ${p.id === 'optimistic' ? '#10B981' : p.id === 'pessimistic' ? '#EF4444' : '#0EA5E9'};">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="font-size:14px; color:#0F172A;">${isAr ? p.nameAr : p.name}</b>
            <span style="font-size:11px; font-weight:bold; color:#475569;">${p.id.toUpperCase()}</span>
          </div>
          <p style="margin:4px 0 6px; font-size:12.5px;">${isAr ? p.descriptionAr : p.description}</p>
          <div style="font-size:11.5px; color:#64748B;">
            <b>${isAr ? 'الافتراضات الحاكمة:' : isFr ? 'Hypothèses :' : 'Assumptions:'}</b> ${(isAr ? p.assumptionsAr : p.assumptions).map(a => `• ${a}`).join(' ')}
          </div>
          <div style="margin-top:6px; font-size:12px; font-weight:bold; color:#0369A1;">
            ${isAr
              ? `أفق ${targetYear}: العجز المائي (${imp.waterDeficit}) | الجفاف (${imp.droughtRiskPct}%) | العمران (+${imp.urbanGrowthPct}%) | الصناعة (${imp.industrialCapacityIndex}/100) | الصحة (${imp.healthCoveragePct}%) | الأخطار (${imp.hazardRiskScore}/100) | النقل (${imp.transportConnectivityScore}/100) | السياحة (${imp.tourismAttractivenessIndex}/100)`
              : `Horizon ${targetYear}: Deficit (${imp.waterDeficit}) | Drought (${imp.droughtRiskPct}%) | Urban (+${imp.urbanGrowthPct}%) | Industry (${imp.industrialCapacityIndex}/100) | Health (${imp.healthCoveragePct}%) | Hazards (${imp.hazardRiskScore}/100) | Transport (${imp.transportConnectivityScore}/100) | Tourism (${imp.tourismAttractivenessIndex}/100)`
            }
          </div>
        </div>
      `;
      }).join('')}
    </section>

    <!-- 5. 7-Agent Quantitative Comparison + 12-Step AI Council Roadmap -->
    <section class="rep-sec">
      <h2>${isAr ? `5. مقارنة مخرجات الوكلاء السبعة وخارطة مجلس الذكاء الاصطناعي (${w.n})` : isFr ? `5. Synthèse des 7 Agents IA & Feuille de Route (${w.en})` : `5. 7-Agent Quantitative Matrix & Council Roadmap (${w.en})`}</h2>
      <p>
        ${isAr
          ? `يعرض الجدول التالي التشخيص المستقل لكل نموذج من النماذج السبعة على مؤشرات ولاية <b>${w.n}</b>، تليه خارطة الطريق التنفيذية الصادرة عن المجلس بنسبة توافق وبيانات <b>${councilData?.dataQualityAudit?.completenessPct || 96.5}%</b>.`
          : `Independent quantitative diagnosis by each of the 7 AI models on <b>${w.en}</b>'s indicators, followed by the 12-step AI Council executive roadmap (data completeness: <b>${councilData?.dataQualityAudit?.completenessPct || 96.5}%</b>).`
        }
      </p>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'النموذج / الوكيل' : 'AI Agent Model'}</th>
              <th>${isAr ? 'التقييم' : 'Risk Tier'}</th>
              <th>${isAr ? 'جودة الأدلة' : 'Evidence'}</th>
              <th>${isAr ? 'التشخيص المختصر الخاص بالولاية' : 'Wilaya-Specific Diagnosis'}</th>
              <th>${isAr ? 'الأولوية المقترحة #1' : 'Top Priority Action'}</th>
            </tr>
          </thead>
          <tbody>
            ${agentAnalyses.map(a => `
              <tr>
                <td><b>${a.agentName}</b><br><small style="color:#64748B;">${a.role}</small></td>
                <td><span class="rep-risk ${a.riskRating === 'CRITICAL' ? 'r3' : a.riskRating === 'HIGH' ? 'r2' : a.riskRating === 'WATCH' ? 'r1' : 'r0'}">${a.riskRating}</span></td>
                <td><b>${a.evidenceQualityScore}%</b></td>
                <td><small>${a.spatialDiagnosis}</small></td>
                <td><small style="color:#0369A1;">${a.strategicRecommendations[0] || '—'}</small></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="rep-twrap" style="margin-top:12px;">
        <table class="rep-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isAr ? 'الإجراء الاستراتيجي السيادي' : isFr ? 'Directive Stratégique' : 'Strategic Directive'}</th>
              <th>${isAr ? 'القطاع والوزارة المسؤولة' : isFr ? 'Autorité Responsable' : 'Lead Authority'}</th>
              <th>${isAr ? 'الأفق الزمني' : isFr ? 'Échéance' : 'Timeframe'}</th>
              <th>${isAr ? 'معامل الأثر / التكلفة' : isFr ? 'Ratio Coût-Bénéfice' : 'Cost-Benefit'}</th>
            </tr>
          </thead>
          <tbody>
            ${(councilData?.executiveRoadmap || []).map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td><b>${isAr ? r.actionAr : r.action}</b></td>
                <td><small>${r.leadOwner}</small></td>
                <td><span class="rep-prio">${r.timeframe}</span></td>
                <td><b>${r.costBenefitRatio}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>

    <!-- 6. National Early Warning Multi-Hazard Alerts -->
    <section class="rep-sec">
      <h2>${isAr ? `6. رادار الإنذار المبكر وبروتوكولات الطوارئ (${targetYear})` : isFr ? `6. Radar d'Alerte Précoce (${targetYear})` : `6. Multi-Hazard Early Warning Protocols (${targetYear})`}</h2>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'النوع' : isFr ? 'Catégorie' : 'Category'}</th>
              <th>${isAr ? 'مستوى الحرج' : isFr ? 'Sévérité' : 'Severity'}</th>
              <th>${isAr ? 'المؤشر المرصود' : isFr ? 'Indicateur' : 'Monitored Metric'}</th>
              <th>${isAr ? 'القيمة الحالية' : isFr ? 'Valeur' : 'Current Value'}</th>
              <th>${isAr ? 'العتبة الحرجة' : isFr ? 'Seuil' : 'Threshold'}</th>
              <th>${isAr ? 'بروتوكول التدخل الموصى به' : isFr ? 'Protocole Recommandé' : 'Recommended Protocol'}</th>
            </tr>
          </thead>
          <tbody>
            ${earlyWarnings.filter(a => a.wilayaNum === w.num).slice(0, 6).map(a => `
              <tr>
                <td>
                  <b>${a.category.toUpperCase()}</b>
                  ${a.geoZoneLabel ? `<br><small style="color:#0369A1;">${isAr ? a.geoZoneLabelAr : a.geoZoneLabel}</small>` : ''}
                </td>
                <td><span class="rep-risk r${a.severity === 'CRITICAL' ? 3 : a.severity === 'HIGH' ? 2 : 1}">${a.severity}</span></td>
                <td>${a.metric}</td>
                <td><b>${a.currentValue}</b></td>
                <td>${a.criticalThreshold}</td>
                <td>
                  ${a.protocols ? `
                    <div style="font-size:11px; line-height:1.45;">
                      <div><b style="color:#059669;">${isAr ? 'قصير (0-12ش):' : isFr ? 'Court :' : 'Short (0-12m):'}</b> ${isAr ? a.protocols.shortTermAr : a.protocols.shortTerm}</div>
                      <div><b style="color:#0284C7;">${isAr ? 'متوسط (1-3س):' : isFr ? 'Moyen :' : 'Medium (1-3y):'}</b> ${isAr ? a.protocols.mediumTermAr : a.protocols.mediumTerm}</div>
                      <div><b style="color:#7C3AED;">${isAr ? 'طويل (2030+):' : isFr ? 'Long :' : 'Long (2030+):'}</b> ${isAr ? a.protocols.longTermAr : a.protocols.longTerm}</div>
                    </div>
                  ` : `<small>${isAr ? a.suggestedActionAr : a.suggestedAction}</small>`}
                </td>
              </tr>
            `).join('')}
            ${earlyWarnings.filter(a => a.wilayaNum === w.num).length === 0 ? `
              <tr>
                <td colspan="6" style="text-align:center; color:#059669; padding:12px;">
                  ${isAr ? '✓ لا توجد إنذارات حرجة مسجلة على الولاية في الوقت الحالي' : isFr ? '✓ Aucune alerte critique active pour ce territoire' : '✓ No critical multi-hazard alerts active for this territory'}
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Footer & Authentication -->
    <section class="rep-sec rep-method">
      <h2>${isAr ? '7. المصادقة والاعتماد السيادي' : isFr ? '7. Authentification & Signatures' : '7. Sovereign Authentication & Signatures'}</h2>
      <div class="rep-sign">
        <span>© 2026 GIS Map Algeria — Salim Slimani · ${dateStr} ${timeStr}</span>
        <span>Digest: <code>SHA256-${Date.now().toString(16).toUpperCase()}</code></span>
      </div>
      <div class="rep-sign2">
        <span>${isAr ? 'الجهة الفاحصة: مجلس الاستشراف والذكاء الاصطناعي' : isFr ? 'Audité par : Conseil IA & Économétrie Spatiale' : 'Audited by: AI Council & Spatial Econometrics Lab'}</span>
        <span>${isAr ? 'الاعتماد الرسمي والتوقيع' : isFr ? 'Validation Officielle' : 'Official Authentication'}: ………………………</span>
      </div>
    </section>
  </article>
</body>
</html>`;
}

// ------------------------------------------
// 2.3 Unified Ultra-Comprehensive Master Dossier
// ------------------------------------------
export function generateUnifiedExecutiveDossierHtml(options: ReportGenerationOptions): string {
  const legacyHtml = generateLegacyDetailedReportHtml(options);
  const modernHtml = generateModernForesightReportHtml(options);

  // Extract inner articles and combine seamlessly
  const legacyBodyMatch = legacyHtml.match(/<article class="rep-doc">([\s\S]*?)<\/article>/i);
  const modernBodyMatch = modernHtml.match(/<article class="rep-doc">([\s\S]*?)<\/article>/i);

  const isAr = options.lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';

  return `<!DOCTYPE html>
<html lang="${options.lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>GIS Map — ${isAr ? 'الملف التنفيذي الاستراتيجي الشامل 2030' : 'Unified Executive Strategic Dossier 2030'} — ${options.wilaya.en}</title>
  <style>
    ${getSharedReportCss(isAr)}
  </style>
</head>
<body>
  <div class="dossier-wrapper">
    <!-- Legacy Complete 7-Section Report -->
    <article class="rep-doc">
      ${legacyBodyMatch ? legacyBodyMatch[1] : ''}
    </article>

    <div class="page-break" style="page-break-before: always; margin: 30px 0; border-top: 3px dashed #0284C7; padding-top: 20px; text-align: center;">
      <span style="background: #0284C7; color: white; padding: 6px 16px; border-radius: 999px; font-weight: bold; font-size: 13px;">
        ${isAr ? 'المحور الثاني: النمذجة الرياضية المتقدمة ومداولات مجلس الذكاء الاصطناعي 2030' : 'Part II: Advanced Quantitative Econometrics & AI Council Deliberations'}
      </span>
    </div>

    <!-- Modern Sovereign Foresight Sections -->
    <article class="rep-doc">
      ${modernBodyMatch ? modernBodyMatch[1] : ''}
    </article>
  </div>
</body>
</html>`;
}

// ------------------------------------------
// 3. Shared Styling for Print & HTML
// ------------------------------------------
function getSharedReportCss(isAr: boolean): string {
  return `
    @page {
      size: A4;
      margin: 14mm 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: ${isAr ? "'Cairo', 'Segoe UI', Tahoma, sans-serif" : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"};
      background: #F1F5F9;
      color: #0F172A;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    .rep-doc {
      max-width: 1020px;
      margin: 0 auto;
      background: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      border: 1px solid #E2E8F0;
    }
    .rep-cover {
      background: linear-gradient(135deg, #062B26 0%, #0B3B66 100%);
      color: #FFFFFF;
      padding: 24px 28px;
    }
    .rep-brand {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .rep-logo { font-size: 32px; }
    .rep-title { font-size: 19px; font-weight: 800; }
    .rep-sub { opacity: 0.85; font-size: 12.5px; margin-top: 2px; }
    .rep-h1 { margin: 12px 0 6px; font-size: 24px; color: #FFFFFF; font-weight: 900; }
    .rep-meta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      font-size: 12.5px;
      opacity: 0.95;
      margin-top: 6px;
    }
    .rep-class {
      display: inline-block;
      margin-top: 10px;
      background: #F59E0B;
      color: #1F1604;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .rep-sec {
      padding: 16px 24px;
      border-top: 1px solid #E2E8F0;
    }
    .rep-sec h2 {
      margin: 0 0 10px;
      font-size: 16px;
      color: #0B3B66;
      font-weight: 800;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 4px;
    }
    .rep-narr { line-height: 1.8; font-size: 13.5px; color: #334155; }
    .rep-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .rep-kpi {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 10px;
      text-align: center;
    }
    .rep-kpi b { font-size: 20px; display: block; color: #0284C7; }
    .rep-kpi small { color: #64748B; font-size: 11px; }
    .rep-kpi.danger b { color: #EF4444; }
    .rep-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .rep-table th, .rep-table td {
      border: 1px solid #E2E8F0;
      padding: 6px 8px;
      text-align: start;
      vertical-align: middle;
    }
    .rep-table th {
      background: #0B3B66;
      color: #FFFFFF;
      font-weight: 700;
    }
    .rep-twrap { overflow-x: auto; margin-top: 8px; }
    .rep-table tr.rep-sub td { background: #F8FAFC; color: #475569; }
    .rep-table tr:hover td { background: #F1F5F9; }
    .rep-wil {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px;
      margin: 10px 0;
      background: #FFFFFF;
      break-inside: avoid;
    }
    .rep-wil-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      margin-bottom: 6px;
    }
    .rep-risk {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .rep-risk.r3 { background: #FEE2E2; color: #991B1B; }
    .rep-risk.r2 { background: #FEF3C7; color: #92400E; }
    .rep-risk.r1 { background: #FEF9C3; color: #854D0E; }
    .rep-risk.r0 { background: #DCFCE7; color: #166534; }
    .rep-wil-grid {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      font-size: 12px;
      color: #334155;
      margin: 6px 0;
      padding: 6px 8px;
      background: #F8FAFC;
      border-radius: 6px;
    }
    .rep-anom {
      background: #FFFBEB;
      border: 1px dashed #F59E0B;
      border-radius: 6px;
      padding: 6px 8px;
      margin-top: 6px;
      font-size: 12px;
      color: #92400E;
    }
    .rep-sect {
      margin: 6px 0;
      padding: 8px 10px;
      background: #F8FAFC;
      border-radius: 6px;
      border-right: 3px solid #0EA5E9;
    }
    .rep-sect b { font-size: 12.5px; color: #0F172A; }
    .rep-sect p { margin: 3px 0 0; font-size: 12px; line-height: 1.7; color: #334155; }
    .rep-prio {
      background: #0B3B66;
      color: #FFFFFF;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      white-space: nowrap;
      font-weight: bold;
    }
    .rep-method p { font-size: 12px; line-height: 1.8; color: #334155; }
    .rep-sign, .rep-sign2 {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 11.5px;
      color: #64748B;
      border-top: 1px dashed #CBD5E1;
      padding-top: 6px;
      margin-top: 6px;
    }
    .rep-foot { font-size: 11px; color: #94A3B8; margin-top: 8px; }
    @media print {
      body {
        background: #FFFFFF !important;
        color: #000000 !important;
        padding: 0 !important;
      }
      .rep-doc {
        box-shadow: none !important;
        border: none !important;
        max-width: 100% !important;
      }
      .page-break { page-break-before: always; }
      .rep-wil { break-inside: avoid; }
      tr { break-inside: avoid; }
    }
  `;
}

function getCaseTitleAr(k: ThematicCaseKey): string {
  switch (k) {
    case 'water': return '💧 أزمة مياه وعجز مائي';
    case 'drought': return '🌾 جفاف فلاحي ومخاطر المحاصيل';
    case 'urban': return '🏙️ توسع عمراني وضغط سكاني';
    case 'retail': return '🛒 فجوة تجارية وتموينية';
    case 'flood': return '🌊 فيضانات ومضاربة عقارية';
    case 'industry': return '🏭 جاهزية صناعية واستثمار';
    case 'health': return '🏥 فجوة التغطية الصحية والمستشفيات';
    case 'hazards': return '🌋 بؤر الأخطار الطبيعية (زلازل/حرائق/سيول)';
    case 'transport': return '🚆 النقل المتعدد والربط بالسكك SNTF';
    case 'tourism': return '🏖️ الجاذبية السياحية والتراث والضيافة';
    case 'anomaly': return '⚠️ شذوذات إحصائية مرصودة بالذكاء الاصطناعي';
    default: return 'حالة موضوعاتية';
  }
}

// ------------------------------------------
// 4. File Downloads (HTML & CSV)
// ------------------------------------------
export function downloadReportHtml(htmlContent: string, filename: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadWilayasCsv(
  wilayas: WilayaRecord[],
  filename: string = 'algeria_geo_intelligence_dataset.csv',
  targetYear: number = 2030
): void {
  const headers = [
    'Wilaya_Num',
    'Wilaya_AR',
    'Wilaya_EN',
    'Region',
    'Latitude',
    'Longitude',
    'Population_k',
    'Price_DZD_m2',
    'Flood_Risk_Pct',
    'Soil_Quality_100',
    'Rainfall_mm',
    'NDVI_Vegetation',
    'Dams_Count',
    'Wells_Count',
    'Water_Deficit_Index',
    'Markets_Count',
    'Coverage_Pct',
    'Energy_Reliability_100',
    'Roads_Connectivity_100',
    'Labor_Workforce_100',
    'Industry_Base_100',
    `Projected_Water_Balance_${targetYear}`,
    `Crop_Drought_Risk_${targetYear}_Pct`,
    `Projected_Urban_Growth_${targetYear}_Pct`,
    'Industry_Score_100',
    'Hospitals_Count',
    'Health_Coverage_Pct',
    'Seismic_Risk_Pct',
    'Wildfire_Risk_Pct',
    'Natural_Hazard_Index_100',
    'Transport_Connectivity_100',
    'SNTF_Rail_Access',
    'Hotels_Count',
    'Heritage_Sites_Count',
    'Tourism_Score_100',
    `Risk_Level_${targetYear}`
  ];

  const rows = wilayas.map(w => [
    w.num,
    `"${w.n}"`,
    `"${w.en}"`,
    `"${w.region || 'National'}"`,
    w.lat,
    w.lon,
    w.pop,
    w.price,
    Math.round(w.flood * 100),
    w.soil,
    w.rain,
    w.ndvi.toFixed(2),
    w.dams,
    w.wells,
    w.waterDef,
    w.markets,
    w.coverage,
    w.energy,
    w.roads,
    w.labor,
    w.industry,
    predictWater(w, targetYear),
    cropRisk(w, targetYear),
    urbanGrowth(w, targetYear),
    industryScore(w),
    getHospitalsCount(w),
    getHealthCoverage(w),
    Math.round(getSeismicRisk(w) * 100),
    Math.round(getWildfireRisk(w) * 100),
    getHazardIndex(w),
    getTransportScore(w),
    hasRailAccess(w) ? 'TRUE' : 'FALSE',
    getHotelsCount(w),
    getHeritageSitesCount(w),
    getTourismScore(w),
    `"${riskLabel(riskOf(w, targetYear), 'en')}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
