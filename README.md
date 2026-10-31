# GIS Map – Geo-Intelligence & Quantitative Foresight for Algeria (2030)
## نظام الذكاء الجغرافي والاستشراف الكمي الوطني – الجزائر 2030

[![Vercel Deployment](https://img.shields.io/badge/Vercel-gismap2.vercel.app-000000?style=for-the-badge&logo=vercel)](https://gismap2.vercel.app/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-GIS_Mapping-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![Express](https://img.shields.io/badge/Express-REST_APIs-000000?style=for-the-badge&logo=express)](https://expressjs.com/)

---

## 1. Overview & Vision | الرؤية العامة

**GIS Map – Geo-Intelligence for Algeria** is an advanced sovereign quantitative decision-support system integrating:
$$\text{National Foresight 2030} = \text{AI Agents} + \text{Spatial Econometrics (GIS)} + \text{Quantitative Algorithmic Forecasting} + \text{Multi-Criteria Decision Analysis}$$

The platform unites all **58 Algerian Wilayas** across **5 strategic national development sectors**:
1. **Housing & Urbanism (السكن والعمران)**
2. **Agriculture & Food Security (الفلاحة والأمن الغذائي)**
3. **Water Resources & Desalination (الموارد المائية وتحلية المياه)**
4. **Commercial Supply & Regulated Markets (التجارة وضبط الأسواق)**
5. **Industry & Strategic Investment (الصناعة وترقية الاستثمار)**

All quantitative outputs are derived from **deterministic mathematical algorithms and statistical regressions**—not synthetic AI hallucinations—ensuring reproducible, auditable foresight for senior executive leadership.

---

## 2. Core Architectural Pillars | الأركان المعمارية

### 2.1 Quantitative Forecasting Engine (12 Models)
- **Time Series & Exponential Smoothing**:
  - `ARIMA(p, d, q)` Box-Jenkins autoregressive integrated moving average with automated order differencing and drift estimation.
  - `SARIMA(p, d, q)×(P, D, Q)_s` Seasonal autoregression with cyclical adjustment.
  - `Holt-Winters` double exponential smoothing with additive linear trend ($L_t, T_t$).
  - `ETS(A, A, N)` state-space exponential smoothing with Gaussian residual variance.
- **Econometric Regression**:
  - `Ordinary Least Squares (OLS) Linear Regression` with $t$-statistics, $F$-statistic, $R^2$, and Adjusted $R^2$.
  - `Multiple Linear Regression` with multi-factor predictors and matrix normal equations $(X^T X)^{-1} X^T Y$.
  - `Polynomial Degree-2 Curve` modeling non-linear acceleration and inflection points.
  - `Ridge Regression` (Tikhonov $L_2$ regularization) for handling multicollinearity: $\hat{\beta} = (X^T X + \lambda I)^{-1} X^T Y$.
  - `Lasso Regression` ($L_1$ regularization via coordinate descent and soft-thresholding) for sparse feature selection: $\mathcal{S}(z, \lambda) = \text{sign}(z)\max(0, |z|-\lambda)$.
- **Machine Learning & Ensemble Methods**:
  - `Random Forest Ensemble Regressor` with $B=50$ bootstrapped decision trees and randomized split evaluation.
  - `XGBoost / Gradient Boosted Decision Trees` with sequential pseudo-residual shrinkage ($\eta = 0.1$) and split depth control.
- **Probabilistic & Stochastic Simulation**:
  - `Monte Carlo Simulation` ($N = 1,500$ stochastic iterations) with drift velocity, volatility $\sigma$, and empirical 80%/95% confidence intervals.
- **Rigorous Model Evaluation**:
  - Walk-Forward Cross-Validation (Rolling Out-Of-Sample backtesting).
  - Out-Of-Sample RMSE, MAE, MAPE, AIC, and BIC tournament ranking.

### 2.2 Advanced GIS Spatial Engine
- **Spatial Autocorrelation**: Global **Moran's I** statistic with distance inverse-weight matrix $W_{ij} = \frac{1}{d_{ij}^\alpha}$ and standardized $Z$-score test against spatial randomness.
- **Hotspot Analysis**: **Getis-Ord $G_i^*$** local spatial clustering identifying statistically significant hotspots (90%, 95%, 99% confidence) and coldspots.
- **Spatial Econometric Regression**: **Spatial Autoregressive Model (SAR / Spatial Lag)**:
  $$Y = \rho W Y + X \beta + \epsilon$$
  quantifying regional spatial spillover coefficients ($\rho$) across neighboring Algerian territories.
- **Continuous Density & Surface Modeling**:
  - **2D Kernel Density Estimation (KDE)** using bivariate quartic kernels with Silvermans rule bandwidth selection.
  - **Ordinary Kriging Spatial Interpolation** with spherical semivariogram modeling $\gamma(h) = c_0 + c \left[ 1.5 \frac{h}{a} - 0.5 \left(\frac{h}{a}\right)^3 \right]$ for unmonitored rural communes.
- **Multi-Criteria Evaluation**: **Analytic Hierarchy Process (AHP)** with pairwise comparison matrix and consistency verification ($CR < 0.10$).
- **Territorial Hierarchy**: Regional aggregation across the 5 national territorial divisions: *North Coastal, High Plateaus, East, West, and Great South*.

### 2.3 Multi-Format Data Ingestion Pipeline
- **Formats Supported**: `CSV`, `Excel (.xlsx, .xls)`, `GeoJSON`, `KML`, `Shapefile (.shp / .zip)`, and `SQLite (.db, .sqlite)`.
- **Automated Validation Protocols**:
  - Algerian bounding box coordinate check: $\text{Latitude} \in [18.5, 37.5]^\circ\text{N}$, $\text{Longitude} \in [-9.0, 12.5]^\circ\text{E}$.
  - Data unit standardization and currency normalization (DZD, Millions, Quintals, $m^3$).
  - Missing value imputation via linear temporal interpolation and $k$-NN spatial neighbor estimation.
  - Automated duplicate record pruning and schema conformance checks.
  - Immutable audit trail recording every applied data transformation.

### 2.4 Seven Specialized AI Agents
1. **Muse Spark** – Lead Qualitative Synthesizer & Strategic Policy Advisor.
2. **Gemini Pro (Google)** – Deep Multimodal Data Miner & Econometric Analyst.
3. **ChatGPT (OpenAI)** – Scenario Simulation & Decision Tree Evaluator.
4. **Qwen (Alibaba)** – Industrial Capacity, Trade Logistics & Infrastructure Expert.
5. **DeepSeek (DeepSeek)** – Mathematical Verification, Algorithmic Auditor & Spatial Econometrician.
6. **Claude (Anthropic)** – Ethical Governance, Institutional Risk & Sustainability Overseer.
7. **Grok (xAI)** – Real-time Early Warning, Geopolitical Volatility & Stress Tester.

### 2.5 12-Step Sovereign AI Council Chamber
Simulates an executive cabinet session across 12 rigorous procedural phases:
1. Session Initialization & Quorum Verification
2. Mathematical Proof Audit & Discrepancy Scanning
3. Spatial Spillover & Inter-Wilaya Diffusion Analysis
4. Quantitative Baseline vs. Target Variance Check
5. Cross-Sector Risk Propagation Assessment
6. Multi-Model Consensus Tournament Review
7. Divergence Flagging & Minority Opinion Recording
8. Scenario Sensitivity & Extreme Stress-Testing
9. Strategic Trade-off & Budgetary Allocation Optimization
10. Synthesis of Executive Decision Points
11. Formal Vote & Multi-Agent Consensus Scoring
12. Sovereign Roadmap Publication & Actionable Directives

### 2.6 Multi-Hazard National Early Warning System
- **Real-Time Threshold Scanning**:
  - **Water Stress & Drought**: Dam filling rate $< 25\%$ and groundwater deficit $> -30\%$.
  - **Flash Flood Risk**: Steep watershed slopes and extreme precipitation runoffs.
  - **Commercial Supply Gaps**: Huff gravity retail coverage deficits exceeding $30\%$.
  - **Price Volatility & Speculation**: Regional variance in staple goods distribution.
- **Protocol Automation**: Specific, actionable emergency civil protection and inter-ministerial interventions with uncertainty bounds.

### 2.7 Sovereign Decision Reporting
- Executive A4 Print Layout with high-density statistical typography.
- Standalone HTML interactive executive brief download.
- Full CSV dataset export for ministerial ERP and GIS integration.

---

## 3. Directory Structure | هيكل المجلدات

```
├── public/
│   ├── assets/
│   │   ├── logo.svg
│   │   └── banner.svg
│   └── samples/
│       ├── wilaya_indicators.csv
│       ├── dams.geojson
│       └── agricultural_zones.json
├── src/
│   ├── components/
│   │   ├── Header.tsx                   # Bilingual header, sector/wilaya picker
│   │   ├── NavigationTabs.tsx           # Tab routing with real-time badges
│   │   ├── GisMapSection.tsx            # Leaflet interactive map with custom layers
│   │   ├── QuantitativeCenter.tsx       # 12-model forecasting lab & tournament
│   │   ├── SpatialAnalysisLab.tsx       # Moran's I, Gi*, SAR regression, Kriging, KDE
│   │   ├── ScenarioCenter.tsx           # Optimistic / Baseline / Pessimistic to 2035
│   │   ├── AgentsCenter.tsx             # 7 AI Agents with mathematical reasoning
│   │   ├── CouncilChamber.tsx           # 12-step AI Council consensus chamber
│   │   ├── EarlyWarningDashboard.tsx    # Live multi-hazard emergency radar
│   │   ├── Foresight2030Dashboard.tsx   # 5-sector national territorial observatory
│   │   ├── DataImportStudio.tsx         # Multi-format ingestion pipeline & audit
│   │   └── ReportModal.tsx              # Sovereign A4 report, HTML, CSV exports
│   ├── engines/
│   │   ├── quantitative.ts              # Mathematical algorithms & econometric models
│   │   ├── gis.ts                       # Spatial statistics, SAR, Kriging, KDE, AHP
│   │   ├── dataRegistry.ts             # 58 Wilayas multitemporal historical series
│   │   ├── ingestion.ts                 # Validation, coordinate checks, transformations
│   │   ├── scenario.ts                  # 3-pathway driver projection engine
│   │   ├── evaluation.ts                # Out-of-sample backtesting & tournament
│   │   ├── agents.ts                    # 7 Agent analytical personas & prompts
│   │   ├── council.ts                   # 12-step consensus synthesis engine
│   │   ├── earlyWarning.ts              # Multi-hazard rule engine & thresholds
│   │   └── reporting.ts                 # Bilingual strategic report generator
│   ├── types/
│   │   └── index.ts                     # TypeScript interfaces & types
│   ├── App.tsx                          # Root application orchestrator
│   ├── index.css                        # Tailwind CSS v4 + Leaflet & Print styles
│   └── main.tsx                         # React entrypoint
├── server.ts                            # Full-stack Express API backend + Vite middleware
├── index.html                           # HTML shell with Cairo / Inter typography
├── metadata.json                        # Applet metadata
├── package.json                         # Dependencies & npm scripts
└── tsconfig.json                        # TypeScript configuration
```

---

## 4. REST API Reference | واجهات برمجة التطبيقات

| Endpoint | Method | Description |
|---|---|---|
| `/api/wilayas` | `GET` | Returns 58 Algerian wilayas with multi-temporal sector metrics |
| `/api/models` | `GET` | Lists all 12 quantitative models and classifications |
| `/api/data/sources` | `GET` | Catalogs all official data sources (ONS, ANRH, ONM, etc.) |
| `/api/forecast` | `POST` | Executes algorithmic forecast on input series with confidence bands |
| `/api/evaluate` | `POST` | Conducts walk-forward out-of-sample validation & tournament |
| `/api/spatial/analyze` | `POST` | Computes Moran's I, Getis-Ord Gi*, and AHP suitability rankings |
| `/api/scenarios/run` | `POST` | Generates Optimistic, Baseline, and Pessimistic pathways to 2035 |
| `/api/early-warning` | `GET` | Scans all wilayas for active multi-hazard alerts |
| `/api/agents/analyze` | `POST` | Dispatches query to one of the 7 specialized AI agents |
| `/api/council/convene` | `POST` | Convenes the 12-step AI Council deliberation session |

---

## 5. Development & Deployment | التشغيل والنشر

### Local Development
```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (Express + Vite on Port 3000)
npm run dev
```

### Production Build
```bash
# Compile and package production bundle
npm run build

# Start production server
npm start
```

### Deploying to Vercel
The repository is optimized for zero-config Vercel deployment:
- Client-side TypeScript analytical engines execute instantaneously in the browser.
- Full compliance with `gismap2.vercel.app` structure and styling.
- Responsive design tailored for desktops, mobile tablets, and executive command room monitors.

---

## 6. Official Data Source Attribution | مصادر البيانات المعتمدة
- **ONS**: Office National des Statistiques (الديوان الوطني للإحصائيات)
- **ANRH**: Agence Nationale des Ressources Hydrauliques (الوكالة الوطنية للموارد المائية)
- **ONM**: Office National de la Météorologie (الديوان الوطني للأرصاد الجوية)
- **MADR / DSA**: Direction des Services Agricoles (المصالح الفلاحية)
- **Copernicus / Sentinel-2**: Satellite Remote Sensing (الاستشعار عن بعد)
- **Bank of Algeria**: Financial & Inflation Indicators (بنك الجزائر)

---
*Developed for the Algerian National Foresight Initiative 2030 – Salim Slimani.*
