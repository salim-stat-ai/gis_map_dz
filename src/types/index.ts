/**
 * GIS Map – Geo-Intelligence & Quantitative Foresight for Algeria 2030
 * Types & Data Contracts
 * © 2026 Salim Slimani & National Foresight System
 */

export type SectorKey = 'all' | 'realestate' | 'agri' | 'water' | 'commerce' | 'industry';

export interface WilayaRecord {
  num: number;
  n: string;        // Arabic name (e.g. سطيف)
  en: string;       // English name (e.g. Setif)
  lat: number;
  lon: number;
  region?: string;
  pop: number;      // thousands
  price: number;    // DZD / m²
  flood: number;    // flood risk index 0 - 1
  soil: number;     // soil quality 0 - 100
  rain: number;     // annual precipitation mm
  ndvi: number;     // satellite vegetation index 0 - 1
  dams: number;     // registered dams
  wells: number;    // boreholes / deep wells
  waterDef: number; // deficit index (negative = deficit, positive = surplus)
  markets: number;  // wholesale and retail covered facilities
  coverage: number; // retail/distribution network coverage %
  energy: number;   // electrical grid reliability 0 - 100
  roads: number;    // road network connectivity 0 - 100
  labor: number;    // available active workforce index 0 - 100
  industry: number; // industrial suitability / activity index 0 - 100
  // Historical data for time series analysis (2018-2025)
  historicalYears?: number[];
  historicalRain?: number[];
  historicalWaterDef?: number[];
  historicalPop?: number[];
  historicalPrice?: number[];
  isCustomImport?: boolean;
}

export type ForecastModelType =
  | 'arima'
  | 'sarima'
  | 'holt_winters'
  | 'exponential_smoothing'
  | 'ets'
  | 'linear_regression'
  | 'multiple_regression'
  | 'polynomial_regression'
  | 'ridge_regression'
  | 'lasso_regression'
  | 'random_forest'
  | 'xgboost'
  | 'gradient_boosting'
  | 'var_econometric'
  | 'monte_carlo'
  | 'bayesian_forecasting';

export interface ForecastPoint {
  year: number;
  value: number;
  lower80?: number;
  upper80?: number;
  lower95?: number;
  upper95?: number;
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  adjustedR2?: number;
  aic?: number;
  bic?: number;
  dataPoints: number;
  validationMethod: string;
  isSufficientData: boolean;
  notes?: string;
}

export interface ForecastResult {
  modelType: ForecastModelType;
  modelName: string;
  wilaya: string;
  targetMetric: string;
  historicalYears: number[];
  historicalValues: number[];
  forecast: ForecastPoint[];
  metrics: ModelMetrics;
  equationDescription: string;
  parameters: Record<string, number | string | number[]>;
  scientificDisclaimer: string;
}

export interface MoranResult {
  observedI: number;
  expectedI: number;
  variance: number;
  zScore: number;
  pValue: number;
  interpretation: string;
  interpretationAr?: string;
  isSignificant: boolean;
}

export interface HotspotRecord {
  wilayaNum: number;
  wilayaName: string;
  wilayaNameAr: string;
  value: number;
  giZScore: number;
  giPValue: number;
  classification: 'Hotspot 99%' | 'Hotspot 95%' | 'Hotspot 90%' | 'Not Significant' | 'Coldspot 90%' | 'Coldspot 95%' | 'Coldspot 99%';
}

export interface AhpCriterion {
  id: string;
  name: string;
  nameAr: string;
  weight: number;
}

export interface AhpEvaluationResult {
  criteria: AhpCriterion[];
  consistencyIndex: number;
  consistencyRatio: number;
  isConsistent: boolean;
  rankedWilayas: { wilaya: string; wilayaAr: string; score: number; rank: number }[];
}

export interface ScenarioImpact {
  year: number;
  waterDeficit: number;
  droughtRiskPct: number;
  urbanGrowthPct: number;
  agriculturalOutputIndex: number;
  industrialCapacityIndex: number;
}

export interface ScenarioPathway {
  id: 'optimistic' | 'baseline' | 'pessimistic';
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  assumptions: string[];
  assumptionsAr: string[];
  impacts: Record<number, ScenarioImpact>;
}

export interface AgentProfile {
  id: string;
  name: string;
  version: string;
  icon: string;
  color: string;
  role: string;
  roleAr: string;
  specialty: string;
  specialtyAr: string;
  liveModel: string;
  primaryMathematicalTool: string;
}

export interface AgentAnalysisOutput {
  agentId: string;
  agentName: string;
  role: string;
  wilaya: string;
  targetYear: number;
  riskRating: 'CRITICAL' | 'HIGH' | 'WATCH' | 'STABLE';
  mathematicalFindings: string[];
  spatialDiagnosis: string;
  quantitativeCalculations: Record<string, number | string>;
  strategicRecommendations: string[];
  evidenceQualityScore: number; // 0 - 100
}

export interface CouncilConsensusResult {
  scope: string;
  targetYear: number;
  conveneDate: string;
  participatingAgents: string[];
  dataQualityAudit: {
    completenessPct: number;
    sampleSize: number;
    varianceCoefficient: number;
    sourceReliability: 'Official National Grade' | 'Verified Hybrid' | 'Preliminary Demo';
  };
  consensusPriorities: {
    rank: number;
    title: string;
    titleAr: string;
    supportingAgents: string[];
    weightScore: number;
    rationale: string;
  }[];
  divergencesAndTradeoffs: {
    topic: string;
    topicAr: string;
    contendingViews: { agent: string; perspective: string }[];
    rootCause: string;
  }[];
  executiveRoadmap: {
    action: string;
    actionAr: string;
    leadOwner: string;
    timeframe: 'Immediate 72h' | 'Mid-term 2027' | 'Foresight 2030';
    costBenefitRatio: string;
  }[];
}

export type GeoZoneId = 'coastal' | 'tell_basin' | 'high_plateaus' | 'oasis_north' | 'deep_sahara';

export interface ProtocolHorizons {
  shortTerm: string;
  shortTermAr: string;
  mediumTerm: string;
  mediumTermAr: string;
  longTerm: string;
  longTermAr: string;
}

export interface EarlyWarningAlert {
  id: string;
  category: 'water' | 'drought' | 'flood' | 'commerce' | 'industry' | 'anomaly';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  wilayaNum: number;
  wilayaEn: string;
  wilayaAr: string;
  geoZone?: GeoZoneId;
  geoZoneLabel?: string;
  geoZoneLabelAr?: string;
  regionalAssetNote?: string;
  regionalAssetNoteAr?: string;
  metric: string;
  currentValue: number | string;
  criticalThreshold: number | string;
  detectedAt: string;
  calculationMethod: string;
  uncertaintyMargin: string;
  suggestedAction: string;
  suggestedActionAr: string;
  protocols?: ProtocolHorizons;
}

export interface DataSourceMeta {
  id: string;
  name: string;
  nameAr: string;
  organization: string;
  frequency: string;
  coverage: string;
  lastUpdated: string;
  type: 'Real Statistics' | 'Satellite Feeds' | 'Open Geospatial' | 'Hydraulic Registry' | 'Demo / Seed';
  apiUrl?: string;
  status: 'Operational' | 'Curated' | 'Simulated';
}

// ==========================================
// Advanced Spatial & Ingestion Interfaces
// ==========================================

export interface AuditLogEntry {
  step: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'REPAIRED' | 'INFO';
  action: string;
  details: string;
}

export interface IngestionValidationReport {
  fileName: string;
  format: 'CSV' | 'Excel' | 'GeoJSON' | 'Shapefile' | 'KML' | 'SQLite' | 'Unknown';
  qualityScore: number; // 0 - 100
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  missingFieldsCount: number;
  outOfBoundsCoordsCount: number;
  duplicatesResolvedCount: number;
  imputedValuesCount: number;
  sourceAttribution: string;
  updateTimestamp: string;
  rawPreservedBytes: number;
  auditTrail: AuditLogEntry[];
  sanitizedRecords: Partial<WilayaRecord>[];
}

export interface SpatialRegressionResult {
  modelType: 'Spatial Lag (SAR)' | 'Spatial Error (SEM)' | 'Spatial OLS';
  rhoSpatialLag: number;
  lambdaSpatialError: number;
  r2: number;
  adjustedR2: number;
  aic: number;
  logLikelihood: number;
  coefficients: { variable: string; beta: number; stdError: number; tStat: number; pValue: number }[];
  equation: string;
  interpretation: string;
}

export interface KdeCell {
  lat: number;
  lon: number;
  density: number;
}

export interface KdeGridResult {
  grid: KdeCell[];
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
  maxDensity: number;
  bandwidthKm: number;
}

export interface KrigingSemivariogram {
  nugget: number;
  sill: number;
  rangeKm: number;
  model: 'Spherical' | 'Exponential' | 'Gaussian';
}

export interface SpatialInterpolationResult {
  method: 'Kriging (Ordinary)' | 'Inverse Distance Weighting (IDW)';
  semivariogram?: KrigingSemivariogram;
  powerParam?: number;
  interpolatedGrid: { lat: number; lon: number; estimatedValue: number; variance: number }[];
  crossValidationRmse: number;
}

export interface RegionSummary {
  regionId: string;
  name: string;
  nameAr: string;
  wilayaCount: number;
  totalPopulation: number;
  avgWaterDeficit: number;
  avgAnnualRainfall: number;
  avgLandPrice: number;
  criticalWilayasCount: number;
  wilayasList: WilayaRecord[];
}

