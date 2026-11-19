/**
 * GIS Map – Geo-Intelligence & Quantitative Foresight for Algeria 2030
 * Full-Stack Express Server with Analytical Engine Endpoints & Vite Dev Server
 * © 2026 Salim Slimani & National Foresight System
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { INITIAL_WILAYAS, ALGERIA_DATA_SOURCES } from './src/engines/dataRegistry';
import { executeForecastModel } from './src/engines/quantitative';
import { computeMoransI, computeGetisOrdGi, evaluateAhpSuitability } from './src/engines/gis';
import { generateAllPathways } from './src/engines/scenario';
import { runModelTournament } from './src/engines/evaluation';
import { AI_AGENT_PROFILES, runAgentAnalysis } from './src/engines/agents';
import { conveneAiCouncil } from './src/engines/council';
import { scanNationalEarlyWarnings } from './src/engines/earlyWarning';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// API REST Endpoints
// ==========================================

// 0. GET /api/proxy (CORS Proxy for external geo-data portals, OSM Overpass, GADM, World Bank, NASA)
app.get('/api/proxy', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  try {
    const fetchResponse = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'GIS-Map-Algeria-GeoIntelligence/2.0 (Open Data Ingestion Pipeline)',
        'Accept': '*/*'
      }
    });

    if (!fetchResponse.ok) {
      return res.status(fetchResponse.status).json({
        error: `Upstream HTTP Error ${fetchResponse.status}: ${fetchResponse.statusText}`
      });
    }

    const contentType = fetchResponse.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await fetchResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    res.status(502).json({
      error: 'Proxy failure: ' + (err.message || 'Unknown network error')
    });
  }
});

// 1. GET /api/data/sources
app.get('/api/data/sources', (_req, res) => {
  res.json({
    success: true,
    totalSources: ALGERIA_DATA_SOURCES.length,
    sources: ALGERIA_DATA_SOURCES
  });
});

// 2. GET /api/models
app.get('/api/models', (_req, res) => {
  res.json({
    success: true,
    models: [
      { id: 'arima', name: 'ARIMA (AutoRegressive Integrated Moving Average)', category: 'Time Series' },
      { id: 'holt_winters', name: "Holt's Linear Exponential Smoothing", category: 'Time Series' },
      { id: 'linear_regression', name: 'Ordinary Least Squares (OLS)', category: 'Econometric Regression' },
      { id: 'polynomial_regression', name: 'Polynomial Degree 2 Curve', category: 'Econometric Regression' },
      { id: 'ridge_regression', name: 'Tikhonov L2 Regularized Ridge', category: 'Econometric Regression' },
      { id: 'random_forest', name: 'Random Forest Ensemble Regressor', category: 'Machine Learning' },
      { id: 'monte_carlo', name: 'Stochastic Monte Carlo Simulation (N=1,500)', category: 'Probabilistic' }
    ]
  });
});

// 3. GET /api/wilayas
app.get('/api/wilayas', (_req, res) => {
  res.json({
    success: true,
    count: INITIAL_WILAYAS.length,
    wilayas: INITIAL_WILAYAS
  });
});

// 4. GET /api/early-warning
app.get('/api/early-warning', (req, res) => {
  const year = Number(req.query.year) || 2030;
  const lang = (req.query.lang as 'ar' | 'en') || 'ar';
  const alerts = scanNationalEarlyWarnings(INITIAL_WILAYAS, year, lang);
  res.json({
    success: true,
    year,
    count: alerts.length,
    alerts
  });
});

// 5. POST /api/forecast
app.post('/api/forecast', (req, res) => {
  try {
    const { model, wilayaNum, metric, years, values, forecastYears } = req.body;
    let targetWilaya = INITIAL_WILAYAS.find(w => w.num === Number(wilayaNum)) || INITIAL_WILAYAS[18]; // Default Setif

    const inputYears = years || targetWilaya.historicalYears || [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const inputVals = values || targetWilaya.historicalWaterDef || [-10, -11, -12, -11, -13, -12, -14, -13];
    const targetForecastYears = forecastYears || [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035];

    const result = executeForecastModel(model || 'arima', inputYears, inputVals, targetForecastYears);
    result.wilaya = targetWilaya.en;
    result.targetMetric = metric || 'Water Deficit';

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Forecast calculation error' });
  }
});

// 6. POST /api/evaluate
app.post('/api/evaluate', (req, res) => {
  try {
    const { wilayaNum, years, values } = req.body;
    let targetWilaya = INITIAL_WILAYAS.find(w => w.num === Number(wilayaNum)) || INITIAL_WILAYAS[18];
    const inputYears = years || targetWilaya.historicalYears || [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    const inputVals = values || targetWilaya.historicalWaterDef || [-10, -11, -12, -11, -13, -12, -14, -13];

    const tournament = runModelTournament(inputYears, inputVals, targetWilaya.en);
    res.json({ success: true, tournament });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Evaluation error' });
  }
});

// 7. POST /api/spatial/analyze
app.post('/api/spatial/analyze', (req, res) => {
  try {
    const { indicator = 'waterDef', ahpCriteria } = req.body;
    const extractFn = (w: any) => Number(w[indicator] ?? w.waterDef);

    const moran = computeMoransI(INITIAL_WILAYAS, extractFn);
    const hotspots = computeGetisOrdGi(INITIAL_WILAYAS, extractFn);
    const ahp = evaluateAhpSuitability(
      INITIAL_WILAYAS,
      ahpCriteria || [
        { id: 'water', name: 'Water Resources', nameAr: 'الموارد المائية', weight: 0.35 },
        { id: 'roads', name: 'Road Connectivity', nameAr: 'شبكة الطرق', weight: 0.25 },
        { id: 'energy', name: 'Power Grid', nameAr: 'شبكة الطاقة', weight: 0.20 },
        { id: 'labor', name: 'Workforce', nameAr: 'اليد العاملة', weight: 0.20 }
      ]
    );

    res.json({
      success: true,
      indicator,
      moransI: moran,
      hotspotsSample: hotspots.slice(0, 10),
      ahpTopWilayas: ahp.rankedWilayas.slice(0, 10)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Spatial analysis error' });
  }
});

// 8. POST /api/scenarios/run
app.post('/api/scenarios/run', (req, res) => {
  try {
    const { wilayaNum, customDrivers } = req.body;
    const targetWilaya = INITIAL_WILAYAS.find(w => w.num === Number(wilayaNum)) || INITIAL_WILAYAS[18];
    const pathways = generateAllPathways(targetWilaya, customDrivers);
    res.json({ success: true, wilaya: targetWilaya.en, pathways });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Scenario run error' });
  }
});

// 9. POST /api/agents/analyze
app.post('/api/agents/analyze', (req, res) => {
  try {
    const { agentId, wilayaNum, targetYear = 2030, lang = 'ar' } = req.body;
    const targetWilaya = INITIAL_WILAYAS.find(w => w.num === Number(wilayaNum)) || INITIAL_WILAYAS[18];
    const analysis = runAgentAnalysis(agentId || 'spark', targetWilaya, INITIAL_WILAYAS, Number(targetYear), lang);
    res.json({ success: true, analysis });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Agent analysis error' });
  }
});

// 10. POST /api/council/convene
app.post('/api/council/convene', (req, res) => {
  try {
    const { wilayaNum, targetYear = 2030, lang = 'ar' } = req.body;
    const targetWilaya = INITIAL_WILAYAS.find(w => w.num === Number(wilayaNum)) || INITIAL_WILAYAS[18];
    const councilDossier = conveneAiCouncil(targetWilaya, INITIAL_WILAYAS, Number(targetYear), lang);
    res.json({ success: true, council: councilDossier });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'AI Council convention error' });
  }
});

// Helper: Ensure single-file portable HTML exists
function ensurePortableHtml(): string {
  const portableHtmlPath = path.resolve(__dirname, 'dist-portable', 'index.html');
  if (!fs.existsSync(portableHtmlPath)) {
    execSync('npx vite build --config vite.portable.config.ts', {
      cwd: __dirname,
      stdio: 'pipe'
    });
  }
  return portableHtmlPath;
}

// 11. GET /api/desktop/portable-html (Zero-install single self-contained HTML portable desktop app)
app.get('/api/desktop/portable-html', (_req, res) => {
  try {
    const portableHtmlPath = ensurePortableHtml();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="GIS-Map-Algeria-2030-Portable.html"');
    res.sendFile(portableHtmlPath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Portable HTML build failed' });
  }
});

// 12. GET /api/desktop/portable-zip (Full Portable Desktop Kit with OS App-Window Launchers + Electron template)
app.get('/api/desktop/portable-zip', (_req, res) => {
  try {
    const portableHtmlPath = ensurePortableHtml();
    const portableDir = path.resolve(__dirname, 'dist-portable');
    const zipPath = path.resolve(portableDir, 'GIS-Map-Algeria-Desktop-Portable.zip');

    // Write Windows Desktop App-Window Launcher (.bat)
    const batLauncher = `@echo off
title GIS Map - Algeria Geo-Intelligence 2030 (Portable Desktop)
set "APP_FILE=%~dp0GIS-Map-Algeria-2030-Portable.html"
set "URL_FILE=file:///%APP_FILE:\\=/%"

:: Launch in dedicated App Window (no browser tabs/address bar) using Edge or Chrome if available
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)
if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
  start "" "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)
if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)
if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
  start "" "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" --app="%URL_FILE%" --window-size=1440,920
  exit /b
)

:: Fallback to default browser
start "" "%APP_FILE%"
`;

    // macOS launcher (.command)
    const macLauncher = `#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_FILE="$DIR/GIS-Map-Algeria-2030-Portable.html"
if [ -d "/Applications/Google Chrome.app" ]; then
  open -na "Google Chrome" --args --app="file://$APP_FILE"
elif [ -d "/Applications/Microsoft Edge.app" ]; then
  open -na "Microsoft Edge" --args --app="file://$APP_FILE"
else
  open "$APP_FILE"
fi
`;

    // Linux launcher (.sh)
    const linuxLauncher = `#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
APP_FILE="$DIR/GIS-Map-Algeria-2030-Portable.html"
if command -v google-chrome >/dev/null 2>&1; then
  google-chrome --app="file://$APP_FILE" >/dev/null 2>&1 &
elif command -v microsoft-edge >/dev/null 2>&1; then
  microsoft-edge --app="file://$APP_FILE" >/dev/null 2>&1 &
elif command -v chromium >/dev/null 2>&1; then
  chromium --app="file://$APP_FILE" >/dev/null 2>&1 &
else
  xdg-open "$APP_FILE"
fi
`;

    const readmeTxt = `GIS MAP - ALGERIA GEO-INTELLIGENCE 2030 (PORTABLE DESKTOP EDITION)
======================================================================

[العربية - طريقة التشغيل الفوري بدون تثبيت]
1) فك ضغط هذا المجلد في سطح المكتب أو على مفتاح USB.
2) على ويندوز (Windows): انقر نقرتين على Start-GIS-Map-Desktop.bat ليفتح البرنامج في نافذة تطبيق مستقلة.
   أو افتح مباشرة ملف GIS-Map-Algeria-2030-Portable.html بأي متصفح.
3) على ماك (macOS): انقر على Start-GIS-Map-Desktop.command.
4) على لينكس (Linux): شغّل Start-GIS-Map-Desktop.sh.
5) جميع النماذج الكمية الـ12 وبيانات 58 ولاية والوكلاء السبعة والتقارير تعمل محلياً 100%.

[Optional Native Electron Portable Binary (.exe / AppImage)]
If you have Node.js installed locally and want a compiled native binary:
  cd electron
  npm install
  npm run pack:win     # generates release/GIS-Map-Algeria-2030-Portable.exe
  npm run pack:linux   # generates Linux AppImage
`;

    fs.writeFileSync(path.join(portableDir, 'Start-GIS-Map-Desktop.bat'), batLauncher.replace(/\n/g, '\r\n'));
    fs.writeFileSync(path.join(portableDir, 'Start-GIS-Map-Desktop.command'), macLauncher, { mode: 0o755 });
    fs.writeFileSync(path.join(portableDir, 'Start-GIS-Map-Desktop.sh'), linuxLauncher, { mode: 0o755 });
    fs.writeFileSync(path.join(portableDir, 'README-PORTABLE-DESKTOP.txt'), readmeTxt);

    // Build portable ZIP via Python stdlib zipfile (always available, zero extra deps)
    const pyCmd = `python3 -c "
import zipfile, os
p = '${portableDir.replace(/\\/g, '/')}'
root = '${__dirname.replace(/\\/g, '/')}'
zpath = '${zipPath.replace(/\\/g, '/')}'
with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_DEFLATED) as z:
    z.write('${portableHtmlPath.replace(/\\/g, '/')}', 'GIS-Map-Desktop-Portable/GIS-Map-Algeria-2030-Portable.html')
    z.write(os.path.join(p, 'Start-GIS-Map-Desktop.bat'), 'GIS-Map-Desktop-Portable/Start-GIS-Map-Desktop.bat')
    z.write(os.path.join(p, 'Start-GIS-Map-Desktop.command'), 'GIS-Map-Desktop-Portable/Start-GIS-Map-Desktop.command')
    z.write(os.path.join(p, 'Start-GIS-Map-Desktop.sh'), 'GIS-Map-Desktop-Portable/Start-GIS-Map-Desktop.sh')
    z.write(os.path.join(p, 'README-PORTABLE-DESKTOP.txt'), 'GIS-Map-Desktop-Portable/README-PORTABLE-DESKTOP.txt')
    z.write(os.path.join(root, 'desktop-portable', 'main.cjs'), 'GIS-Map-Desktop-Portable/electron/main.cjs')
    z.write(os.path.join(root, 'desktop-portable', 'package.json'), 'GIS-Map-Desktop-Portable/electron/package.json')
    z.write('${portableHtmlPath.replace(/\\/g, '/')}', 'GIS-Map-Desktop-Portable/electron/GIS-Map-Algeria-2030-Portable.html')
"`;
    execSync(pyCmd, { cwd: __dirname, stdio: 'pipe' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="GIS-Map-Algeria-Desktop-Portable.zip"');
    res.sendFile(zipPath);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Portable ZIP packaging failed' });
  }
});

// ==========================================
// Vite Dev Server Integration
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GIS Map] Geo-Intelligence Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
