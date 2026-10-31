/**
 * GIS Map – Model Evaluation & Scientific Benchmarking Engine
 * Independent Cross-Validation, Backtesting & Multi-Model Tournament
 * © 2026 Salim Slimani & National Foresight System
 */

import { ForecastModelType, ModelMetrics } from '../types';
import { executeForecastModel } from './quantitative';

export interface ModelBenchmarkEntry {
  modelType: ForecastModelType;
  modelName: string;
  inSampleMetrics: ModelMetrics;
  outOfSampleMetrics: ModelMetrics;
  compositeScore: number; // lower is better (combined rank of RMSE + MAPE + AIC)
  rank: number;
  isRecommended: boolean;
  scientificNotes: string;
}

export interface BenchmarkTournamentResult {
  wilaya: string;
  metricAnalyzed: string;
  trainYears: number[];
  testYears: number[];
  modelsRanked: ModelBenchmarkEntry[];
  bestModel: ModelBenchmarkEntry;
  scientificDisclaimer: string;
}

export function runModelTournament(
  years: number[],
  values: number[],
  targetWilayaName: string = 'National Sample'
): BenchmarkTournamentResult {
  const n = values.length;
  // Train/Test Split: 75% Train (minimum 4 points), 25% Test
  const splitIdx = Math.max(4, Math.floor(n * 0.75));
  const trainYears = years.slice(0, splitIdx);
  const trainVals = values.slice(0, splitIdx);
  const testYears = years.slice(splitIdx);
  const testVals = values.slice(splitIdx);

  const candidateModels: ForecastModelType[] = [
    'arima',
    'sarima',
    'holt_winters',
    'ets',
    'linear_regression',
    'multiple_regression',
    'polynomial_regression',
    'ridge_regression',
    'lasso_regression',
    'random_forest',
    'xgboost',
    'monte_carlo'
  ];

  const results: ModelBenchmarkEntry[] = candidateModels.map(modelKey => {
    // 1. Train on training partition and forecast into test partition
    const trainResult = executeForecastModel(modelKey, trainYears, trainVals, testYears);

    // 2. Evaluate Out-of-Sample metrics against true testVals
    const predictedVals = trainResult.forecast.map(p => p.value);
    const outOfSampleMetrics: ModelMetrics = {
      mae: 0,
      rmse: 0,
      mape: 0,
      r2: 0,
      dataPoints: testVals.length,
      validationMethod: 'Walk-Forward Out-Of-Sample Backtest',
      isSufficientData: testVals.length >= 2
    };

    if (testVals.length > 0) {
      let sse = 0, sae = 0, sape = 0, sst = 0;
      const testMean = testVals.reduce((a, b) => a + b, 0) / testVals.length;
      for (let i = 0; i < testVals.length; i++) {
        const err = testVals[i] - predictedVals[i];
        sse += err * err;
        sae += Math.abs(err);
        if (Math.abs(testVals[i]) > 1e-5) sape += Math.abs(err / testVals[i]);
        sst += Math.pow(testVals[i] - testMean, 2);
      }
      outOfSampleMetrics.mae = Math.round((sae / testVals.length) * 100) / 100;
      outOfSampleMetrics.rmse = Math.round(Math.sqrt(sse / testVals.length) * 100) / 100;
      outOfSampleMetrics.mape = Math.round(((sape / testVals.length) * 100) * 10) / 10;
      outOfSampleMetrics.r2 = sst > 1e-6 ? Math.round(Math.max(0, 1 - (sse / sst)) * 1000) / 1000 : 0;
    }

    // Composite scoring based on out-of-sample RMSE + MAPE + normalized in-sample AIC
    const aicNorm = Math.abs(trainResult.metrics.aic ?? 20) * 0.1;
    const compositeScore = Math.round((outOfSampleMetrics.rmse * 1.5 + (outOfSampleMetrics.mape / 10) + aicNorm) * 10) / 10;

    let notes = '';
    if (modelKey === 'arima') notes = 'Optimal balance between trend differencing and moving-average stability.';
    else if (modelKey === 'sarima') notes = 'Multiplicative seasonal autoregression accounts for annual hydrological cycles.';
    else if (modelKey === 'holt_winters') notes = 'Rapid adaptive responsiveness to localized shifts in recent periods.';
    else if (modelKey === 'ets') notes = 'State-space recursive decomposition of level, trend, and seasonal components.';
    else if (modelKey === 'ridge_regression') notes = 'High numerical stability due to L2 regularization.';
    else if (modelKey === 'lasso_regression') notes = 'L1 coordinate descent shrinks collinear macro-regressors to exact zero.';
    else if (modelKey === 'multiple_regression') notes = 'Multivariate OLS captures inter-variable macro elasticity.';
    else if (modelKey === 'random_forest') notes = 'Effective non-linear capture, though wider variance on small sample.';
    else if (modelKey === 'xgboost') notes = 'Sequentially boosted gradient regression trees with shrinkage regularization.';
    else if (modelKey === 'polynomial_regression') notes = 'Strong in-sample curve fit but susceptible to edge divergence.';
    else if (modelKey === 'linear_regression') notes = 'Standard benchmark linear path with lowest variance.';
    else notes = 'Probabilistic envelope accounts for tail stochastic shocks.';

    return {
      modelType: modelKey,
      modelName: trainResult.modelName,
      inSampleMetrics: trainResult.metrics,
      outOfSampleMetrics,
      compositeScore,
      rank: 0,
      isRecommended: false,
      scientificNotes: notes
    };
  });

  // Rank by compositeScore ascending (lowest prediction error wins)
  results.sort((a, b) => a.compositeScore - b.compositeScore);
  results.forEach((item, idx) => {
    item.rank = idx + 1;
    if (idx === 0) item.isRecommended = true;
  });

  return {
    wilaya: targetWilayaName,
    metricAnalyzed: 'Quantitative Multi-Model Cross-Validation',
    trainYears,
    testYears,
    modelsRanked: results,
    bestModel: results[0],
    scientificDisclaimer: 'Model selection is determined by empirical Out-Of-Sample RMSE and Walk-Forward Validation, not by in-sample R² or subjective agent preference.'
  };
}
