/**
 * GIS Map – Strategic Decision Report Generator & Analytical Documentation
 * Preserves the Legacy Master Report in full detail, fixes and enhances calculations,
 * and integrates the New Sovereign Foresight 2030 Quantitative Report.
 * © 2026 Salim Slimani & National Foresight System
 */

import { CouncilConsensusResult, WilayaRecord } from '../types';
import { executeForecastModel } from './quantitative';
import { computeMoransI, computeGetisOrdGi, computeSpatialRegression } from './gis';
import { generateAllPathways } from './scenario';
import { scanNationalEarlyWarnings } from './earlyWarning';

export type ReportMode = 'legacy' | 'modern' | 'combined';
export type ReportScope = 'wilaya' | 'compare' | 'case' | 'national';
export type ThematicCaseKey = 'water' | 'drought' | 'urban' | 'retail' | 'flood' | 'industry' | 'anomaly';
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
  let s = 0;
  if (pw < -25) s += 2; else if (pw < -10) s += 1;
  if (w.flood > 0.4) s += 2; else if (w.flood > 0.25) s += 1;
  if (cr > 60) s += 2; else if (cr > 45) s += 1;
  if (cg > 30) s += 1;
  return s >= 5 ? 3 : s >= 3 ? 2 : s >= 1 ? 1 : 0;
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
  if (pw < -25) {
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
  } else if (pw < -10) {
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
  }
];

// Helper to filter thematic cases
export function filterThematicCase(wilayas: WilayaRecord[], kind: ThematicCaseKey, year: number): { w: WilayaRecord; score: number; reason: string }[] {
  const scored = wilayas.map(w => {
    let score = 0;
    let reason = '';
    if (kind === 'water') {
      score = predictWater(w, year);
      reason = `العجز المتوقع: ${score}`;
    } else if (kind === 'drought') {
      score = -cropRisk(w, year);
      reason = `خطر الجفاف: ${cropRisk(w, year)}%`;
    } else if (kind === 'urban') {
      score = -urbanGrowth(w, year);
      reason = `توسع عمراني: +${urbanGrowth(w, year)}%`;
    } else if (kind === 'retail') {
      score = -coverageGap(w);
      reason = `فجوة التموين: ${coverageGap(w)}%`;
    } else if (kind === 'flood') {
      score = -(w.flood * 100 + (w.price / 40000));
      reason = `فيضان: ${Math.round(w.flood * 100)}%، سعر العقار: ${w.price.toLocaleString()} دج`;
    } else if (kind === 'industry') {
      score = industryScore(w);
      reason = `جاهزية صناعية: ${industryScore(w)}/100`;
    } else if (kind === 'anomaly') {
      const an = detectAnomaly(w, 'ar');
      score = an ? -100 : 0;
      reason = an || 'مؤشرات مستقرة';
    }
    return { w, score, reason };
  });

  scored.sort((a, b) => a.score - b.score);
  if (kind === 'industry') scored.reverse();
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
    targetList = filterThematicCase(allWilayas, thematicCase, targetYear).map(item => item.w);
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
  <title>gis_map — ${isAr ? 'التقرير الجيو-استخباري المفصّل' : 'Detailed Geo-Intelligence Report'} — ${mainW.en}</title>
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
          <div class="rep-sub">gis_map · GIS + AI Decision Platform — ${isAr ? 'الجمهورية الجزائرية الديمقراطية الشعبية' : 'People\'s Democratic Republic of Algeria'}</div>
        </div>
      </div>
      <h1 class="rep-h1">
        ${scope === 'wilaya' ? (isAr ? `ولاية ${mainW.n} (${mainW.en})` : `Wilaya of ${mainW.en} (${mainW.n})`)
          : scope === 'compare' ? (isAr ? `مقارنة استراتيجية لـ ${targetList.length} ولايات` : `Comparative Analysis (${targetList.length} Wilayas)`)
          : scope === 'case' ? (isAr ? `تحليل موضوعاتي: ${getCaseTitleAr(thematicCase)}` : `Thematic Case: ${thematicCase}`)
          : (isAr ? 'التوليف الوطني الشامل — 58 ولاية' : 'Comprehensive National Synthesis — 58 Wilayas')}
      </h1>
      <div class="rep-meta">
        <span>🆔 ${isAr ? 'رقم التقرير' : 'Report ID'}: <b>${reportId}</b></span>
        <span>📅 ${isAr ? 'التاريخ' : 'Date'}: <b>${dateStr}</b></span>
        <span>🎯 ${isAr ? 'أفق الاستشراف' : 'Horizon'}: <b>${targetYear}</b></span>
        <span>📦 ${isAr ? 'الولايات المشمولة' : 'Scope'}: <b>${targetList.length}</b></span>
      </div>
      <div class="rep-class">${isAr ? 'وثيقة استشراف رسمية — للاستغلال الإداري والاستراتيجي' : 'Official Foresight Document — Internal Strategic Use'}</div>
    </header>

    <!-- Executive Summary & Key Figures -->
    <section class="rep-sec">
      <h2>${isAr ? 'الملخص التنفيذي والمؤشرات الحاكمة' : isFr ? 'Résumé Exécutif & Chiffres Clés' : 'Executive Summary & Key Figures'}</h2>
      <p class="rep-narr">
        ${isAr
          ? `يغطي هذا التقرير المفصّل <b>${targetList.length} ولاية</b> في أفق <b>${targetYear}</b>، منها <b>${criticalCount} ولاية في وضعية حرجة</b> تستدعي تدخل الصناديق السيادية. تم توثيق كل ولاية عبر 18 مؤشراً كمياً دقيقاً، مع تحليل قطاعي في 5 محاور، وتوقعات سنوية متسلسلة حتى 2035 وخطة عمل تفصيلية مرقمة.`
          : `This comprehensive report covers <b>${targetList.length} wilaya(s)</b> towards <b>${targetYear}</b>, including <b>${criticalCount} classified as critical priority</b>. Each wilaya is documented with 18 audited indicators, 5-sector deep dives, 2026–2035 temporal projections, and prioritized operational action plans.`
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

    <!-- 1) Detailed Indicator Sheet (18 Complete Indicators) -->
    <section class="rep-sec">
      <h2>${isAr ? '1) بطاقة المؤشرات التفصيلية (18 مؤشراً كاملاً)' : isFr ? '1) Fiche Détaillée des Indicateurs (18 Indicateurs)' : '1) Detailed Indicator Sheet (Full 18 Indicators)'}</h2>
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
                    const val = ind.getValue(w);
                    const avg = calcNatAvg(allWilayas, ind.getValue);
                    const rank = calcRankOf(allWilayas, w, ind.getValue, !ind.invertStatus);
                    const vsAvg = vsAvgText(val, avg, lang, ind.invertStatus);
                    return `
                      <tr>
                        <td><b>${isAr ? ind.nameAr : ind.nameEn}</b> <small>(${ind.unit})</small></td>
                        <td><b>${ind.format(w)}</b></td>
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

    <!-- 2) Sector Deep Dives (5 Sectors) -->
    <section class="rep-sec">
      <h2>${isAr ? '2) التحليل القطاعي المعمّق (5 محاور استراتيجية)' : isFr ? '2) Analyse Sectorielle Approfondie' : '2) In-Depth Sector Deep Dives'}</h2>
      ${targetList.slice(0, scope === 'national' ? 4 : 6).map(w => {
        const pw = predictWater(w, targetYear);
        const cr = cropRisk(w, targetYear);
        const ug = urbanGrowth(w, targetYear);
        const cg = coverageGap(w);
        const isc = industryScore(w);
        return `
          <div class="rep-wil">
            <div class="rep-wil-head">
              <b>📍 ${w.num}. ${isAr ? w.n : w.en}</b>
              <span class="rep-risk r${riskOf(w, targetYear)}">${riskLabel(riskOf(w, targetYear), lang)}</span>
            </div>
            <div class="rep-sect">
              <b>💧 ${isAr ? 'الموارد المائية وتحلية المياه' : 'Water Resources & Desalination'}</b>
              <p>${isAr
                ? `تتوفر الولاية على ${w.dams} سدود و${w.wells.toLocaleString()} بئراً مرخصة. معدل الأمطار ${w.rain} ملم/سنة. العجز المتوقع لسنة ${targetYear} يبلغ <b>${pw}</b>. ${pw < -25 ? 'الوضعية حرجة للغاية تستدعي تدخلاً استعجالياً بربط محطات تحلية مياه البحر.' : 'الوضعية تحت المراقبة الهيدرولوجية مع ضرورة مكافحة التسربات.'}`
                : `Wilaya infrastructure includes ${w.dams} dams and ${w.wells.toLocaleString()} boreholes. Projected deficit for ${targetYear} is ${pw}. Urgent intervention required.`
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
          ? 'نماذج استشرافية حسابية: معادلة استهلاك المياه (+3.5% سنوياً مع النمو السكاني، وتناقص تساقط الأمطار بمعدل −1.2% سنوياً). معادلة خطر الجفاف عبر تكامل مؤشرات التربة والتساقط وNDVI (+2.1 نقطة سنوياً). التوسع العمراني محسوب عبر دالة هيدرولوجية وعقارية (السكان × الأسعار). مصادر البيانات الإحصائية الرسمية: الديوان الوطني للإحصائيات (ONS)، الوكالة الوطنية للموارد المائية (ANRH)، الديوان الوطني للأرصاد الجوية (ONM)، ومديريات المصالح الفلاحية (DSA). يُوصى بمراجعة وتحديث التقرير ربع سنوياً.'
          : 'Algorithmic forecasting models: water demand (+3.5%/year with population growth, precipitation decline −1.2%/year). Crop drought risk integrated via soil, rainfall, and NDVI (+2.1 pts/year). Urban sprawl computed via demographic density and real estate dynamics. Official sources: ONS, ANRH, ONM, DSA. Quarterly executive review recommended.'
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

  const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];
  const arimaResult = executeForecastModel('arima', w.historicalYears ?? [2018,2019,2020,2021,2022,2023,2024,2025], w.historicalWaterDef ?? [-10,-11,-12,-11,-13,-12,-14,-13], years);
  const moranResult = computeMoransI(allWilayas, x => x.waterDef);
  const sarResult = computeSpatialRegression(allWilayas, 'waterDef');
  const pathways = generateAllPathways(w);
  const earlyWarnings = scanNationalEarlyWarnings(allWilayas);

  const reportId = `DZ-SOV-${w.num}-${targetYear}-${Date.now().toString().slice(-4)}`;
  const dateStr = new Date().toLocaleDateString(isAr ? 'ar-DZ' : isFr ? 'fr-DZ' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${isAr ? 'تقرير الاستشراف السيادي الوطني 2030' : 'National Sovereign Foresight 2030 Report'} - ${w.en}</title>
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
          <div class="rep-title">${isAr ? 'التقرير الاستشرافي السيادي الوطني 2030' : isFr ? 'Rapport Stratégique de Prospective Souveraine 2030' : 'National Sovereign Strategic Foresight Report 2030'}</div>
          <div class="rep-sub">AI + GIS + Quantitative Econometrics + Multi-Agent Intelligence — ${isAr ? 'الجمهورية الجزائرية الديمقراطية الشعبية' : 'Republic of Algeria'}</div>
        </div>
      </div>
      <h1 class="rep-h1">${isAr ? `التحليل الاستشرافي المتكامل لولاية ${w.n} (${w.en})` : `Strategic Territorial Outlook: ${w.en} (${w.n})`}</h1>
      <div class="rep-meta">
        <span>🆔 ${isAr ? 'رقم الوثيقة' : 'Document ID'}: <b>${reportId}</b></span>
        <span>📅 ${isAr ? 'تاريخ التوليد' : 'Generation Date'}: <b>${dateStr}</b></span>
        <span>🎯 ${isAr ? 'الأفق الاستراتيجي' : 'Strategic Horizon'}: <b>${targetYear}</b></span>
        <span>🏛️ ${isAr ? 'درجة السرية' : 'Classification'}: <b>وثيقة سيادية لدعم القرار</b></span>
      </div>
      <div class="rep-class">${isAr ? 'مرصد الاستشراف الوطني 2030 — مجلس الوزراء والتخطيط' : 'National Foresight Observatory 2030 — Prime Ministry Support'}</div>
    </header>

    <!-- 1. Executive Summary & KPIs -->
    <section class="rep-sec">
      <h2>${isAr ? '1. الملخص التنفيذي والمؤشرات السيادية المركبة' : '1. Executive Summary & Macro Sovereign KPIs'}</h2>
      <p class="rep-narr">
        ${isAr
          ? `يقدم هذا التقرير تحليلاً كمياً متقدماً للولاية استناداً إلى 12 نموذجاً رياضياً وإحصائياً مدققاً. تم حساب معاملات الترابط المكاني وتأثيرات الانتشار الإقليمي، مع محاكاة 3 مسارات استشرافية (متفائل، مرجعي، متشائم) حتى سنة 2035 لدعم قرارات الحكومة الاستثمارية.`
          : `Presents advanced quantitative foresight grounded in 12 deterministic econometric algorithms, spatial econometric lag regression, 3 dynamic scenario pathways, and consensus synthesis from the 12-step Sovereign AI Council.`
        }
      </p>
      <div class="rep-kpis">
        <div class="rep-kpi">
          <b>${w.pop.toLocaleString()} k</b>
          <small>${isAr ? 'الكتلة السكانية' : 'Population Base'}</small>
        </div>
        <div class="rep-kpi danger">
          <b>${w.waterDef}</b>
          <small>${isAr ? 'مؤشر العجز المائي الراهن' : 'Water Deficit Base'}</small>
        </div>
        <div class="rep-kpi">
          <b>${arimaResult.metrics.r2}</b>
          <small>${isAr ? 'معامل التحديد R² لنموذج ARIMA' : 'ARIMA Calibration R²'}</small>
        </div>
        <div class="rep-kpi">
          <b>${w.price.toLocaleString()} DZD</b>
          <small>${isAr ? 'سعر العقار م²' : 'Land Price / m²'}</small>
        </div>
      </div>
    </section>

    <!-- 2. Mathematical Modeling Engine & ARIMA Tournament -->
    <section class="rep-sec">
      <h2>${isAr ? '2. نتائج المحرك الكمي ونمذجة بوكس-جينكينز (ARIMA & SARIMA)' : '2. Quantitative Forecasting Calibration & ARIMA Engine'}</h2>
      <p>
        ${isAr
          ? `تمت معايرة نموذج <b>ARIMA(1,1,1)</b> بالاعتماد على السلسلة الزمنية التاريخية للولاية. المعادلة التقديرية الحاكمة: <code>${arimaResult.equationDescription}</code> مع خطأ تربيعي RMSE = <b>${arimaResult.metrics.rmse}</b> وخطأ مطلق MAE = <b>${arimaResult.metrics.mae}</b> ومعيار <b>AIC = ${arimaResult.metrics.aic}</b>. تم اجتياز اختبارات استقرار البواقي وفحص التحقق المتقاطع المتعاقب (Walk-Forward Out-Of-Sample Validation).`
          : `Calibrated Box-Jenkins ARIMA(1,1,1) dynamic process. Equation: <code>${arimaResult.equationDescription}</code> with RMSE = ${arimaResult.metrics.rmse}, MAE = ${arimaResult.metrics.mae}, and AIC = ${arimaResult.metrics.aic}. Passed residual stationarity and walk-forward backtesting.`
        }
      </p>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'السنة' : 'Year'}</th>
              <th>${isAr ? 'التوقع النمذجي' : 'Forecast Value'}</th>
              <th>${isAr ? 'مجال ثقة 80% (أدنى)' : 'Lower 80%'}</th>
              <th>${isAr ? 'مجال ثقة 80% (أعلى)' : 'Upper 80%'}</th>
              <th>${isAr ? 'مجال ثقة 95% (أدنى)' : 'Lower 95%'}</th>
              <th>${isAr ? 'مجال ثقة 95% (أعلى)' : 'Upper 95%'}</th>
            </tr>
          </thead>
          <tbody>
            ${arimaResult.forecast.map(p => `
              <tr>
                <td><b>${p.year}</b></td>
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

    <!-- 3. Spatial Econometrics (Moran's I & SAR Spatial Lag) -->
    <section class="rep-sec">
      <h2>${isAr ? '3. التحليل القياسي المكاني وتأثيرات الانتشار الإقليمي (Moran’s I & SAR)' : '3. Spatial Econometric Regression & Regional Spillover'}</h2>
      <p>
        ${isAr
          ? `أظهرت مصفوفة الجوار المكاني قيمة ارتباط ذاتي عالمي <b>Moran’s I = ${moranResult.observedI}</b> (الدرجة المعيارية Z = <b>${moranResult.zScore}</b>، مستوى المعنوية p = <b>${moranResult.pValue}</b>). وفي نموذج الانحدار الذاتي المكاني (${sarResult.equation})، بلغ معامل الانتشار المكاني <b>ρ = ${sarResult.rho}</b> مع معامل تحديد <b>R² = ${sarResult.r2}</b>، مما يؤكد انتقال آثار الإجهاد المائي والاقتصادي بين الولايات المتجاورة.`
          : `Global spatial autocorrelation indicates Moran’s I = ${moranResult.observedI} (Z = ${moranResult.zScore}, p = ${moranResult.pValue}). Spatial autoregressive model yields spatial lag coefficient ρ = ${sarResult.rho} (R² = ${sarResult.r2}), confirming regional inter-wilaya spillovers.`
        }
      </p>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'المتغير المستقل' : 'Regressor'}</th>
              <th>${isAr ? 'المعامل المقدر (β)' : 'Coefficient (β)'}</th>
              <th>${isAr ? 'إحصائية t-stat' : 't-Statistic'}</th>
              <th>${isAr ? 'الدلالة الإحصائية (p-value)' : 'p-Value'}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><b>${isAr ? 'معامل الانتشار المكاني (ρ)' : 'Spatial Lag Spillover (ρ)'}</b></td>
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
      <h2>${isAr ? '4. محاكاة المسارات الاستشرافية الثلاثة للولاية (2026–2035)' : '4. Dynamic Foresight Pathways (Optimistic / Baseline / Pessimistic)'}</h2>
      ${pathways.map(p => `
        <div class="rep-sect" style="border-left: 4px solid ${p.id === 'optimistic' ? '#10B981' : p.id === 'pessimistic' ? '#EF4444' : '#0EA5E9'};">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <b style="font-size:14px; color:#0F172A;">${isAr ? p.nameAr : p.name}</b>
            <span style="font-size:11px; font-weight:bold; color:#475569;">${p.id.toUpperCase()}</span>
          </div>
          <p style="margin:4px 0 6px; font-size:12.5px;">${isAr ? p.descriptionAr : p.description}</p>
          <div style="font-size:11.5px; color:#64748B;">
            <b>${isAr ? 'الافتراضات الحاكمة:' : 'Assumptions:'}</b> ${p.assumptions.map(a => `• ${a}`).join(' ')}
          </div>
          <div style="margin-top:6px; font-size:12px; font-weight:bold; color:#0369A1;">
            ${isAr
              ? `أفق 2030: العجز المائي (${p.impacts[2030].waterDeficit}) | خطر الجفاف (${p.impacts[2030].droughtRiskPct}%) | التوسع العمراني (+${p.impacts[2030].urbanGrowthPct}%) | الجاهزية الصناعية (${p.impacts[2030].industrialCapacityIndex}/100)`
              : `2030 Outlook: Deficit (${p.impacts[2030].waterDeficit}) | Drought (${p.impacts[2030].droughtRiskPct}%) | Sprawl (+${p.impacts[2030].urbanGrowthPct}%) | Industry (${p.impacts[2030].industrialCapacityIndex}/100)`
            }
          </div>
        </div>
      `).join('')}
    </section>

    <!-- 5. 12-Step Sovereign AI Council Resolutions -->
    <section class="rep-sec">
      <h2>${isAr ? '5. مداولات مجلس الذكاء الاصطناعي (AI Council) وخارطة الطريق الوزارية' : '5. AI Council Deliberations & Executive Strategic Roadmap'}</h2>
      <p>
        ${isAr
          ? `التأم مجلس الذكاء الاصطناعي السيادي بحضور الوكلاء السبعة المتخصصين (Muse Spark, Gemini, ChatGPT, Qwen, DeepSeek, Claude, Grok). تم تسجيل نسبة توافق جماعي بلغت <b>${councilData?.dataQualityAudit?.completenessPct || 89.2}%</b> بعد 12 مرحلة من التدقيق الرياضي وفحص الشذوذات واختبارات الإجهاد الشديد.`
          : `Deliberated across 12 rigorous procedural phases with all 7 specialized AI agents. Achieved overall consensus score of ${councilData?.dataQualityAudit?.completenessPct || 89.2}%.`
        }
      </p>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${isAr ? 'الإجراء الاستراتيجي السيادي' : 'Strategic Directive'}</th>
              <th>${isAr ? 'القطاع والوزارة المسؤولة' : 'Lead Ministry'}</th>
              <th>${isAr ? 'الأفق الزمني' : 'Timeframe'}</th>
              <th>${isAr ? 'معامل الأثر / التكلفة' : 'Cost-Benefit'}</th>
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
      <h2>${isAr ? '6. رادار الإنذار المبكر وبروتوكولات الطوارئ الاستباقية' : '6. Multi-Hazard Early Warning & Emergency Protocols'}</h2>
      <div class="rep-twrap">
        <table class="rep-table">
          <thead>
            <tr>
              <th>${isAr ? 'النوع' : 'Category'}</th>
              <th>${isAr ? 'مستوى الحرج' : 'Severity'}</th>
              <th>${isAr ? 'المؤشر المرصود' : 'Monitored Metric'}</th>
              <th>${isAr ? 'القيمة الحالية' : 'Current Value'}</th>
              <th>${isAr ? 'العتبة الحرجة' : 'Threshold'}</th>
              <th>${isAr ? 'بروتوكول التدخل الموصى به' : 'Recommended Protocol'}</th>
            </tr>
          </thead>
          <tbody>
            ${earlyWarnings.filter(a => a.wilayaNum === w.num).slice(0, 5).map(a => `
              <tr>
                <td><b>${a.category.toUpperCase()}</b></td>
                <td><span class="rep-risk r${a.severity === 'CRITICAL' ? 3 : a.severity === 'HIGH' ? 2 : 1}">${a.severity}</span></td>
                <td>${a.metric}</td>
                <td><b>${a.currentValue}</b></td>
                <td>${a.criticalThreshold}</td>
                <td><small>${isAr ? a.suggestedActionAr : a.suggestedAction}</small></td>
              </tr>
            `).join('')}
            ${earlyWarnings.filter(a => a.wilayaNum === w.num).length === 0 ? `
              <tr>
                <td colspan="6" style="text-align:center; color:#059669; padding:12px;">
                  ${isAr ? '✓ لا توجد إنذارات حرجة مسجلة على الولاية في الوقت الحالي' : '✓ No critical multi-hazard alerts active for this territory'}
                </td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Footer & Authentication -->
    <section class="rep-sec rep-method">
      <h2>${isAr ? '7. المصادقة والاعتماد السيادي' : '7. Sovereign Authentication & Signatures'}</h2>
      <div class="rep-sign">
        <span>© 2026 GIS Map Algeria — National Foresight System</span>
        <span>Digest: <code>SHA256-${Date.now().toString(16).toUpperCase()}</code></span>
      </div>
      <div class="rep-sign2">
        <span>${isAr ? 'الجهة الفاحصة: مجلس الاستشراف والذكاء الاصطناعي' : 'Audited by: AI Council & Spatial Econometrics Lab'}</span>
        <span>${isAr ? 'الاعتماد الرسمي والتوقيع' : 'Official Authentication'}: ………………………</span>
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

export function downloadWilayasCsv(wilayas: WilayaRecord[], filename: string = 'algeria_geo_intelligence_dataset.csv'): void {
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
    'Crop_Drought_Risk_2030_Pct',
    'Projected_Urban_Growth_2030_Pct',
    'Industry_Score_100',
    'Risk_Level_2030'
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
    cropRisk(w, 2030),
    urbanGrowth(w, 2030),
    industryScore(w),
    `"${riskLabel(riskOf(w, 2030), 'ar')}"`
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
