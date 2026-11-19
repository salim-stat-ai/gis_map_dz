/**
 * GIS Map – Quantitative Forecasting Center
 * Execution of ARIMA, Holt-Winters, OLS, Polynomial, Ridge, Random Forest & Monte Carlo
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useEffect, useRef, useState } from 'react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { ForecastModelType, ForecastResult, WilayaRecord } from '../types';
import { executeForecastModel } from '../engines/quantitative';
import { runModelTournament, BenchmarkTournamentResult } from '../engines/evaluation';
import { TrendingUp, Cpu, Award, HelpCircle, ShieldCheck, BookOpen, Lightbulb, Layers, ChevronDown, ChevronUp } from 'lucide-react';

ChartJS.register(...registerables);

interface QuantitativeCenterProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  lang: 'ar' | 'en';
}

export const QuantitativeCenter: React.FC<QuantitativeCenterProps> = ({
  wilayas,
  selectedWilaya,
  onSelectWilaya,
  lang
}) => {
  const isAr = lang === 'ar';
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<ChartJS | null>(null);

  const [selectedModel, setSelectedModel] = useState<ForecastModelType>('arima');
  const [selectedMetricKey, setSelectedMetricKey] = useState<'waterDef' | 'rain' | 'pop' | 'price'>('waterDef');
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [tournamentResult, setTournamentResult] = useState<BenchmarkTournamentResult | null>(null);
  const [showAllFamilies, setShowAllFamilies] = useState<boolean>(false);

  // Extract series for chosen metric
  const getHistoricalSeries = () => {
    const defaultYears = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
    if (selectedMetricKey === 'waterDef') {
      return {
        years: defaultYears,
        values: selectedWilaya.historicalWaterDef ?? [-10, -11, -12, -11, -13, -12, -14, -13],
        label: isAr ? 'مؤشر العجز المائي' : 'Water Deficit Index'
      };
    }
    if (selectedMetricKey === 'rain') {
      return {
        years: defaultYears,
        values: selectedWilaya.historicalRain ?? [selectedWilaya.rain * 1.08, selectedWilaya.rain * 1.05, selectedWilaya.rain * 1.02, selectedWilaya.rain * 0.98, selectedWilaya.rain * 1.01, selectedWilaya.rain * 0.96, selectedWilaya.rain * 0.95, selectedWilaya.rain],
        label: isAr ? 'التساقط السنوي (ملم)' : 'Annual Rainfall (mm)'
      };
    }
    if (selectedMetricKey === 'pop') {
      return {
        years: defaultYears,
        values: selectedWilaya.historicalPop ?? [selectedWilaya.pop - 56, selectedWilaya.pop - 48, selectedWilaya.pop - 40, selectedWilaya.pop - 32, selectedWilaya.pop - 24, selectedWilaya.pop - 16, selectedWilaya.pop - 8, selectedWilaya.pop],
        label: isAr ? 'السكان (بالآلاف)' : 'Population (thousands)'
      };
    }
    return {
      years: defaultYears,
      values: selectedWilaya.historicalPrice ?? [selectedWilaya.price - 18000, selectedWilaya.price - 15000, selectedWilaya.price - 12000, selectedWilaya.price - 9000, selectedWilaya.price - 6000, selectedWilaya.price - 4000, selectedWilaya.price - 2000, selectedWilaya.price],
      label: isAr ? 'سعر المتر المربع (دج)' : 'Price / m² (DZD)'
    };
  };

  // Re-run model and tournament on inputs change
  useEffect(() => {
    const series = getHistoricalSeries();
    const result = executeForecastModel(
      selectedModel,
      series.years,
      series.values,
      [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035]
    );
    result.wilaya = isAr ? selectedWilaya.n : selectedWilaya.en;
    result.targetMetric = series.label;
    setForecastResult(result);

    const tournament = runModelTournament(series.years, series.values, isAr ? selectedWilaya.n : selectedWilaya.en);
    setTournamentResult(tournament);
  }, [selectedWilaya, selectedModel, selectedMetricKey, isAr]);

  // Render chart
  useEffect(() => {
    if (!forecastResult || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const histYears = forecastResult.historicalYears;
    const histVals = forecastResult.historicalValues;
    const fPoints = forecastResult.forecast;

    const allLabels = [...histYears, ...fPoints.map(p => p.year)];
    const histDataset = [...histVals, ...fPoints.map(() => null)];
    const forecastDataset = [...histYears.map(() => null as number | null)];
    // connect last hist to first forecast
    forecastDataset[histYears.length - 1] = histVals[histVals.length - 1];
    fPoints.forEach(p => forecastDataset.push(p.value));

    const upper95 = [...histYears.map(() => null as number | null)];
    upper95[histYears.length - 1] = histVals[histVals.length - 1];
    fPoints.forEach(p => upper95.push(p.upper95 ?? p.value));

    const lower95 = [...histYears.map(() => null as number | null)];
    lower95[histYears.length - 1] = histVals[histVals.length - 1];
    fPoints.forEach(p => lower95.push(p.lower95 ?? p.value));

    chartInstance.current = new ChartJS(chartRef.current, {
      type: 'line',
      data: {
        labels: allLabels,
        datasets: [
          {
            label: isAr ? 'البيانات التاريخية الفعلية (2018–2025)' : 'Historical Observed (2018–2025)',
            data: histDataset,
            borderColor: '#94A3B8',
            backgroundColor: '#94A3B8',
            pointRadius: 4,
            borderWidth: 2
          },
          {
            label: isAr ? `مسار التوقع: ${forecastResult.modelName}` : `Forecast Trajectory: ${forecastResult.modelName}`,
            data: forecastDataset,
            borderColor: '#10B981',
            backgroundColor: '#10B981',
            borderDash: [5, 5],
            pointRadius: 4,
            borderWidth: 2.5
          },
          {
            label: isAr ? 'هامش عدم اليقين (فترة ثقة 95%)' : '95% Confidence Band',
            data: upper95,
            borderColor: 'transparent',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            fill: '+1',
            pointRadius: 0
          },
          {
            label: 'Lower 95%',
            data: lower95,
            borderColor: 'transparent',
            backgroundColor: 'transparent',
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#CBD5E1',
              font: { size: 11 },
              filter: (item) => item.text !== 'Lower 95%'
            }
          }
        },
        scales: {
          x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.06)' } },
          y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(255,255,255,0.06)' } }
        }
      }
    });

    return () => {
      if (chartInstance.current) chartInstance.current.destroy();
    };
  }, [forecastResult, isAr]);

  const modelsList: { id: ForecastModelType; nameEn: string; nameAr: string; category: string }[] = [
    { id: 'arima', nameEn: 'ARIMA(1,1,1) Differenced', nameAr: 'نموذج أريما (ARIMA)', category: 'Time Series' },
    { id: 'sarima', nameEn: 'SARIMA(1,1,1)(1,1,0)[4]', nameAr: 'ساريما الموسمي (SARIMA)', category: 'Time Series' },
    { id: 'holt_winters', nameEn: "Holt's Exponential Smoothing", nameAr: 'هولت للتنعيم الأسي', category: 'Time Series' },
    { id: 'ets', nameEn: 'ETS(A,A,A) State-Space', nameAr: 'فضاء الحالة ETS', category: 'Time Series' },
    { id: 'linear_regression', nameEn: 'Ordinary Least Squares (OLS)', nameAr: 'انحدار المربعات الصغرى (OLS)', category: 'Regression' },
    { id: 'multiple_regression', nameEn: 'Multiple OLS Regression', nameAr: 'الانحدار الخطي المتعدد', category: 'Regression' },
    { id: 'polynomial_regression', nameEn: 'Polynomial Regression (Deg 2)', nameAr: 'الانحدار متعدد الحدود', category: 'Regression' },
    { id: 'ridge_regression', nameEn: 'Tikhonov L2 Ridge', nameAr: 'انحدار ريدج المنتظم (L2)', category: 'Regression' },
    { id: 'lasso_regression', nameEn: 'Lasso L1 Sparse Regression', nameAr: 'انحدار لاسو المنتظم (L1)', category: 'Regression' },
    { id: 'random_forest', nameEn: 'Random Forest Ensemble', nameAr: 'الغابات العشوائية (RF)', category: 'ML' },
    { id: 'xgboost', nameEn: 'XGBoost / Gradient Boosting', nameAr: 'التدرج المعزز (XGBoost)', category: 'ML' },
    { id: 'monte_carlo', nameEn: 'Monte Carlo Simulation (N=1,500)', nameAr: 'محاكاة مونت كارلو الاحتمالية', category: 'Probabilistic' }
  ];

  // Build real-world bilingual interpretation from live chart values & active model
  const buildRealWorldInterpretation = () => {
    if (!forecastResult || forecastResult.forecast.length === 0) return null;
    const wilayaName = isAr ? selectedWilaya.n : selectedWilaya.en;
    const histVals = forecastResult.historicalValues;
    const histYears = forecastResult.historicalYears;
    const startVal = histVals[0];
    const lastHistVal = histVals[histVals.length - 1];
    const startYr = histYears[0];
    const lastHistYr = histYears[histYears.length - 1];
    const f2030 = forecastResult.forecast.find(p => p.year === 2030) ?? forecastResult.forecast[Math.min(4, forecastResult.forecast.length - 1)];
    const f2035 = forecastResult.forecast[forecastResult.forecast.length - 1];

    const histDelta = Number((lastHistVal - startVal).toFixed(1));
    const projDelta30 = Number((f2030.value - lastHistVal).toFixed(1));
    const projDelta35 = Number((f2035.value - lastHistVal).toFixed(1));
    const bandWidth35 = Number(((f2035.upper95 ?? f2035.value) - (f2035.lower95 ?? f2035.value)).toFixed(1));

    const fmtNum = (n: number) => n.toLocaleString(isAr ? 'ar-DZ' : 'en-US', { maximumFractionDigits: 1 });
    const fmtSigned = (n: number) => `${n > 0 ? '+' : ''}${fmtNum(n)}`;

    // Metric-specific physical meaning in reality
    const metricContext = (() => {
      if (selectedMetricKey === 'waterDef') {
        const severeBound = Math.min(f2035.lower95 ?? f2035.value, f2035.upper95 ?? f2035.value);
        const mildBound = Math.max(f2035.lower95 ?? f2035.value, f2035.upper95 ?? f2035.value);
        const worsening = f2035.value < lastHistVal;
        return {
          unitLabel: isAr ? 'نقطة عجز مائي' : 'Water Deficit Index pts',
          historicalMeaning: isAr
            ? `في ${wilayaName}، انتقل مؤشر العجز المائي فعلياً من (${fmtNum(startVal)}) سنة ${startYr} إلى (${fmtNum(lastHistVal)}) سنة ${lastHistYr} (تغير ${fmtSigned(histDelta)}). كلما نزل المؤشر تحت الصفر، يعني ذلك أن سحب المياه (الشرب، الفلاحة، الصناعة) يتجاوز التجدد الطبيعي للسدود والآبار، مع تذبذب مرتبط بسنوات الجفاف أو التساقط.`
            : `In ${wilayaName}, the Water Deficit Index moved from ${fmtNum(startVal)} (${startYr}) to ${fmtNum(lastHistVal)} (${lastHistYr}), a ${fmtSigned(histDelta)} change. Deeper negative values mean groundwater and dam withdrawals exceed natural recharge.`,
          forecastMeaning: isAr
            ? `بدون مشاريع هيكلية جديدة (تحويلات مائية، تحلية أو اقتصاد الري)، يتوقع النموذج أن ${worsening ? 'يتعمق العجز' : 'يتحرك المؤشر'} إلى (${fmtNum(f2030.value)}) في 2030 ثم (${fmtNum(f2035.value)}) في 2035 — أي بفارق (${fmtSigned(projDelta35)}) مقارنة بعام ${lastHistYr}. هذا مسار "استمرار الوضع الراهن" وليس قدراً محتوماً.`
            : `Under a business-as-usual trajectory (no new supply transfers or irrigation efficiency reforms), the model projects ${fmtNum(f2030.value)} by 2030 and ${fmtNum(f2035.value)} by 2035 (${fmtSigned(projDelta35)} vs ${lastHistYr}).`,
          bandMeaning: isAr
            ? `الفجوة المظللة تتسع كلما ابتعدنا عن 2025 لأن التراكم المناخي يضاعف عدم اليقين: في أفضل الأحوال (مواسم ممطرة + ترشيد الضخ) قد يستقر المؤشر قرب (${fmtNum(mildBound)}) بحلول 2035، وفي أسوأ سيناريو (جفاف متكرر + استنزاف غير مراقب) قد يهبط إلى (${fmtNum(severeBound)}).`
            : `The shaded 95% cone widens with time as hydrological uncertainty compounds: an optimistic upper bound near ${fmtNum(mildBound)} (wet cycles & conservation) versus a severe-drought lower bound near ${fmtNum(severeBound)} by 2035.`,
          actionNote: isAr
            ? `لصانع القرار في ${wilayaName}: التخطيط للبنية التحتية المائية يجب ألا يعتمد على الخط الأوسط فقط (${fmtNum(f2035.value)})، بل يجب بناء هامش أمان يغطي سيناريو الخطر الأقصى (${fmtNum(severeBound)}) بحلول 2035 عبر عدادات الآبار، إعادة استخدام المياه المستعملة المصفاة، أو ربط الشبكات.`
            : `Planning takeaway: Infrastructure reserves in ${wilayaName} should be stress-tested against the severe bound (${fmtNum(severeBound)}) rather than only the central line (${fmtNum(f2035.value)}).`
        };
      }
      if (selectedMetricKey === 'rain') {
        const worsening = f2035.value < lastHistVal;
        return {
          unitLabel: isAr ? 'ملم / سنة' : 'mm/yr',
          historicalMeaning: isAr
            ? `شهدت ${wilayaName} بين ${startYr} و${lastHistYr} تساقطات انتقلت من ${fmtNum(startVal)} ملم إلى ${fmtNum(lastHistVal)} ملم (${fmtSigned(histDelta)} ملم)، ما يعكس التذبذب المناخي وتراجع الانتظام المطري في المواسم الأخيرة.`
            : `${wilayaName} recorded rainfall shifting from ${fmtNum(startVal)} mm (${startYr}) to ${fmtNum(lastHistVal)} mm (${lastHistYr}) (${fmtSigned(histDelta)} mm).`,
          forecastMeaning: isAr
            ? `يمتد المسار المتوقع إلى ${fmtNum(f2030.value)} ملم في 2030 و${fmtNum(f2035.value)} ملم في 2035 (${worsening ? 'انخفاض هيكلي' : 'تغير'} بمقدار ${fmtSigned(projDelta35)} ملم)، وهو ما يحدد حجم الجريان السطحي لملء السدود وكميات الحبوب الممكنة بعلية.`
            : `Projected baseline reaches ${fmtNum(f2030.value)} mm in 2030 and ${fmtNum(f2035.value)} mm in 2035 (${fmtSigned(projDelta35)} mm), directly governing rain-fed cereal viability and dam inflow.`,
          bandMeaning: isAr
            ? `النطاق المظلل (± اتساع ${fmtNum(bandWidth35)} ملم في 2035) يميز بين المواسم الرطبة الممكنة حتى ${fmtNum(f2035.upper95 ?? f2035.value)} ملم، وسنوات الشح الجافة التي قد تنزل حتى ${fmtNum(f2035.lower95 ?? f2035.value)} ملم.`
            : `The 95% confidence band (span of ${fmtNum(bandWidth35)} mm by 2035) captures wet years up to ${fmtNum(f2035.upper95 ?? f2035.value)} mm versus dry-spell lows near ${fmtNum(f2035.lower95 ?? f2035.value)} mm.`,
          actionNote: isAr
            ? `لصانع القرار في ${wilayaName}: عند هبوط المتوسط دون 350–400 ملم في مواسم الجفاف (${fmtNum(f2035.lower95 ?? f2035.value)} ملم)، يصبح الري التكميلي بالتقطير وتخزين مياه الفيضانات ضرورة لحماية المحاصيل الاستراتيجية.`
            : `Decision insight: Prepare supplemental drip irrigation and stormwater harvesting whenever the lower drought bound drops toward ${fmtNum(f2035.lower95 ?? f2035.value)} mm.`
        };
      }
      if (selectedMetricKey === 'pop') {
        return {
          unitLabel: isAr ? 'ألف نسمة' : 'thousand residents',
          historicalMeaning: isAr
            ? `ارتفع التعداد السكاني في ${wilayaName} من ${fmtNum(startVal)} ألف نسمة (${startYr}) إلى ${fmtNum(lastHistVal)} ألف نسمة (${lastHistYr})، أي بزيادة فعلية قدرها ${fmtSigned(histDelta)} ألف نسمة تفرض ضغطاً متواصلاً على السكن والماء والمدارس.`
            : `Population in ${wilayaName} grew from ${fmtNum(startVal)}k (${startYr}) to ${fmtNum(lastHistVal)}k (${lastHistYr}), adding ${fmtSigned(histDelta)}k residents.`,
          forecastMeaning: isAr
            ? `بناءً على وتيرة النمو التاريخية، يتجه التعداد نحو ${fmtNum(f2030.value)} ألف نسمة في 2030 و${fmtNum(f2035.value)} ألف نسمة في 2035 (إضافة ${fmtSigned(projDelta35)} ألف نسمة جديدة تتطلب توسعاً عمرانياً وخدماتياً مخططاً).`
            : `Projections reach ${fmtNum(f2030.value)}k by 2030 and ${fmtNum(f2035.value)}k by 2035 (+${fmtNum(projDelta35)}k additional residents requiring housing, water, and transit).`,
          bandMeaning: isAr
            ? `نطاق الثقة بين ${fmtNum(f2035.lower95 ?? f2035.value)} ألف و${fmtNum(f2035.upper95 ?? f2035.value)} ألف نسمة يعكس احتمالات تباطؤ الخصوبة أو تسارع الهجرة الداخلية نحو الأقطاب الحضرية والصناعية للولاية.`
            : `The 2035 band (${fmtNum(f2035.lower95 ?? f2035.value)}k – ${fmtNum(f2035.upper95 ?? f2035.value)}k) reflects fertility shifts or accelerated internal migration.`,
          actionNote: isAr
            ? `لصانع القرار في ${wilayaName}: توقع إضافة ${fmtNum(Math.max(0, projDelta30))} ألف ساكن قبل 2030 يعني الحاجة المسبقة لحصص سكن، طاقة، وشبكات تموين بالمياه قبل ظهور الاختناق.`
            : `Plan urban land, housing allocations, and utility capacity ahead of the ${fmtNum(Math.max(0, projDelta30))}k resident increase projected by 2030.`
        };
      }
      return {
        unitLabel: isAr ? 'دج / م²' : 'DZD / m²',
        historicalMeaning: isAr
          ? `سجلت أسعار العقار في ${wilayaName} انتقالاً من ${fmtNum(startVal)} دج/م² (${startYr}) إلى ${fmtNum(lastHistVal)} دج/م² (${lastHistYr}) بتغير قدره ${fmtSigned(histDelta)} دج/م² نتيجة الضغط الحضري وتكلفة البناء.`
          : `Real estate land prices in ${wilayaName} shifted from ${fmtNum(startVal)} to ${fmtNum(lastHistVal)} DZD/m² (${fmtSigned(histDelta)} DZD/m²).`,
        forecastMeaning: isAr
          ? `المسار المقدر يصل إلى ${fmtNum(f2030.value)} دج/م² في 2030 و${fmtNum(f2035.value)} دج/م² في 2035 (${fmtSigned(projDelta35)} دج/م²)، ما يقيس ضغط الندرة العقارية وضرورة فتح أقطاب حضرية جديدة.`
          : `Projected prices reach ${fmtNum(f2030.value)} DZD/m² in 2030 and ${fmtNum(f2035.value)} DZD/m² in 2035 (${fmtSigned(projDelta35)} DZD/m²).`,
        bandMeaning: isAr
          ? `النطاق بين ${fmtNum(f2035.lower95 ?? f2035.value)} و${fmtNum(f2035.upper95 ?? f2035.value)} دج/م² يعكس حساسية السوق لوتيرة تحرير العقار العمومي، التمويل، وبرامج السكن الموجهة.`
          : `The 95% band (${fmtNum(f2035.lower95 ?? f2035.value)} – ${fmtNum(f2035.upper95 ?? f2035.value)} DZD/m²) reflects market sensitivity to land release and housing programs.`,
        actionNote: isAr
          ? `لصانع القرار في ${wilayaName}: تسارع السعر فوق المسار الأوسط يستدعي تسريع تهيئة الأوعية العقارية الجديدة لتفادي المضاربة وحماية القدرة الشرائية.`
          : `Accelerating land prices warrant proactive servicing of urban extension zones to curb speculative bottlenecks.`
      };
    })();

    // Model-specific mathematical & practical reading
    const params = forecastResult.parameters || {};
    const modelReading = (() => {
      switch (selectedModel) {
        case 'arima': {
          const phi = Number(params.phi ?? 0);
          const theta = Number(params.theta ?? 0.2);
          const drift = Number(params.drift ?? 0);
          const sigma = Number(params.sigma ?? 0);
          return {
            title: isAr ? 'كيف تقرأ معادلة ARIMA(1,1,1) عملياً؟' : 'How to read ARIMA(1,1,1) in practice',
            summary: isAr
              ? `بدل النظر للمستوى الخام، يدرس النموذج التغيّر السنوي (1 − B)¹ ثم يوازن بين زخم السنة الماضية، صدمة العام السابق، والانجراف العام.`
              : `Instead of raw levels, ARIMA models year-over-year changes (1 − B)¹ combining momentum, prior shock memory, and structural drift.`,
            bullets: isAr ? [
              `معامل الانحدار الذاتي (φ = ${phi}): ${Math.abs(phi) < 0.25 ? 'تأثير السنة الواحدة السابقة محدود وسريع التلاشي (لا توجد دورة طويلة عالقة).' : 'السنة الماضية تؤثر بقوة على وتيرة السنة الحالية.'}`,
              `المتوسط المتحرك (θ = ${theta}): يمتص نحو ${Math.round(theta * 100)}% من الصدمات العابرة (كموسم استثنائي رطب أو جاف) ويعيد المنحنى لمساره.`,
              `الانجراف السنوي (c / drift = ${fmtSigned(drift)}): يمثل الميل الهيكلي المتوسط لكل سنة، وهو السبب الرئيسي في ميلان الخط المتقطع إلى ${drift < 0 ? 'الأسفل' : 'الأعلى'}.`,
              `الانحراف المعياري (σ = ${sigma}): يقيس حجم المفاجآت السنوية الفعلية؛ وكلما كبر σ اتسع القمع المظلل لعدم اليقين.`
            ] : [
              `AR lag φ = ${phi}: ${Math.abs(phi) < 0.25 ? 'Short-term year-to-year carry-over fades quickly.' : 'Strong carry-over from prior year change.'}`,
              `MA shock memory θ = ${theta}: Propagates ${Math.round(theta * 100)}% of prior shock disturbances before stabilizing.`,
              `Structural drift (${fmtSigned(drift)}/yr): Drives the baseline slope of the dashed trajectory.`,
              `Noise scale σ = ${sigma}: Measures typical annual volatility, governing the width of the 95% fan.`
            ]
          };
        }
        case 'sarima':
          return {
            title: isAr ? 'دلالة النموذج الموسمي SARIMA على الواقع' : 'What SARIMA captures in reality',
            summary: isAr
              ? `يضيف إلى ARIMA ذاكرة دورية كل ${params.seasonalityPeriod ?? 4} سنوات، ما ينتج تموجاً في الخط المتقطع يحاكي الدورات المناخية (سنوات شح تليها سنوات انفراج نسبي).`
              : `Extends ARIMA with a ${params.seasonalityPeriod ?? 4}-year cyclical harmonic to reflect multi-year climate oscillations.`,
            bullets: isAr ? [
              `التموج في المنحنى الأخضر لا يعني دقة زمنية ليوم محدد، بل يذكّر أن الطبيعة تتحرك في دورات رطبة وجافة متعاقبة حول الاتجاه العام.`
            ] : [
              `Periodic waves in the dashed curve represent recurring multi-year wet/dry oscillations around the structural trend.`
            ]
          };
        case 'holt_winters':
        case 'ets':
          return {
            title: isAr ? 'دلالة التنعيم الأسي وفضاء الحالة (Holt / ETS)' : 'What Exponential Smoothing (Holt / ETS) means',
            summary: isAr
              ? `يعطي وزناً أكبر للسنوات الأخيرة (2023–2025) مقارنة بعام 2018، ما يجعله شديد الحساسية لأحدث تحول في الواقع الميداني (جفاف حديث أو توسع عمراني حديث).`
              : `Places exponentially higher weight on recent years (2023–2025) than 2018, adapting rapidly to recent regime shifts.`,
            bullets: isAr ? [
              `المستوى النهائي المقدّر: ${params.terminalLevel ?? '-'} | الميل الحالي: ${params.terminalTrend ?? '-'} سنوياً — وهو يقيس السرعة الحالية للمؤشر قبيل 2026.`
            ] : [
              `Terminal level: ${params.terminalLevel ?? '-'} | Current annual slope: ${params.terminalTrend ?? '-'}.`
            ]
          };
        case 'linear_regression':
        case 'multiple_regression':
        case 'polynomial_regression':
        case 'ridge_regression':
        case 'lasso_regression':
          return {
            title: isAr ? 'دلالة نماذج الانحدار على الواقع' : 'What Regression Models mean in reality',
            summary: isAr
              ? `ترسم "المعادلة المتوسطة الأنظف" عبر الزمن: OLS يعطي خطاً مستقيماً لوتيرة التغير المتوسطة؛ Polynomial يلتقط تسارع أو تباطؤ المنحنى؛ بينما Ridge وLasso يقلصان التذبذبات الوهمية لمنع تضخيم التوقع على المدى البعيد.`
              : `Fits the structural trend law: OLS extracts constant average pace, Polynomial captures acceleration/deceleration, and Ridge/Lasso regularize noisy swings.`,
            bullets: isAr ? [
              selectedModel === 'linear_regression'
                ? `الميل الخطي (Slope = ${params.slope ?? '-'}): يمثل متوسط التغير السنوي الثابت طوال الفترة.`
                : selectedModel === 'lasso_regression'
                  ? `الانتظام L1 صفّر (${params.zeroedWeightsCount ?? 0}) متغير ثانوي غير مؤثر للإبقاء فقط على المحركات الحقيقية.`
                  : `يعمل النموذج على موازنة الدقة التاريخية مع تجنب الانحرافات الحادة (Overfitting) بعد 2030.`
            ] : [
              `Balances historical trend extraction with structural regularization so long-horizon projections do not explode.`
            ]
          };
        case 'random_forest':
        case 'xgboost':
          return {
            title: isAr ? 'دلالة نماذج التعلم الآلي (RF / XGBoost)' : 'What Machine Learning Ensembles (RF / XGBoost) mean',
            summary: isAr
              ? `تقسّم الفترة التاريخية إلى مراحل وعتبات غير خطية (مثلاً: ما قبل أزمة جفاف أو موجة سعرية وما بعدها) وتجمع عشرات الأشجار، لذلك يظهر المسار أقل خطية ويلتقط نقاط التحول الهيكلية.`
              : `Splits history into distinct structural regimes/thresholds and aggregates tree ensembles to capture non-linear regime transitions.`,
            bullets: isAr ? [
              `مفيدة جداً لاكتشاف "نقاط الكسر" في السلاسل، لكنها في التوقعات البعيدة (2035) تتطلب دمغها مع نماذج السلاسل الزمنية في البطولة أدناه.`
            ] : [
              `Strong at detecting historical regime shifts; benchmark against time-series models in the Walk-Forward Tournament below.`
            ]
          };
        case 'monte_carlo':
        default:
          return {
            title: isAr ? 'دلالة محاكاة مونت كارلو (1,500 سيناريو عشوائي)' : 'What Monte Carlo Simulation (1,500 paths) means',
            summary: isAr
              ? `بدل رسم سيناريو واحد، يولّد الحاسوب 1,500 مستقبلاً محتملاً بتقلبات سنوية واقعية: الخط الأخضر هو "الوسيط" (50% أفضل منه و50% أسوأ منه)، والمنطقة المظللة تضم 95% من كل السيناريوهات الممكنة.`
              : `Simulates 1,500 stochastic future paths: the dashed line is the median (50th percentile) and the cone spans 95% of simulated futures.`,
            bullets: isAr ? [
              `الانجراف العشوائي (${params.drift ?? '-'}) مع تذبذب سنوي (${params.volatility ?? '-'}) يُظهر حجم المخاطرة الصافية حتى أفق 2035.`
            ] : [
              `Empirical drift (${params.drift ?? '-'}) combined with annual volatility (${params.volatility ?? '-'}) quantifies pure risk dispersion.`
            ]
          };
      }
    })();

    return {
      wilayaName,
      startYr,
      lastHistYr,
      startVal,
      lastHistVal,
      f2030,
      f2035,
      histDelta,
      projDelta35,
      metricContext,
      modelReading,
      fmtNum
    };
  };

  const interpretation = buildRealWorldInterpretation();

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm tracking-wide mb-1">
              <Cpu className="w-4 h-4" />
              <span>{isAr ? 'محرك الاستشراف والتحليل الكمي المستقل' : 'Quantitative Forecasting Engine'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'النمذجة الرياضية والإحصائية حتى أفق 2030' : 'Mathematical & Econometric Forecasting to 2030'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'محرك حسابي حقيقي يُنفذ خوارزميات السلاسل الزمنية، نماذج الانحدار، والغابات العشوائية مع تقييم دقة النماذج (RMSE, MAE, MAPE, AIC).'
                : 'Deterministic computational models executing time-series, regularized regressions, and probabilistic ensembles with rigorous backtesting.'}
            </p>
          </div>

          {/* Wilaya & Metric Pickers */}
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedWilaya.num}
              onChange={(e) => {
                const w = wilayas.find(x => x.num === Number(e.target.value));
                if (w) onSelectWilaya(w);
              }}
              className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
            >
              {wilayas.map(w => (
                <option key={w.num} value={w.num}>
                  {w.num}. {isAr ? w.n : w.en}
                </option>
              ))}
            </select>

            <select
              value={selectedMetricKey}
              onChange={(e) => setSelectedMetricKey(e.target.value as any)}
              className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
            >
              <option value="waterDef">{isAr ? '💧 العجز المائي التراكمي' : '💧 Water Deficit Index'}</option>
              <option value="rain">{isAr ? '🌧️ التساقطات المطرية (ملم)' : '🌧️ Rainfall (mm)'}</option>
              <option value="pop">{isAr ? '👥 السكان (بالآلاف)' : '👥 Population (k)'}</option>
              <option value="price">{isAr ? '🏠 أسعار العقار (دج/م²)' : '🏠 Land Price (DZD/m²)'}</option>
            </select>
          </div>
        </div>

        {/* Model Tabs Selection */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-5 pt-3 border-t border-white/10">
          {modelsList.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedModel(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                selectedModel === m.id
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-[#121F3D] text-slate-300 hover:bg-[#182B52] border border-white/5'
              }`}
            >
              {isAr ? m.nameAr : m.nameEn}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: Chart & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Forecast Chart */}
        <div className="lg:col-span-8 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>
                  {forecastResult?.targetMetric} — {isAr ? selectedWilaya.n : selectedWilaya.en}
                </span>
              </h2>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {forecastResult?.equationDescription}
              </div>
            </div>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded font-mono font-bold">
              Horizon 2035
            </span>
          </div>

          <div className="h-72 w-full bg-[#081020] p-3 rounded-xl border border-white/5">
            <canvas ref={chartRef} />
          </div>

          {/* Model Mathematical Parameters */}
          <div className="bg-[#101D38] p-3.5 rounded-xl border border-white/5 text-xs">
            <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
              <span>📐</span>
              <span>{isAr ? 'المعاملات المقدرة للنموذج (Estimated Parameters)' : 'Estimated Model Parameters'}</span>
            </div>
            <div className="flex flex-wrap gap-4 text-slate-300 font-mono text-[11px]">
              {forecastResult?.parameters &&
                Object.entries(forecastResult.parameters).map(([k, v]) => (
                  <div key={k} className="bg-[#091224] px-2.5 py-1 rounded border border-white/5">
                    <span className="text-slate-400">{k}:</span> <b>{String(v)}</b>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right: Validation Metrics Card */}
        <div className="lg:col-span-4 bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>{isAr ? 'تقييم الجودة الإحصائية للنموذج' : 'Goodness-of-Fit & Error Metrics'}</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {forecastResult?.metrics.validationMethod}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <span className="text-xs text-slate-300 font-medium">
                {isAr ? 'معامل التحديد (R²)' : 'R-Squared (R²)'}:
              </span>
              <b className="text-emerald-400 font-mono text-sm">{forecastResult?.metrics.r2}</b>
            </div>

            <div className="flex justify-between items-center bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <span className="text-xs text-slate-300 font-medium">
                {isAr ? 'الجذر التربيعي للخطأ (RMSE)' : 'Root Mean Squared Error (RMSE)'}:
              </span>
              <b className="text-sky-400 font-mono text-sm">{forecastResult?.metrics.rmse}</b>
            </div>

            <div className="flex justify-between items-center bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <span className="text-xs text-slate-300 font-medium">
                {isAr ? 'متوسط الخطأ المطلق (MAE)' : 'Mean Absolute Error (MAE)'}:
              </span>
              <b className="text-amber-400 font-mono text-sm">{forecastResult?.metrics.mae}</b>
            </div>

            <div className="flex justify-between items-center bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <span className="text-xs text-slate-300 font-medium">
                {isAr ? 'النسبة المئوية للخطأ (MAPE)' : 'Mean Absolute Pct Error (MAPE)'}:
              </span>
              <b className="text-rose-400 font-mono text-sm">{forecastResult?.metrics.mape}%</b>
            </div>

            <div className="flex justify-between items-center bg-[#121F3D] p-2.5 rounded-lg border border-white/5">
              <span className="text-xs text-slate-300 font-medium">
                {isAr ? 'معيار أكايكي للمعلومات (AIC)' : 'Akaike Information Criterion (AIC)'}:
              </span>
              <b className="text-purple-400 font-mono text-sm">{forecastResult?.metrics.aic}</b>
            </div>
          </div>

          {/* Scientific Disclaimer Note */}
          <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-200/90 leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-400">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isAr ? 'الالتزام بالمعايير العلمية' : 'Scientific Validation Notice'}</span>
            </div>
            <p className="text-[11px]">
              {isAr
                ? 'لا يتم الاعتماد على R² وحده للحكم على دقة النموذج. يتم فحص RMSE واختبار العينات المستقلة لضمان عدم حدوث فرط تخصيص (Overfitting).'
                : 'R² is not used alone to assess forecast validity. Out-of-sample RMSE and walk-forward backtesting dictate scientific model confidence.'}
            </p>
          </div>
        </div>
      </div>

      {/* Real-World Interpretation Panel (Directly On-App) */}
      {interpretation && (
        <div className="bg-[#0D172E] border border-emerald-500/20 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-white">
                  {isAr
                    ? `ماذا تعني هذه المنحنيات والمعادلة على أرض الواقع في ${interpretation.wilayaName}؟`
                    : `What These Curves & Model Mean in Reality — ${interpretation.wilayaName}`}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isAr
                    ? 'قراءة تطبيقية فورية تتحدّث تلقائياً حسب الولاية، المؤشر، والنموذج المختار أعلاه'
                    : 'Live practical interpretation updated automatically for the selected wilaya, metric, and model'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAllFamilies(v => !v)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#121F3D] hover:bg-[#182B52] text-sky-300 border border-sky-500/30 transition cursor-pointer shrink-0 self-start sm:self-auto"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{isAr ? 'دليل عائلات النماذج الـ12' : 'All 12 Model Families Guide'}</span>
              {showAllFamilies ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 3 Curve Visual Meanings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className="bg-[#101D38] border border-slate-400/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-200 flex items-center gap-2">
                  <span className="inline-block w-5 h-0.5 bg-slate-400 rounded"></span>
                  {isAr ? `1. الخط الرمادي (${interpretation.startYr}–${interpretation.lastHistYr})` : `1. Solid Line (${interpretation.startYr}–${interpretation.lastHistYr})`}
                </span>
                <span className="text-[11px] font-mono text-slate-300 bg-[#081020] px-2 py-0.5 rounded">
                  {interpretation.fmtNum(interpretation.startVal)} → {interpretation.fmtNum(interpretation.lastHistVal)}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {interpretation.metricContext.historicalMeaning}
              </p>
            </div>

            <div className="bg-[#101D38] border border-emerald-500/25 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-2">
                  <span className="inline-block w-5 h-0.5 border-t-2 border-dashed border-emerald-400"></span>
                  {isAr ? '2. الخط الأخضر المتقطع (2026–2035)' : '2. Dashed Forecast (2026–2035)'}
                </span>
                <span className="text-[11px] font-mono text-emerald-300 bg-[#081020] px-2 py-0.5 rounded">
                  2030: {interpretation.fmtNum(interpretation.f2030.value)} | 2035: {interpretation.fmtNum(interpretation.f2035.value)}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {interpretation.metricContext.forecastMeaning}
              </p>
            </div>

            <div className="bg-[#101D38] border border-teal-500/25 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-teal-300 flex items-center gap-2">
                  <span className="inline-block w-3.5 h-3.5 rounded-sm bg-emerald-500/25 border border-emerald-400/50"></span>
                  {isAr ? '3. المنطقة المظللة (ثقة 95%)' : '3. Shaded 95% Band'}
                </span>
                <span className="text-[11px] font-mono text-teal-300 bg-[#081020] px-2 py-0.5 rounded">
                  [{interpretation.fmtNum(interpretation.f2035.lower95 ?? interpretation.f2035.value)} .. {interpretation.fmtNum(interpretation.f2035.upper95 ?? interpretation.f2035.value)}]
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {interpretation.metricContext.bandMeaning}
              </p>
            </div>
          </div>

          {/* Active Model & Equation Meaning + Executive Takeaway */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            <div className="lg:col-span-7 bg-[#091224] border border-white/10 rounded-xl p-4 space-y-2">
              <div className="text-xs font-extrabold text-sky-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>{interpretation.modelReading.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {interpretation.modelReading.summary}
              </p>
              <ul className="space-y-1 text-[11px] text-slate-300 list-disc ps-4 pt-1">
                {interpretation.modelReading.bullets.map((b, i) => (
                  <li key={i} className="leading-relaxed">{b}</li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-2 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>{isAr ? 'الخلاصة العملية لاتخاذ القرار' : 'Real-World Decision Takeaway'}</span>
                </div>
                <p className="text-xs text-emerald-100/90 leading-relaxed">
                  {interpretation.metricContext.actionNote}
                </p>
              </div>
              <div className="text-[11px] text-slate-300 bg-[#081020]/70 border border-white/10 rounded-lg px-3 py-2">
                {isAr
                  ? '💡 مقارنة سريعة: الخط المتقطع = "استمرار الوضع الحالي"، أما هامش الثقة السفلي والعلوي فيحددان حدود الخطر والانفراج عند التخطيط.'
                  : 'Quick rule: The dashed curve is "business as usual", while the 95% bounds frame your resilience stress-tests.'}
              </div>
            </div>
          </div>

          {/* Collapsible 4 Model Families Field Guide */}
          {showAllFamilies && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/10">
              <div className="bg-[#091224] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-emerald-400">
                  {isAr ? '1. السلاسل الزمنية (ARIMA / SARIMA / Holt / ETS)' : '1. Time Series (ARIMA / SARIMA / Holt / ETS)'}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'تفترض أن المستقبل يحمل ذاكرة الماضي: الجفاف أو الوفرة لا يختفي فجأة بل يتناقص تدريجياً أو يتكرر في دورات مناخية مع ترجيح أكبر للسنوات الأخيرة.'
                    : 'Assumes tomorrow remembers yesterday: models momentum, shock decay, and multi-year climate cycles with recency weighting.'}
                </p>
              </div>
              <div className="bg-[#091224] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-sky-400">
                  {isAr ? '2. نماذج الانحدار (OLS / Poly / Ridge / Lasso)' : '2. Regression (OLS / Poly / Ridge / Lasso)'}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'تكشف الاتجاه الهيكلي الطويل (خطي أو متسارع). تعمل Ridge وLasso كـ"فرامل رياضية" تمنع المبالغة الناتجة عن سنة شاذة.'
                    : 'Extracts the long-run trend slope or curvature; Ridge & Lasso apply mathematical shrinkage to filter outlier distortions.'}
                </p>
              </div>
              <div className="bg-[#091224] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-purple-400">
                  {isAr ? '3. التعلم الآلي (Random Forest / XGBoost)' : '3. Machine Learning (Random Forest / XGBoost)'}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'تلتقط التحولات المفاجئة والعتبات غير الخطية (مثلاً: تغيّر السلوك بعد 2022) عبر تجميع عشرات أشجار القرار بدل معادلة خطية واحدة.'
                    : 'Captures non-linear regime breaks and structural thresholds by combining multiple decision trees.'}
                </p>
              </div>
              <div className="bg-[#091224] border border-white/10 rounded-xl p-3.5 space-y-1.5">
                <div className="text-xs font-bold text-amber-400">
                  {isAr ? '4. محاكاة مونت كارلو (N = 1,500)' : '4. Monte Carlo Simulation (N = 1,500)'}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isAr
                    ? 'تحاكي 1,500 سيناريو عشوائياً محتملاً لتقيس حجم المخاطر الصافية وأقصى حدود الصدمة بدلاً من الاكتفاء برقم وحيد.'
                    : 'Simulates 1,500 stochastic futures from empirical drift and volatility to quantify tail risks.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Model Comparison Tournament */}
      {tournamentResult && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isAr ? 'بطولة مقارنة النماذج والتحقق المستقل (Walk-Forward Tournament)' : 'Multi-Model Tournament & Empirical Benchmarking'}
                </h3>
                <span className="text-xs text-slate-400">
                  {isAr ? 'مقارنة أداء جميع النماذج المرشحة واختيار النموذج الأفضل علمياً' : 'Automated ranking across 7 candidate algorithms based on test-set RMSE'}
                </span>
              </div>
            </div>
            <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs px-3 py-1 rounded-lg font-bold">
              {isAr ? `النموذج الأفضل: ${tournamentResult.bestModel.modelName}` : `Best Model: ${tournamentResult.bestModel.modelName}`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-300">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 text-left rtl:text-right font-semibold">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{isAr ? 'النموذج الرياضي' : 'Algorithm'}</th>
                  <th className="py-2.5 px-3">R²</th>
                  <th className="py-2.5 px-3">In-Sample RMSE</th>
                  <th className="py-2.5 px-3">Out-Of-Sample RMSE</th>
                  <th className="py-2.5 px-3">Test MAPE</th>
                  <th className="py-2.5 px-3">AIC</th>
                  <th className="py-2.5 px-3">{isAr ? 'الملاءمة العلمية' : 'Scientific Notes'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tournamentResult.modelsRanked.map((m, idx) => (
                  <tr
                    key={m.modelType}
                    className={`hover:bg-white/5 transition ${
                      m.isRecommended ? 'bg-emerald-500/10 font-bold text-white' : ''
                    }`}
                  >
                    <td className="py-2 px-3">
                      {m.isRecommended ? '🏆 1' : `${idx + 1}`}
                    </td>
                    <td className="py-2 px-3">
                      <span>{m.modelName}</span>
                      {m.isRecommended && (
                        <span className="ms-2 bg-emerald-500 text-black text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                          {isAr ? 'موصى به' : 'Best'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-mono">{m.inSampleMetrics.r2}</td>
                    <td className="py-2 px-3 font-mono">{m.inSampleMetrics.rmse}</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">{m.outOfSampleMetrics.rmse}</td>
                    <td className="py-2 px-3 font-mono">{m.outOfSampleMetrics.mape}%</td>
                    <td className="py-2 px-3 font-mono text-purple-400">{m.inSampleMetrics.aic}</td>
                    <td className="py-2 px-3 text-[11px] text-slate-400">{m.scientificNotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
