/**
 * GIS Map – Scenario Simulation Engine (National Foresight 2030)
 * Optimistic, Baseline, and Pessimistic Dynamic Pathways
 * © 2026 Salim Slimani & National Foresight System
 */

import { ScenarioImpact, ScenarioPathway, WilayaRecord } from '../types';

export interface ScenarioDriverSettings {
  popGrowthRatePct: number;       // default ~1.6% per year
  climateRainChangePct: number;   // default -1.2% per year
  tempIncreaseC: number;          // default +0.3C per 5 years
  irrigationEfficiencyPct: number;// default 55%
  desalinationCapexMillionM3: number; // additional capacity by 2030
  urbanZoningStrictness: number;  // 0 to 100
}

export const DEFAULT_SCENARIO_DRIVERS: Record<'optimistic' | 'baseline' | 'pessimistic', ScenarioDriverSettings> = {
  optimistic: {
    popGrowthRatePct: 1.2,
    climateRainChangePct: +2.0, // slight adaptation / cloud seeding / stabilization
    tempIncreaseC: 0.1,
    irrigationEfficiencyPct: 85,
    desalinationCapexMillionM3: 650,
    urbanZoningStrictness: 85
  },
  baseline: {
    popGrowthRatePct: 1.6,
    climateRainChangePct: -1.2,
    tempIncreaseC: 0.35,
    irrigationEfficiencyPct: 58,
    desalinationCapexMillionM3: 250,
    urbanZoningStrictness: 50
  },
  pessimistic: {
    popGrowthRatePct: 2.1,
    climateRainChangePct: -4.5,
    tempIncreaseC: 0.75,
    irrigationEfficiencyPct: 42,
    desalinationCapexMillionM3: 50,
    urbanZoningStrictness: 25
  }
};

export function simulateWilayaScenario(
  w: WilayaRecord,
  drivers: ScenarioDriverSettings,
  years: number[] = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]
): Record<number, ScenarioImpact> {
  const impacts: Record<number, ScenarioImpact> = {};

  years.forEach(yr => {
    const horizon = yr - 2026;
    // Cumulative demographic factor
    const cumPopMult = Math.pow(1 + drivers.popGrowthRatePct / 100, horizon);
    const projectedPop = w.pop * cumPopMult;

    // Cumulative rainfall factor
    const cumRainMult = Math.max(0.4, 1 + (drivers.climateRainChangePct / 100) * horizon);
    const projectedRain = w.rain * cumRainMult;

    // Water Deficit Equation
    // Base deficit worsened by population demand, improved by desalination & irrigation savings
    const demandIncrease = (projectedPop - w.pop) * 0.045; // m3/capita delta index
    const climateLoss = (w.rain - projectedRain) * 0.035;
    const techSaving = (drivers.irrigationEfficiencyPct - 50) * 0.12 * Math.min(1, horizon / 4);
    const desalinOffset = (drivers.desalinationCapexMillionM3 / 100) * 0.8 * Math.min(1, horizon / 3);

    const projectedDeficit = Math.round(w.waterDef - demandIncrease - climateLoss + techSaving + desalinOffset);

    // Crop Drought Risk Equation
    let droughtRisk = 100 - (w.soil * 0.45 + (projectedRain / 10) * 0.8 + w.ndvi * 50);
    droughtRisk += horizon * 1.8 * (1 + drivers.tempIncreaseC);
    droughtRisk -= (drivers.irrigationEfficiencyPct - 50) * 0.35;
    if (projectedRain < 200) droughtRisk += 14;
    droughtRisk = Math.max(2, Math.min(98, Math.round(droughtRisk)));

    // Urban Expansion %
    const sprawlFactor = (100 - drivers.urbanZoningStrictness) / 100;
    const urbanGrowthPct = Math.round(
      (projectedPop / 100) * (w.price / 60000) * horizon * 0.7 * (0.6 + sprawlFactor * 0.8) + horizon * 1.2
    );

    // Agri Output Index (Base 100)
    const agriOutput = Math.max(
      20,
      Math.round(100 * (projectedRain / Math.max(1, w.rain)) * (drivers.irrigationEfficiencyPct / 55) - (droughtRisk - 40) * 0.4)
    );

    // Industry Capacity Index (Base 100)
    const indWaterPenalty = projectedDeficit < -20 ? Math.abs(projectedDeficit + 20) * 0.8 : 0;
    const industryCapacity = Math.max(30, Math.min(160, Math.round(w.industry * 1.1 + horizon * 1.4 - indWaterPenalty)));

    impacts[yr] = {
      year: yr,
      waterDeficit: projectedDeficit,
      droughtRiskPct: droughtRisk,
      urbanGrowthPct,
      agriculturalOutputIndex: agriOutput,
      industrialCapacityIndex: industryCapacity
    };
  });

  return impacts;
}

export function generateAllPathways(
  w: WilayaRecord,
  customDrivers?: Partial<Record<'optimistic' | 'baseline' | 'pessimistic', Partial<ScenarioDriverSettings>>>
): ScenarioPathway[] {
  const baseDrivers = {
    ...DEFAULT_SCENARIO_DRIVERS.baseline,
    ...(customDrivers?.baseline || {})
  };
  const optDrivers = {
    ...DEFAULT_SCENARIO_DRIVERS.optimistic,
    ...(customDrivers?.optimistic || {})
  };
  const pessDrivers = {
    ...DEFAULT_SCENARIO_DRIVERS.pessimistic,
    ...(customDrivers?.pessimistic || {})
  };

  const baseRainSign = baseDrivers.climateRainChangePct > 0 ? `+${baseDrivers.climateRainChangePct}%` : `${baseDrivers.climateRainChangePct}%`;

  const pathways: ScenarioPathway[] = [
    {
      id: 'optimistic',
      name: 'Optimistic Scenario (Green Acceleration & Water Security)',
      nameAr: 'السيناريو المتفائل (تسريع الاستدامة والأمن المائي)',
      description: 'Rapid deployment of seawater desalination plants, high-efficiency drip irrigation (85%), solar-powered pumps, and strict urban land zoning.',
      descriptionAr: 'دخول محطات تحلية مياه البحر الكبرى حيز الخدمة، تعميم السقي الذكي بالتقطير (85%)، كبح التوسع العشوائي نحو الأراضي الفلاحية.',
      assumptions: [
        `Desalination capacity expands +${optDrivers.desalinationCapexMillionM3}M m³/yr`,
        `Agricultural drip irrigation coverage reaches ${optDrivers.irrigationEfficiencyPct}%`,
        'Strict cadastre zoning freezes construction in wadi flood beds',
        'Renewable energy integration reduces pumping costs'
      ],
      assumptionsAr: [
        `توسيع قدرات التحلية والتعبئة المائية بمقدار +${optDrivers.desalinationCapexMillionM3} مليون م³/سنة`,
        `بلوغ كفاءة السقي الفلاحي بالتقطير والري الذكي ${optDrivers.irrigationEfficiencyPct}%`,
        'تجميد البناء نهائياً داخل مجاري الأودية ومناطق الخطر الفيضاني بالمسح العقاري',
        'دمج الطاقة الشمسية لخفض كلفة الضخ والتبريد الفلاحي'
      ],
      impacts: simulateWilayaScenario(w, optDrivers)
    },
    {
      id: 'baseline',
      name: 'Baseline Scenario (Organic Continuity / Status Quo)',
      nameAr: 'السيناريو المرجعي (استمرار الاتجاهات الحالية)',
      description: 'Moderate progress on ongoing hydraulic transfers, standard demographic growth (+1.6%/yr), gradual rainfall decline of -1.2% per year.',
      descriptionAr: 'استمرار وتيرة المشاريع الحالية دون طفرات هيكلية، نمو ديمغرافي منتظم، تراجع تدريجي في التساقطات المطرية بنسبة -1.2% سنوياً.',
      assumptions: [
        `Planned hydraulic & public investments add +${baseDrivers.desalinationCapexMillionM3}M m³ with historic lag`,
        `Rainfall anomaly trend (${baseRainSign}/yr) under Mediterranean climate shifts`,
        `Average agricultural water efficiency around ${baseDrivers.irrigationEfficiencyPct}%`,
        `Urban perimeter expands at zoning strictness ${baseDrivers.urbanZoningStrictness}/100`
      ],
      assumptionsAr: [
        `تنفيذ الاستثمارات العمومية والتحويلات (+${baseDrivers.desalinationCapexMillionM3} مليون م³) بوتيرة تنفيذ تاريخية`,
        `تغيّر التساقط السنوي (${baseRainSign}/سنة) مع النمو السكاني (+${baseDrivers.popGrowthRatePct}%)`,
        `بقاء متوسط كفاءة استهلاك مياه الري الفلاحي في حدود ${baseDrivers.irrigationEfficiencyPct}%`,
        `توسع المحيط العمراني وفق صرامة مخطط توجيهي (${baseDrivers.urbanZoningStrictness}/100) حول المحاور الطرقية`
      ],
      impacts: simulateWilayaScenario(w, baseDrivers)
    },
    {
      id: 'pessimistic',
      name: 'Pessimistic Scenario (Severe Climate Stress & Resource Tension)',
      nameAr: 'السيناريو المتشائم (تفاقم الإجهاد المناخي وتراجع الموارد)',
      description: 'Consecutive multi-year drought, groundwater over-extraction, delay in desalination infrastructure, and unmanaged urban sprawl.',
      descriptionAr: 'سنوات جفاف متتابعة، استنزاف مكثف للمياه الجوفية، تأخر تسليم المحطات الكبرى، وضغط عقاري حاد على الأحواض الزراعية.',
      assumptions: [
        `Severe climate drying (${pessDrivers.climateRainChangePct}% annual rainfall anomaly)`,
        'Unmetered well drilling exceeds natural aquifer recharge thresholds',
        'Speculative peri-urban sprawl pushes into flood-prone beds',
        'Agricultural yields drop up to 35% in rainfed cereal zones'
      ],
      assumptionsAr: [
        `موجات جفاف حادة وتراجع سنوي للأمطار بنسبة (${pessDrivers.climateRainChangePct}% سنوياً)`,
        'حفر وضخ عشوائي من الآبار الجوفية يتجاوز عتبة التغذية الطبيعية',
        'زحف عمراني ومضاربة عقارية نحو أراضي الأحواض ومجاري السيول',
        'انخفاض مردودية الحبوب البعلية والزراعات المطرية حتى 35%'
      ],
      impacts: simulateWilayaScenario(w, pessDrivers)
    }
  ];

  return pathways;
}
