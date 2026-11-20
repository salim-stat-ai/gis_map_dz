/**
 * GIS Map – Scenario Simulation Engine (National Foresight 2030)
 * Optimistic, Baseline, and Pessimistic Dynamic Pathways
 * © 2026 Salim Slimani & National Foresight System
 */

import { ScenarioImpact, ScenarioPathway, WilayaRecord } from '../types';
import { getHazardIndex, getHealthCoverage, getTransportScore, hasRailAccess } from './reporting';

export interface ScenarioDriverSettings {
  popGrowthRatePct: number;       // default ~1.6% per year
  climateRainChangePct: number;   // default -1.2% per year
  tempIncreaseC: number;          // default +0.3C per 5 years
  irrigationEfficiencyPct: number;// default 55%
  desalinationCapexMillionM3: number; // additional capacity by 2030
  urbanZoningStrictness: number;  // 0 to 100
  healthInfraInvestmentPct: number; // 0 to 100 healthcare & hospital capex boost
  hazardMitigationStrictness: number; // 0 to 100 seismic/flood/wildfire prevention
  transportRailExpansionPct: number;  // 0 to 100 SNTF rail & corridor upgrade
}

export const DEFAULT_SCENARIO_DRIVERS: Record<'optimistic' | 'baseline' | 'pessimistic', ScenarioDriverSettings> = {
  optimistic: {
    popGrowthRatePct: 1.2,
    climateRainChangePct: +2.0, // slight adaptation / cloud seeding / stabilization
    tempIncreaseC: 0.1,
    irrigationEfficiencyPct: 85,
    desalinationCapexMillionM3: 650,
    urbanZoningStrictness: 85,
    healthInfraInvestmentPct: 85,
    hazardMitigationStrictness: 85,
    transportRailExpansionPct: 85
  },
  baseline: {
    popGrowthRatePct: 1.6,
    climateRainChangePct: -1.2,
    tempIncreaseC: 0.35,
    irrigationEfficiencyPct: 58,
    desalinationCapexMillionM3: 250,
    urbanZoningStrictness: 50,
    healthInfraInvestmentPct: 45,
    hazardMitigationStrictness: 50,
    transportRailExpansionPct: 45
  },
  pessimistic: {
    popGrowthRatePct: 2.1,
    climateRainChangePct: -4.5,
    tempIncreaseC: 0.75,
    irrigationEfficiencyPct: 42,
    desalinationCapexMillionM3: 50,
    urbanZoningStrictness: 25,
    healthInfraInvestmentPct: 20,
    hazardMitigationStrictness: 20,
    transportRailExpansionPct: 15
  }
};

export function simulateWilayaScenario(
  w: WilayaRecord,
  drivers: ScenarioDriverSettings,
  years: number[] = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]
): Record<number, ScenarioImpact> {
  const impacts: Record<number, ScenarioImpact> = {};
  const baseHealth = getHealthCoverage(w);
  const baseHazard = getHazardIndex(w);
  const baseTransport = getTransportScore(w);
  const railLinked = hasRailAccess(w);

  years.forEach(yr => {
    const horizon = yr - 2026;
    const progress = Math.min(1, Math.max(0.15, horizon / 4));
    // Cumulative demographic factor
    const cumPopMult = Math.pow(1 + drivers.popGrowthRatePct / 100, horizon);
    const projectedPop = w.pop * cumPopMult;

    // Cumulative rainfall factor
    const cumRainMult = Math.max(0.4, 1 + (drivers.climateRainChangePct / 100) * horizon);
    const projectedRain = w.rain * cumRainMult;

    // Water Deficit Equation
    const demandIncrease = (projectedPop - w.pop) * 0.045;
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

    // Health Coverage % (demographics create bed pressure; health capex + transport improve access)
    const popStrain = (cumPopMult - 1) * 14;
    const healthCapexGain = ((drivers.healthInfraInvestmentPct - 35) / 100) * 26 * progress + (drivers.transportRailExpansionPct / 100) * 4 * progress;
    const healthCoveragePct = Math.max(20, Math.min(98, Math.round(baseHealth - popStrain + healthCapexGain)));

    // Composite Natural Hazard Risk (/100) (climate heat/drought worsens wildfire/flood volatility; mitigation reduces exposure)
    const climateHazardDrift = horizon * (drivers.tempIncreaseC * 2.2 + Math.max(0, -drivers.climateRainChangePct) * 0.55);
    const hazardReduction = ((drivers.hazardMitigationStrictness - 30) / 100) * 24 * progress + ((drivers.urbanZoningStrictness - 40) / 100) * 8 * progress;
    const hazardRiskScore = Math.max(4, Math.min(98, Math.round(baseHazard + climateHazardDrift - hazardReduction)));

    // Multimodal Transport & Rail Score (/100)
    const railGain = ((drivers.transportRailExpansionPct - 25) / 100) * (railLinked ? 14 : 24) * progress;
    const transportConnectivityScore = Math.max(22, Math.min(98, Math.round(baseTransport + railGain)));

    // Industry Capacity Index (Base 100) - benefits from transport & rail lift
    const indWaterPenalty = projectedDeficit < -20 ? Math.abs(projectedDeficit + 20) * 0.8 : 0;
    const transportIndBoost = (transportConnectivityScore - baseTransport) * 0.35;
    const industryCapacity = Math.max(30, Math.min(160, Math.round(w.industry * 1.1 + horizon * 1.4 - indWaterPenalty + transportIndBoost)));

    impacts[yr] = {
      year: yr,
      waterDeficit: projectedDeficit,
      droughtRiskPct: droughtRisk,
      urbanGrowthPct,
      agriculturalOutputIndex: agriOutput,
      industrialCapacityIndex: industryCapacity,
      healthCoveragePct,
      hazardRiskScore,
      transportConnectivityScore
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
      name: 'Optimistic Scenario (Green Acceleration, Health & Rail Modernization)',
      nameAr: 'السيناريو المتفائل (الاستدامة المائية، التغطية الصحية وربط السكك)',
      description: 'Rapid desalination & drip irrigation (85%), universal hospital/CHU access, strict seismic & wildfire mitigation, and SNTF high-capacity rail corridors.',
      descriptionAr: 'دخول محطات التحلية والسقي الموضعي (85%)، تعميم الأقطاب الاستشفائية، تعزيز الوقاية الزلزالية والحرائق، وتوسيع خطوط السكك الحديدية.',
      assumptions: [
        `Desalination capacity expands +${optDrivers.desalinationCapexMillionM3}M m³/yr & drip irrigation reaches ${optDrivers.irrigationEfficiencyPct}%`,
        `Hospital & CHU modernization capex reaches ${optDrivers.healthInfraInvestmentPct}/100`,
        `Seismic, flood & wildfire mitigation reaches ${optDrivers.hazardMitigationStrictness}/100 enforcement`,
        `SNTF national rail & highway corridor investment reaches ${optDrivers.transportRailExpansionPct}/100`
      ],
      assumptionsAr: [
        `توسيع التحلية (+${optDrivers.desalinationCapexMillionM3} مليون م³) وبلوغ السقي الموضعي ${optDrivers.irrigationEfficiencyPct}%`,
        `رفع الاستثمار الصحي والمستشفيات إلى مستوى ${optDrivers.healthInfraInvestmentPct}/100 لتغطية النمو السكاني`,
        `تفعيل حزام الوقاية من الأخطار الطبيعية والزلازل والحرائق بصرامة ${optDrivers.hazardMitigationStrictness}/100`,
        `توسيع شبكة السكك الحديدية والنقل متعدد الوسائط إلى مؤشر ${optDrivers.transportRailExpansionPct}/100`
      ],
      impacts: simulateWilayaScenario(w, optDrivers)
    },
    {
      id: 'baseline',
      name: 'Baseline Scenario (Organic Continuity / Status Quo)',
      nameAr: 'السيناريو المرجعي (استمرار الاتجاهات الحالية)',
      description: 'Moderate progress on hydraulic transfers, hospitals, hazard zoning, and transport corridors alongside standard demographic growth.',
      descriptionAr: 'استمرار وتيرة المشاريع الحالية في المياه والصحة والنقل دون طفرات هيكلية، مع نمو ديمغرافي منتظم وتراجع مطري تدريجي.',
      assumptions: [
        `Hydraulic investments (+${baseDrivers.desalinationCapexMillionM3}M m³) & rainfall drift (${baseRainSign}/yr)`,
        `Health infrastructure investment pace at ${baseDrivers.healthInfraInvestmentPct}/100`,
        `Natural hazard preparedness & zoning strictness at ${baseDrivers.hazardMitigationStrictness}/100`,
        `Rail & multimodal logistics rollout pace at ${baseDrivers.transportRailExpansionPct}/100`
      ],
      assumptionsAr: [
        `تنفيذ التحويلات (+${baseDrivers.desalinationCapexMillionM3} مليون م³) مع تغيّر التساقط (${baseRainSign}/سنة)`,
        `وتيرة إنجاز المرافق الصحية والاستشفائية عند مستوى ${baseDrivers.healthInfraInvestmentPct}/100`,
        `جاهزية الوقاية من الأخطار الطبيعية عند ${baseDrivers.hazardMitigationStrictness}/100 وصرامة التعمير ${baseDrivers.urbanZoningStrictness}/100`,
        `تقدم مشاريع النقل والربط بالسكك الحديدية بمعدل ${baseDrivers.transportRailExpansionPct}/100`
      ],
      impacts: simulateWilayaScenario(w, baseDrivers)
    },
    {
      id: 'pessimistic',
      name: 'Pessimistic Scenario (Severe Climate Stress & Infrastructure Strain)',
      nameAr: 'السيناريو المتشائم (تفاقم الإجهاد المناخي والضغط على الخدمات)',
      description: 'Consecutive droughts, stalled hospital & rail capex, heightened wildfire/flood risk, and unmanaged urban sprawl into hazard zones.',
      descriptionAr: 'موجات جفاف وحرائق غابات، تباطؤ مشاريع الصحة والسكك الحديدية، وارتفاع كلفة التوسع العمراني في النطاقات الخطرة.',
      assumptions: [
        `Severe drying (${pessDrivers.climateRainChangePct}%/yr) & unmetered groundwater extraction`,
        `Hospital capacity lags rapid demographic growth (+${pessDrivers.popGrowthRatePct}%/yr)`,
        'Delayed seismic/wildfire prevention & peri-urban sprawl in flood beds',
        'Freight & regional rail bottlenecks constrain interior industrial growth'
      ],
      assumptionsAr: [
        `موجات جفاف حادة (${pessDrivers.climateRainChangePct}% سنوياً) وضخ جوفي عشوائي`,
        `تأخر توسيع الهياكل الصحية عن وتيرة النمو السكاني (+${pessDrivers.popGrowthRatePct}% سنوياً)`,
        'ضعف الوقاية من حرائق الغابات والفيضانات والبناء العشوائي في مناطق الخطر',
        'تباطؤ ربط السكك الحديدية والنقل اللوجستي بما يعيق الأقطاب الداخلية'
      ],
      impacts: simulateWilayaScenario(w, pessDrivers)
    }
  ];

  return pathways;
}
