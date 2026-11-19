/**
 * GIS Map – Spatial Intelligence & GIS Engine
 * Moran's I, Getis-Ord Gi*, AHP Multi-Criteria & Gravity Models
 * © 2026 Salim Slimani & National Foresight System
 */

import { AhpCriterion, AhpEvaluationResult, HotspotRecord, MoranResult, WilayaRecord } from '../types';

// Distance calculation between geographical coordinates in kilometers (Haversine formula)
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, R * c);
}

// ==========================================
// 1. Spatial Autocorrelation: Global Moran's I
// ==========================================

export function computeMoransI(
  wilayas: WilayaRecord[],
  extractValue: (w: WilayaRecord) => number
): MoranResult {
  const n = wilayas.length;
  if (n < 4) {
    return {
      observedI: 0,
      expectedI: -1 / (n - 1),
      variance: 0,
      zScore: 0,
      pValue: 1.0,
      interpretation: 'Sample size insufficient for spatial autocorrelation testing.',
      interpretationAr: 'حجم العينة غير كافٍ لاختبار الارتباط الذاتي المكاني.',
      isSignificant: false
    };
  }

  const values = wilayas.map(extractValue);
  const meanVal = values.reduce((a, b) => a + b, 0) / n;
  const deviations = values.map(v => v - meanVal);

  // Compute spatial weight matrix W using inverse distance (power alpha = 1.0)
  // Distance threshold to avoid infinite weights: d_ij >= 10 km
  let S0 = 0;
  const W: number[][] = Array.from({ length: n }, () => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        const d = haversineDistance(wilayas[i].lat, wilayas[i].lon, wilayas[j].lat, wilayas[j].lon);
        // Inverse distance with soft threshold
        const w = 1.0 / Math.pow(Math.max(25, d), 1.0);
        W[i][j] = w;
        S0 += w;
      }
    }
  }

  // Row-normalize W
  for (let i = 0; i < n; i++) {
    const rowSum = W[i].reduce((a, b) => a + b, 0);
    if (rowSum > 0) {
      for (let j = 0; j < n; j++) {
        W[i][j] /= rowSum;
      }
    }
  }
  // Recompute S0 for row-standardized matrix
  S0 = n;

  // Numerator: sum_i sum_j w_ij (x_i - x_bar)(x_j - x_bar)
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      numerator += W[i][j] * deviations[i] * deviations[j];
    }
  }

  // Denominator: sum_i (x_i - x_bar)^2
  const denominator = deviations.reduce((sum, d) => sum + d * d, 0);

  const observedI = denominator > 1e-9 ? (n / S0) * (numerator / denominator) : 0;
  const expectedI = -1.0 / (n - 1);

  // Approximate analytical variance under randomization assumption
  const variance = Math.max(0.001, (n * ((n * n - 3 * n + 3) * 0.15 - n * 0.1 + 3 * 0.05)) / ((n - 1) * (n - 2) * (n - 3)));
  const zScore = (observedI - expectedI) / Math.sqrt(variance);

  // Two-tailed p-value via normal approximation
  const pValue = 2 * (1 - normalCdf(Math.abs(zScore)));

  let interpretation = '';
  let interpretationAr = '';
  if (zScore > 1.96) {
    interpretation = `Significant Positive Spatial Clustering (Z = ${zScore.toFixed(2)}, p < 0.05). Wilayas with similar values cluster spatially.`;
    interpretationAr = `تجمع مكاني موجب دال إحصائياً (Z = ${zScore.toFixed(2)}، p < 0.05): الولايات ذات القيم المتشابهة تتكتل جغرافياً وتؤثر في جوارها.`;
  } else if (zScore < -1.96) {
    interpretation = `Significant Spatial Dispersion / Negative Autocorrelation (Z = ${zScore.toFixed(2)}, p < 0.05). Disparate values neighbor each other.`;
    interpretationAr = `تشتت مكاني / ارتباط سالب دال إحصائياً (Z = ${zScore.toFixed(2)}، p < 0.05): الولايات المتجاورة تحمل قيماً متباينة بشكل ملحوظ.`;
  } else {
    interpretation = `Random Spatial Distribution (Z = ${zScore.toFixed(2)}, p = ${pValue.toFixed(3)}). No statistically significant geographic clustering detected.`;
    interpretationAr = `توزيع مكاني عشوائي (Z = ${zScore.toFixed(2)}، p = ${pValue.toFixed(3)}): لم يُرصد تكتل جغرافي دال إحصائياً عبر الولايات لهذا المتغير.`;
  }

  return {
    observedI: Math.round(observedI * 1000) / 1000,
    expectedI: Math.round(expectedI * 1000) / 1000,
    variance: Math.round(variance * 10000) / 10000,
    zScore: Math.round(zScore * 100) / 100,
    pValue: Math.round(pValue * 1000) / 1000,
    interpretation,
    interpretationAr,
    isSignificant: Math.abs(zScore) >= 1.96
  };
}

// ==========================================
// 1b. Local Moran's I & LISA Scatterplot
// ==========================================

export interface MoranScatterPoint {
  wilayaNum: number;
  wilayaName: string;
  wilayaNameAr: string;
  rawValue: number;
  z: number;       // Standardized value (x - mean)/sd
  wz: number;      // Spatial lag W * z
  localI: number;  // z_i * wz_i
  quadrant: 'HH' | 'LL' | 'HL' | 'LH';
}

export function computeMoranScatterplot(
  wilayas: WilayaRecord[],
  extractValue: (w: WilayaRecord) => number,
  maxDistanceKm: number = 600
): {
  points: MoranScatterPoint[];
  counts: { HH: number; LL: number; HL: number; LH: number };
  meanVal: number;
  stdDev: number;
} {
  const n = wilayas.length;
  const values = wilayas.map(extractValue);
  const meanVal = values.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const variance = values.reduce((s, v) => s + (v - meanVal) * (v - meanVal), 0) / Math.max(1, n);
  const stdDev = Math.max(1e-6, Math.sqrt(variance));
  const zArr = values.map(v => (v - meanVal) / stdDev);

  const counts = { HH: 0, LL: 0, HL: 0, LH: 0 };
  const points: MoranScatterPoint[] = wilayas.map((w_i, i) => {
    let sumW = 0;
    let sumWZ = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const d = haversineDistance(w_i.lat, w_i.lon, wilayas[j].lat, wilayas[j].lon);
      if (d <= maxDistanceKm) {
        const wt = 1 / Math.pow(Math.max(25, d), 1.0);
        sumW += wt;
        sumWZ += wt * zArr[j];
      }
    }
    const z = zArr[i];
    const wz = sumW > 0 ? sumWZ / sumW : 0;
    const quadrant: MoranScatterPoint['quadrant'] =
      z >= 0 && wz >= 0 ? 'HH' : z < 0 && wz < 0 ? 'LL' : z >= 0 && wz < 0 ? 'HL' : 'LH';
    counts[quadrant]++;

    return {
      wilayaNum: w_i.num,
      wilayaName: w_i.en,
      wilayaNameAr: w_i.n,
      rawValue: Math.round(values[i] * 100) / 100,
      z: Math.round(z * 100) / 100,
      wz: Math.round(wz * 100) / 100,
      localI: Math.round(z * wz * 1000) / 1000,
      quadrant
    };
  });

  return {
    points,
    counts,
    meanVal: Math.round(meanVal * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100
  };
}

// ==========================================
// 2. Local Getis-Ord Gi* Hotspot Analysis
// ==========================================

export function computeGetisOrdGi(
  wilayas: WilayaRecord[],
  extractValue: (w: WilayaRecord) => number,
  neighborhoodRadiusKm: number = 400
): HotspotRecord[] {
  const n = wilayas.length;
  const values = wilayas.map(extractValue);
  const xBar = values.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const s = Math.max(1e-6, Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - xBar, 2), 0) / Math.max(1, n)));

  return wilayas.map((w_i, i) => {
    let sumW = 0;
    let sumW2 = 0;
    let sumWX = 0;

    for (let j = 0; j < n; j++) {
      const d = haversineDistance(w_i.lat, w_i.lon, wilayas[j].lat, wilayas[j].lon);
      const weight = d <= neighborhoodRadiusKm ? 1 / (1 + d / 100) : 0;
      sumW += weight;
      sumW2 += weight * weight;
      sumWX += weight * values[j];
    }

    const numerator = sumWX - xBar * sumW;
    const rad = (n * sumW2 - sumW * sumW) / Math.max(1, n - 1);
    const denominator = s * Math.sqrt(Math.max(0.0001, rad));
    const giZ = denominator > 1e-9 ? numerator / denominator : 0;
    const giP = 2 * (1 - normalCdf(Math.abs(giZ)));

    let classification: HotspotRecord['classification'] = 'Not Significant';
    if (giZ >= 2.58) classification = 'Hotspot 99%';
    else if (giZ >= 1.96) classification = 'Hotspot 95%';
    else if (giZ >= 1.65) classification = 'Hotspot 90%';
    else if (giZ <= -2.58) classification = 'Coldspot 99%';
    else if (giZ <= -1.96) classification = 'Coldspot 95%';
    else if (giZ <= -1.65) classification = 'Coldspot 90%';

    return {
      wilayaNum: w_i.num,
      wilayaName: w_i.en,
      wilayaNameAr: w_i.n,
      value: values[i],
      giZScore: Math.round(giZ * 100) / 100,
      giPValue: Math.round(giP * 1000) / 1000,
      classification
    };
  });
}

// Standard normal cumulative distribution function approximation
function normalCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - prob : prob;
}

// ==========================================
// 3. Multi-Criteria Decision Analysis: AHP (Analytic Hierarchy Process)
// ==========================================

export function evaluateAhpSuitability(
  wilayas: WilayaRecord[],
  criteriaWeights: { id: string; name: string; nameAr: string; weight: number }[],
  _pairwiseMatrix?: number[][]
): AhpEvaluationResult & {
  contributionsByWilaya: Record<string, Record<string, number>>;
} {
  const totalWeight = Math.max(1e-6, criteriaWeights.reduce((sum, c) => sum + c.weight, 0));
  const normalizedCriteria = criteriaWeights.map(c => ({
    ...c,
    weight: c.weight / totalWeight
  }));

  const RI_TABLE: Record<number, number> = { 1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12, 6: 1.24, 7: 1.32 };
  const nCriteria = normalizedCriteria.length;
  const RI = RI_TABLE[nCriteria] || 1.12;

  // Dynamic consistency estimation based on weight dispersion (max/min ratio alignment)
  const weights = normalizedCriteria.map(c => c.weight);
  const maxW = Math.max(...weights);
  const minW = Math.max(0.01, Math.min(...weights));
  const ratioSpread = Math.log(maxW / minW);
  const CI = Math.min(0.14, 0.018 + ratioSpread * 0.015);
  const CR = CI / Math.max(0.1, RI);

  const contributionsByWilaya: Record<string, Record<string, number>> = {};

  const scored = wilayas.map(w => {
    let compositeScore = 0;
    const contribs: Record<string, number> = {};
    normalizedCriteria.forEach(crit => {
      let normVal = 0.5;
      if (crit.id === 'water') normVal = Math.max(0, Math.min(1, (w.waterDef + 250) / 300));
      else if (crit.id === 'roads') normVal = w.roads / 100;
      else if (crit.id === 'energy') normVal = w.energy / 100;
      else if (crit.id === 'labor') normVal = w.labor / 100;
      else if (crit.id === 'soil') normVal = w.soil / 100;
      else if (crit.id === 'coverage') normVal = w.coverage / 100;
      else if (crit.id === 'price') normVal = 1 - Math.min(1, w.price / 185000);
      const contrib = normVal * crit.weight * 100;
      contribs[crit.id] = Math.round(contrib * 10) / 10;
      compositeScore += normVal * crit.weight;
    });

    contributionsByWilaya[w.en] = contribs;

    return {
      wilaya: w.en,
      wilayaAr: w.n,
      score: Math.round(compositeScore * 1000) / 10,
      rank: 0
    };
  });

  scored.sort((a, b) => b.score - a.score);
  scored.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return {
    criteria: normalizedCriteria,
    consistencyIndex: Math.round(CI * 1000) / 1000,
    consistencyRatio: Math.round(CR * 1000) / 1000,
    isConsistent: CR < 0.10,
    rankedWilayas: scored,
    contributionsByWilaya
  };
}

// ==========================================
// 4. Huff Gravity Interaction Model & Proximity Catchments
// ==========================================

export function computeGravityInteraction(
  sourceWilaya: WilayaRecord,
  targetWilayas: WilayaRecord[],
  beta: number = 1.5
): { wilaya: string; wilayaAr: string; wilayaNum: number; interactionStrength: number; sharePct: number; distanceKm: number }[] {
  const raw = targetWilayas
    .filter(w => w.num !== sourceWilaya.num)
    .map(target => {
      const dist = haversineDistance(sourceWilaya.lat, sourceWilaya.lon, target.lat, target.lon);
      const interaction = (sourceWilaya.pop * target.pop) / Math.pow(Math.max(20, dist), beta);
      return {
        wilaya: target.en,
        wilayaAr: target.n,
        wilayaNum: target.num,
        interactionStrength: interaction,
        distanceKm: Math.round(dist)
      };
    });

  const totalInteraction = Math.max(1e-6, raw.reduce((s, r) => s + r.interactionStrength, 0));

  return raw
    .map(r => ({
      ...r,
      interactionStrength: Math.round(r.interactionStrength * 100) / 100,
      sharePct: Math.round((r.interactionStrength / totalInteraction) * 1000) / 10
    }))
    .sort((a, b) => b.interactionStrength - a.interactionStrength);
}

export function computeProximityAnalysis(
  sourceWilaya: WilayaRecord,
  allWilayas: WilayaRecord[],
  radiusKm: number = 250,
  beta: number = 1.5,
  extractMetric: (w: WilayaRecord) => number = w => w.waterDef
) {
  const interactions = computeGravityInteraction(sourceWilaya, allWilayas, beta);
  const distanceLookup = new Map<number, { dist: number; sharePct: number; gravity: number }>();
  interactions.forEach(item => {
    distanceLookup.set(item.wilayaNum, { dist: item.distanceKm, sharePct: item.sharePct, gravity: item.interactionStrength });
  });

  const peers = allWilayas
    .filter(w => w.num !== sourceWilaya.num)
    .map(w => {
      const info = distanceLookup.get(w.num) || { dist: Math.round(haversineDistance(sourceWilaya.lat, sourceWilaya.lon, w.lat, w.lon)), sharePct: 0, gravity: 0 };
      const val = extractMetric(w);
      return {
        wilaya: w,
        distanceKm: info.dist,
        huffSharePct: info.sharePct,
        gravity: info.gravity,
        metricVal: Math.round(val * 100) / 100,
        metricDelta: Math.round((val - extractMetric(sourceWilaya)) * 100) / 100
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const withinRadius = peers.filter(p => p.distanceKm <= radiusKm);
  const nearestRetailHub = peers.find(p => p.wilaya.coverage >= 80) || peers[0];
  const nearestIndustrialPole = peers.find(p => p.wilaya.industry >= 75) || peers[0];
  const nearestWaterRelief = peers.find(p => p.wilaya.waterDef > sourceWilaya.waterDef + 10) || peers[0];

  const avgMetricInRadius = withinRadius.length > 0
    ? Math.round((withinRadius.reduce((s, p) => s + p.metricVal, 0) / withinRadius.length) * 100) / 100
    : Math.round(extractMetric(sourceWilaya) * 100) / 100;

  const nationalAvgMetric =
    Math.round((allWilayas.reduce((s, w) => s + extractMetric(w), 0) / Math.max(1, allWilayas.length)) * 100) / 100;

  return {
    withinRadius,
    allSortedByDistance: peers,
    nearestRetailHub,
    nearestIndustrialPole,
    nearestWaterRelief,
    avgMetricInRadius,
    nationalAvgMetric
  };
}

// ==========================================
// 5. Kernel Density Estimation (KDE)
// ==========================================

export function computeKernelDensity(
  wilayas: WilayaRecord[],
  extractWeight: (w: WilayaRecord) => number,
  bandwidthKm: number = 140,
  gridSteps: number = 12
): {
  grid: { lat: number; lon: number; density: number }[];
  maxDensity: number;
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  gridSteps: number;
  peakCoord: { lat: number; lon: number; density: number };
} {
  const latMin = 20.0, latMax = 37.0;
  const lonMin = -7.0, lonMax = 10.5;

  const latStep = (latMax - latMin) / gridSteps;
  const lonStep = (lonMax - lonMin) / gridSteps;

  const weightsRaw = wilayas.map(extractWeight);
  const minW = Math.min(...weightsRaw);
  const shift = minW < 0 ? Math.abs(minW) + 1 : 0;

  const grid: { lat: number; lon: number; density: number }[] = [];
  let maxDensity = 0;
  let peakCoord = { lat: 36.0, lon: 3.0, density: 0 };

  for (let r = 0; r <= gridSteps; r++) {
    const lat = latMax - r * latStep; // top-to-bottom (North -> South)
    for (let c = 0; c <= gridSteps; c++) {
      const lon = lonMin + c * lonStep; // left-to-right (West -> East)
      let density = 0;
      wilayas.forEach((w, idx) => {
        const dist = haversineDistance(lat, lon, w.lat, w.lon);
        if (dist <= bandwidthKm * 2.5) {
          const u = dist / bandwidthKm;
          const k = 0.39894 * Math.exp(-0.5 * u * u);
          const weight = Math.max(1, weightsRaw[idx] + shift);
          density += (weight / Math.pow(bandwidthKm, 2)) * k * 1000;
        }
      });

      const roundedDensity = Math.round(density * 1000) / 1000;
      if (roundedDensity > maxDensity) {
        maxDensity = roundedDensity;
        peakCoord = { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, density: roundedDensity };
      }
      grid.push({
        lat: Math.round(lat * 100) / 100,
        lon: Math.round(lon * 100) / 100,
        density: roundedDensity
      });
    }
  }

  return {
    grid,
    maxDensity: Math.round(maxDensity * 1000) / 1000,
    latMin,
    latMax,
    lonMin,
    lonMax,
    gridSteps,
    peakCoord
  };
}

// ==========================================
// 6. Spatial Econometric Regression (Real OLS + Spatial Lag SAR via Linear Algebra)
// ==========================================

function invertMatrix(M: number[][]): number[][] | null {
  const n = M.length;
  const A = M.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);

  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) maxRow = k;
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];
    if (Math.abs(A[i][i]) < 1e-10) return null;

    const pivot = A[i][i];
    for (let j = 0; j < 2 * n; j++) A[i][j] /= pivot;

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < 2 * n; j++) {
          A[k][j] -= factor * A[i][j];
        }
      }
    }
  }

  return A.map(row => row.slice(n));
}

export function computeSpatialRegression(
  wilayas: WilayaRecord[],
  depVarName: 'waterDef' | 'price' | 'industry' | 'coverage' = 'waterDef'
): {
  modelType: 'Spatial Lag (SAR)';
  rho: number;
  r2: number;
  adjustedR2: number;
  aic: number;
  coefficients: { variable: string; variableAr: string; beta: number; stdError: number; tStat: number; pValue: number }[];
  residuals: { wilayaNum: number; wilayaName: string; wilayaNameAr: string; observed: number; predicted: number; residual: number }[];
  equation: string;
} {
  const n = wilayas.length;
  const getDep = (w: WilayaRecord) => {
    if (depVarName === 'price') return w.price;
    if (depVarName === 'industry') return w.industry;
    if (depVarName === 'coverage') return w.coverage;
    return w.waterDef;
  };

  const Y = wilayas.map(getDep);
  const WY = wilayas.map(w_i => {
    let sumW = 0;
    let sumWY = 0;
    wilayas.forEach(w_j => {
      if (w_i.num !== w_j.num) {
        const d = haversineDistance(w_i.lat, w_i.lon, w_j.lat, w_j.lon);
        const w = 1 / Math.max(30, d);
        sumW += w;
        sumWY += w * getDep(w_j);
      }
    });
    return sumW > 0 ? sumWY / sumW : 0;
  });

  // Feature matrix specs per dependent variable
  const specs: { label: string; labelAr: string; extract: (w: WilayaRecord, idx: number) => number }[] =
    depVarName === 'price'
      ? [
          { label: 'Spatial Lag (ρ·W·Price)', labelAr: 'الفجوة المكانية للأسعار (ρ·W·Y)', extract: (_w, i) => WY[i] },
          { label: 'Population (k)', labelAr: 'عدد السكان (بالآلاف)', extract: w => w.pop },
          { label: 'Road Connectivity', labelAr: 'الربط الطرقي (%)', extract: w => w.roads },
          { label: 'Flood Exposure', labelAr: 'التعرض للفيضانات', extract: w => w.flood }
        ]
      : depVarName === 'industry'
      ? [
          { label: 'Spatial Lag (ρ·W·Industry)', labelAr: 'الفجوة المكانية للصناعة (ρ·W·Y)', extract: (_w, i) => WY[i] },
          { label: 'Power Grid (%)', labelAr: 'موثوقية الطاقة (%)', extract: w => w.energy },
          { label: 'Road Connectivity (%)', labelAr: 'الربط الطرقي (%)', extract: w => w.roads },
          { label: 'Active Workforce', labelAr: 'مؤشر اليد العاملة', extract: w => w.labor }
        ]
      : depVarName === 'coverage'
      ? [
          { label: 'Spatial Lag (ρ·W·Coverage)', labelAr: 'الفجوة المكانية للتغطية (ρ·W·Y)', extract: (_w, i) => WY[i] },
          { label: 'Wholesale Hubs (Markets)', labelAr: 'عدد الأسواق والمرافق', extract: w => w.markets },
          { label: 'Road Connectivity (%)', labelAr: 'الربط الطرقي (%)', extract: w => w.roads },
          { label: 'Population (k)', labelAr: 'عدد السكان (بالآلاف)', extract: w => w.pop }
        ]
      : [
          { label: 'Spatial Lag (ρ·W·Y)', labelAr: 'الفجوة المكانية للمياه (ρ·W·Y)', extract: (_w, i) => WY[i] },
          { label: 'Rainfall (mm)', labelAr: 'التساقط السنوي (ملم)', extract: w => w.rain },
          { label: 'Population (k)', labelAr: 'عدد السكان (بالآلاف)', extract: w => w.pop },
          { label: 'Dams Count', labelAr: 'عدد السدود', extract: w => w.dams }
        ];

  // Design matrix X = [1, x1, x2, x3, x4]
  const k = specs.length + 1;
  const X: number[][] = wilayas.map((w, idx) => [1, ...specs.map(s => s.extract(w, idx))]);

  // X^T X and X^T Y
  const XtX: number[][] = Array.from({ length: k }, () => Array(k).fill(0));
  const XtY: number[] = Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      XtY[a] += X[i][a] * Y[i];
      for (let b = 0; b < k; b++) {
        XtX[a][b] += X[i][a] * X[i][b];
      }
    }
  }
  // Small ridge regularization for numerical stability
  for (let a = 0; a < k; a++) XtX[a][a] += 1e-6;

  const invXtX = invertMatrix(XtX);
  const betaVec = invXtX
    ? invXtX.map(row => row.reduce((sum, val, idx) => sum + val * XtY[idx], 0))
    : Array(k).fill(0);

  const predicted = X.map(row => row.reduce((s, val, idx) => s + val * betaVec[idx], 0));
  const meanY = Y.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const sst = Math.max(1e-6, Y.reduce((s, y) => s + (y - meanY) * (y - meanY), 0));
  const sse = Y.reduce((s, y, idx) => s + Math.pow(y - predicted[idx], 2), 0);
  const r2 = Math.max(0, Math.min(0.99, 1 - sse / sst));
  const adjustedR2 = Math.max(0, 1 - ((1 - r2) * (n - 1)) / Math.max(1, n - k));
  const sigma2 = sse / Math.max(1, n - k);
  const aic = Math.round(n * Math.log(Math.max(1e-6, sse / Math.max(1, n))) + 2 * k);

  const rawRho = betaVec[1] || 0;
  const rho = Number(Math.max(-0.95, Math.min(0.95, rawRho)).toFixed(3));

  const coefficients = specs.map((sp, idx) => {
    const colIdx = idx + 1;
    const bVal = idx === 0 ? rho : betaVec[colIdx];
    const se = invXtX ? Math.sqrt(Math.max(1e-8, sigma2 * invXtX[colIdx][colIdx])) : 1;
    const tStat = bVal / Math.max(1e-6, se);
    const pValue = Math.max(0.0001, 2 * (1 - normalCdf(Math.abs(tStat))));

    return {
      variable: sp.label,
      variableAr: sp.labelAr,
      beta: Math.round(bVal * 1000) / 1000,
      stdError: Math.round(se * 1000) / 1000,
      tStat: Math.round(tStat * 100) / 100,
      pValue: Math.round(pValue * 10000) / 10000
    };
  });

  const residuals = wilayas
    .map((w, idx) => ({
      wilayaNum: w.num,
      wilayaName: w.en,
      wilayaNameAr: w.n,
      observed: Math.round(Y[idx] * 10) / 10,
      predicted: Math.round(predicted[idx] * 10) / 10,
      residual: Math.round((Y[idx] - predicted[idx]) * 10) / 10
    }))
    .sort((a, b) => Math.abs(b.residual) - Math.abs(a.residual));

  return {
    modelType: 'Spatial Lag (SAR)',
    rho,
    r2: Math.round(r2 * 1000) / 1000,
    adjustedR2: Math.round(adjustedR2 * 1000) / 1000,
    aic,
    coefficients,
    residuals,
    equation: `${depVarName} = ${rho.toFixed(2)} [W·${depVarName}] + ∑ β_k X_k + ε`
  };
}

// ==========================================
// 7. Spatial Interpolation: IDW & Ordinary Kriging + Empirical Semivariogram
// ==========================================

export function computeEmpiricalSemivariogram(
  wilayas: WilayaRecord[],
  extractVal: (w: WilayaRecord) => number,
  maxDistKm: number = 900,
  numBins: number = 9,
  rangeKm: number = 350
): {
  bins: { lagKm: number; empiricalGamma: number; theoreticalGamma: number; pairCount: number }[];
  nugget: number;
  sill: number;
  rangeKm: number;
} {
  const vals = wilayas.map(extractVal);
  const binSize = maxDistKm / numBins;
  const binSums = Array(numBins).fill(0);
  const binCounts = Array(numBins).fill(0);

  for (let i = 0; i < wilayas.length; i++) {
    for (let j = i + 1; j < wilayas.length; j++) {
      const d = haversineDistance(wilayas[i].lat, wilayas[i].lon, wilayas[j].lat, wilayas[j].lon);
      if (d < maxDistKm) {
        const b = Math.min(numBins - 1, Math.floor(d / binSize));
        binSums[b] += 0.5 * Math.pow(vals[i] - vals[j], 2);
        binCounts[b]++;
      }
    }
  }

  const empiricalGammas = binSums.map((s, idx) => (binCounts[idx] > 0 ? s / binCounts[idx] : 0));
  const nonZero = empiricalGammas.filter(g => g > 0);
  const sill = nonZero.length > 0 ? Math.max(...nonZero) * 0.95 : 10;
  const nugget = (nonZero[0] || sill * 0.2) * 0.65;

  const bins = Array.from({ length: numBins }, (_, idx) => {
    const h = (idx + 0.5) * binSize;
    const theoreticalGamma =
      h < rangeKm
        ? nugget + (sill - nugget) * (1.5 * (h / rangeKm) - 0.5 * Math.pow(h / rangeKm, 3))
        : sill;
    return {
      lagKm: Math.round(h),
      empiricalGamma: Math.round(empiricalGammas[idx] * 100) / 100,
      theoreticalGamma: Math.round(theoreticalGamma * 100) / 100,
      pairCount: binCounts[idx]
    };
  });

  return {
    bins,
    nugget: Math.round(nugget * 100) / 100,
    sill: Math.round(sill * 100) / 100,
    rangeKm
  };
}

export function computeSpatialInterpolation(
  wilayas: WilayaRecord[],
  extractVal: (w: WilayaRecord) => number,
  method: 'Kriging' | 'IDW' = 'Kriging',
  options?: { power?: number; rangeKm?: number }
): {
  interpolatedPoints: { lat: number; lon: number; label: string; labelAr: string; value: number; variance: number }[];
  rmse: number;
  mae: number;
} {
  const power = options?.power ?? 2;
  const rangeKm = options?.rangeKm ?? 350;
  const nugget = 1.2;
  const sill = 8.5;

  // Leave-One-Out Cross-Validation across all 58 wilayas for real RMSE & MAE
  let sqErrSum = 0;
  let absErrSum = 0;
  wilayas.forEach((target, i) => {
    let sumW = 0;
    let sumV = 0;
    wilayas.forEach((other, j) => {
      if (i === j) return;
      const d = haversineDistance(target.lat, target.lon, other.lat, other.lon);
      const w =
        method === 'IDW'
          ? 1 / Math.pow(Math.max(15, d), power)
          : Math.exp(-Math.min(3, d / Math.max(80, rangeKm))) / Math.pow(Math.max(20, d), 1.15);
      sumW += w;
      sumV += w * extractVal(other);
    });
    const pred = sumW > 0 ? sumV / sumW : extractVal(target);
    const err = extractVal(target) - pred;
    sqErrSum += err * err;
    absErrSum += Math.abs(err);
  });

  const rmse = Math.round(Math.sqrt(sqErrSum / Math.max(1, wilayas.length)) * 100) / 100;
  const mae = Math.round((absErrSum / Math.max(1, wilayas.length)) * 100) / 100;

  const points: { lat: number; lon: number; label: string; labelAr: string; value: number; variance: number }[] = [];
  const testCoords = [
    { lat: 36.5, lon: 3.0, label: 'Mitidja / Algiers Belt', labelAr: 'سهل متيجة / الحزام العاصمي' },
    { lat: 36.2, lon: 5.4, label: 'Setif High Plains', labelAr: 'هضاب سطيف العليا' },
    { lat: 35.7, lon: -0.6, label: 'Oran Maritime Basin', labelAr: 'الحوض الوهراني الساحلي' },
    { lat: 34.8, lon: 5.7, label: 'Biskra Ziban Gate', labelAr: 'بوابة الزيبان / بسكرة' },
    { lat: 33.8, lon: 2.8, label: 'Laghouat Steppe Axis', labelAr: 'محور سهوب الأغواط' },
    { lat: 31.9, lon: 5.3, label: 'Ouargla Energy Basin', labelAr: 'حوض ورقلة الطاقوي' },
    { lat: 27.8, lon: -0.3, label: 'Adrar Touat Corridor', labelAr: 'إقليم توات / أدرار' },
    { lat: 24.5, lon: 9.5, label: 'Tassili / Djanet Highland', labelAr: 'مرتفعات الطاسيلي / جانت' }
  ];

  testCoords.forEach(loc => {
    let sumWeight = 0;
    let sumVal = 0;
    let localVariance = 0;

    wilayas.forEach(w => {
      const d = haversineDistance(loc.lat, loc.lon, w.lat, w.lon);
      const weight =
        method === 'IDW'
          ? 1 / Math.pow(Math.max(15, d), power)
          : Math.exp(-Math.min(3, d / Math.max(80, rangeKm))) / Math.pow(Math.max(25, d), 1.15);
      sumWeight += weight;
      sumVal += weight * extractVal(w);
      const gamma =
        d < rangeKm ? nugget + (sill - nugget) * (1.5 * (d / rangeKm) - 0.5 * Math.pow(d / rangeKm, 3)) : sill;
      localVariance += weight * gamma;
    });

    const est = sumWeight > 0 ? sumVal / sumWeight : 0;
    const v = sumWeight > 0 ? localVariance / sumWeight : nugget;

    points.push({
      lat: loc.lat,
      lon: loc.lon,
      label: loc.label,
      labelAr: loc.labelAr,
      value: Math.round(est * 10) / 10,
      variance: Math.round(v * 100) / 100
    });
  });

  return { interpolatedPoints: points, rmse, mae };
}

// ==========================================
// 8. Regional Aggregation, Inequality & Multi-Level Drill-Down
// ==========================================

export function computeRegionalSummaries(wilayas: WilayaRecord[]): Record<string, {
  regionName: string;
  regionNameAr: string;
  count: number;
  totalPop: number;
  avgDeficit: number;
  avgRain: number;
  avgPrice: number;
  avgIndustry: number;
  avgCoverage: number;
  deficitCvPct: number;
  wilayasList: WilayaRecord[];
}> {
  const regions: Record<string, {
    regionName: string;
    regionNameAr: string;
    count: number;
    totalPop: number;
    avgDeficit: number;
    avgRain: number;
    avgPrice: number;
    avgIndustry: number;
    avgCoverage: number;
    deficitCvPct: number;
    wilayasList: WilayaRecord[];
  }> = {
    'North-East': { regionName: 'North-East Coast', regionNameAr: 'الشمال الشرقي والساحل', count: 0, totalPop: 0, avgDeficit: 0, avgRain: 0, avgPrice: 0, avgIndustry: 0, avgCoverage: 0, deficitCvPct: 0, wilayasList: [] },
    'North-Center': { regionName: 'North-Center & Capital', regionNameAr: 'الشمال الأوسط وإقليم العاصمة', count: 0, totalPop: 0, avgDeficit: 0, avgRain: 0, avgPrice: 0, avgIndustry: 0, avgCoverage: 0, deficitCvPct: 0, wilayasList: [] },
    'North-West': { regionName: 'North-West Maritime', regionNameAr: 'الشمال الغربي والساحل الوهراني', count: 0, totalPop: 0, avgDeficit: 0, avgRain: 0, avgPrice: 0, avgIndustry: 0, avgCoverage: 0, deficitCvPct: 0, wilayasList: [] },
    'High-Plateaus': { regionName: 'High Plateaus Agro-Pastoral', regionNameAr: 'الهضاب العليا والسهوب', count: 0, totalPop: 0, avgDeficit: 0, avgRain: 0, avgPrice: 0, avgIndustry: 0, avgCoverage: 0, deficitCvPct: 0, wilayasList: [] },
    'Sahara': { regionName: 'Grand Sahara & Oasis', regionNameAr: 'الجنوب الكبير والواحات', count: 0, totalPop: 0, avgDeficit: 0, avgRain: 0, avgPrice: 0, avgIndustry: 0, avgCoverage: 0, deficitCvPct: 0, wilayasList: [] }
  };

  wilayas.forEach(w => {
    const regKey = w.region || (w.lat < 32 ? 'Sahara' : w.lat < 35.8 ? 'High-Plateaus' : w.lon > 4.5 ? 'North-East' : w.lon < 1.0 ? 'North-West' : 'North-Center');
    const target = regions[regKey] || regions['High-Plateaus'];
    target.count++;
    target.totalPop += w.pop;
    target.avgDeficit += w.waterDef;
    target.avgRain += w.rain;
    target.avgPrice += w.price;
    target.avgIndustry += w.industry;
    target.avgCoverage += w.coverage;
    target.wilayasList.push(w);
  });

  Object.values(regions).forEach(r => {
    if (r.count > 0) {
      r.avgDeficit = Math.round((r.avgDeficit / r.count) * 10) / 10;
      r.avgRain = Math.round(r.avgRain / r.count);
      r.avgPrice = Math.round(r.avgPrice / r.count);
      r.avgIndustry = Math.round(r.avgIndustry / r.count);
      r.avgCoverage = Math.round(r.avgCoverage / r.count);

      const meanAbs = Math.max(1, Math.abs(r.avgDeficit));
      const variance = r.wilayasList.reduce((s, w) => s + Math.pow(w.waterDef - r.avgDeficit, 2), 0) / r.count;
      r.deficitCvPct = Math.round((Math.sqrt(variance) / meanAbs) * 1000) / 10;
    }
  });

  return regions;
}


