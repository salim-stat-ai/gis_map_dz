/**
 * GIS Map – Strategic Report Modal Component
 * Full-featured executive document viewer preserving the Legacy Master Report in detail
 * alongside the New Sovereign Quantitative Foresight 2030 Report and Unified Dossier.
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState, useRef, useEffect } from 'react';
import { WilayaRecord } from '../types';
import {
  generateStrategicReportHtml,
  downloadReportHtml,
  downloadWilayasCsv,
  ReportMode,
  ReportScope,
  ThematicCaseKey,
  ReportLang
} from '../engines/reporting';
import { conveneAiCouncil } from '../engines/council';
import { Printer, Download, X, FileText, Sparkles, RefreshCw } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedWilaya: WilayaRecord;
  wilayas: WilayaRecord[];
  targetYear: number;
  initialLang?: 'ar' | 'en';
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  selectedWilaya,
  wilayas,
  targetYear: propTargetYear,
  initialLang = 'en'
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // States
  const [mode, setMode] = useState<ReportMode>('combined');
  const [scope, setScope] = useState<ReportScope>('wilaya');
  const [activeWilaya, setActiveWilaya] = useState<WilayaRecord>(selectedWilaya);
  const [compareWilayas, setCompareWilayas] = useState<WilayaRecord[]>(() => [
    selectedWilaya,
    wilayas.find(w => w.en === 'Algiers') || wilayas[15] || wilayas[0],
    wilayas.find(w => w.en === 'Oran') || wilayas[30] || wilayas[0],
    wilayas.find(w => w.en === 'Constantine') || wilayas[24] || wilayas[0]
  ]);
  const [thematicCase, setThematicCase] = useState<ThematicCaseKey>('water');
  const [targetYear, setTargetYear] = useState<number>(propTargetYear || 2030);
  const [reportLang, setReportLang] = useState<ReportLang>(initialLang);
  const [refreshTick, setRefreshTick] = useState<number>(0);

  // Sync active report settings whenever main app selection or dataset updates
  useEffect(() => {
    const matched = wilayas.find(w => w.num === selectedWilaya.num) || selectedWilaya;
    setActiveWilaya(matched);
  }, [selectedWilaya, wilayas]);

  useEffect(() => {
    if (propTargetYear) setTargetYear(propTargetYear);
  }, [propTargetYear]);

  useEffect(() => {
    setReportLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    setCompareWilayas(prev =>
      prev.map(cw => wilayas.find(w => w.num === cw.num) || cw)
    );
  }, [wilayas]);

  if (!isOpen) return null;

  const isAr = reportLang === 'ar';
  const isFr = reportLang === 'fr';

  // Council Data (freshly convened on current wilaya, dataset, year, lang)
  const councilData = conveneAiCouncil(activeWilaya, wilayas, targetYear, reportLang === 'fr' ? 'en' : reportLang);

  // Generate Live HTML Report
  const reportHtml = generateStrategicReportHtml({
    mode,
    scope,
    wilaya: activeWilaya,
    compareWilayas,
    allWilayas: wilayas,
    targetYear,
    thematicCase,
    councilData,
    lang: reportLang
  });

  // Handle In-Iframe Print (Reliable and immune to popup blockers)
  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(reportHtml);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 400);
        }
      }
    }
  };

  const handleDownloadHtml = () => {
    const filename = `gis_map_${mode}_${scope}_${activeWilaya.en}_${targetYear}.html`;
    downloadReportHtml(reportHtml, filename);
  };

  const handleRefreshReport = () => {
    const freshSelected = wilayas.find(w => w.num === selectedWilaya.num) || selectedWilaya;
    setActiveWilaya(freshSelected);
    setRefreshTick(t => t + 1);
  };

  const handleToggleCompareWilaya = (w: WilayaRecord) => {
    if (compareWilayas.some(cw => cw.num === w.num)) {
      if (compareWilayas.length > 1) {
        setCompareWilayas(compareWilayas.filter(cw => cw.num !== w.num));
      }
    } else {
      if (compareWilayas.length < 6) {
        setCompareWilayas([...compareWilayas, w]);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="bg-[#0B152B] border border-white/15 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Control Header */}
        <div className="bg-[#0E1B38] px-4 py-3 border-b border-white/10 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-sky-400" />
              <div>
                <b className="text-white text-sm">
                  {isAr ? 'مركز توليد التقارير الجيو-استخبارية والاستشرافية' : isFr ? 'Centre de Rapports Géo-Stratégiques & Prospective' : 'Geo-Intelligence & Sovereign Foresight Reports'}
                </b>
                <span className="text-xs text-slate-400 ms-2">
                  {activeWilaya.num}. {isAr ? activeWilaya.n : activeWilaya.en} — {targetYear} ({wilayas.length} {isAr ? 'ولاية' : 'wilayas'})
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Manual Refresh / Live Update */}
              <button
                type="button"
                onClick={handleRefreshReport}
                title={isAr ? 'تحيين التقرير بالبيانات الحالية' : 'Refresh report with latest calculations'}
                className="flex items-center gap-1 bg-[#142347] hover:bg-[#1E315C] text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-1.5 rounded-lg font-semibold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isAr ? 'تحيين' : isFr ? 'Actualiser' : 'Refresh'}</span>
              </button>

              {/* Language Switcher */}
              <div className="flex items-center bg-[#142347] border border-white/10 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setReportLang('ar')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition ${reportLang === 'ar' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  العربية
                </button>
                <button
                  onClick={() => setReportLang('en')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition ${reportLang === 'en' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  English
                </button>
                <button
                  onClick={() => setReportLang('fr')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition ${reportLang === 'fr' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'}`}
                >
                  Français
                </button>
              </div>

              {/* Print / PDF Button */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{isAr ? '🖨️ طباعة / PDF' : isFr ? 'Imprimer / PDF' : 'Print / PDF'}</span>
              </button>

              {/* Download Standalone HTML */}
              <button
                onClick={handleDownloadHtml}
                className="flex items-center gap-1.5 bg-[#172545] hover:bg-[#1E315C] text-slate-200 border border-white/10 text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-sky-400" />
                <span>HTML</span>
              </button>

              {/* Download CSV */}
              <button
                onClick={() => downloadWilayasCsv(wilayas, `algeria_geo_intelligence_${targetYear}.csv`, targetYear)}
                className="flex items-center gap-1.5 bg-[#172545] hover:bg-[#1E315C] text-slate-200 border border-white/10 text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>CSV</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer ms-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub Control Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs">
            {/* Report Format Mode Tabs */}
            <div className="flex items-center bg-[#142347] border border-white/10 rounded-lg p-0.5">
              <button
                onClick={() => setMode('combined')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  mode === 'combined'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isAr ? '📑 الملف المدمج الشامل' : isFr ? 'Dossier Unifié Complet' : 'Unified Master Dossier'}</span>
              </button>

              <button
                onClick={() => setMode('legacy')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  mode === 'legacy'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>{isAr ? '📜 تقرير التطبيق القديم المفصّل (7 أقسام)' : isFr ? 'Rapport Détaillé (7 Sections)' : 'Legacy Master Report'}</span>
              </button>

              <button
                onClick={() => setMode('modern')}
                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  mode === 'modern'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>{isAr ? '🚀 استشراف 2030 والذكاء الاصطناعي' : isFr ? 'Prospective 2030 & IA' : 'Sovereign Foresight 2030'}</span>
              </button>
            </div>

            {/* Scope, Wilaya, Case & Horizon Options */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-medium">{isAr ? 'النطاق:' : isFr ? 'Portée :' : 'Scope:'}</span>
                <select
                  value={scope}
                  onChange={(e) => setScope(e.target.value as ReportScope)}
                  className="bg-[#142347] border border-white/15 text-slate-200 rounded px-2 py-1 outline-none focus:border-sky-500 cursor-pointer text-xs"
                >
                  <option value="wilaya">{isAr ? '📍 ولاية واحدة' : isFr ? 'Une Wilaya' : 'Single Wilaya'}</option>
                  <option value="compare">{isAr ? '⚖️ مقارنة ولايات' : isFr ? 'Comparer Wilayas' : 'Compare Wilayas'}</option>
                  <option value="case">{isAr ? '🎯 حالة موضوعاتية' : isFr ? 'Cas Thématique' : 'Thematic Case'}</option>
                  <option value="national">{isAr ? `🇩🇿 توليف وطني شامل (${wilayas.length})` : isFr ? `Synthèse Nationale (${wilayas.length})` : `National (${wilayas.length} Wilayas)`}</option>
                </select>
              </div>

              {scope === 'wilaya' && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-medium">{isAr ? 'الولاية:' : 'Wilaya:'}</span>
                  <select
                    value={activeWilaya.num}
                    onChange={(e) => {
                      const found = wilayas.find(w => w.num === Number(e.target.value));
                      if (found) setActiveWilaya(found);
                    }}
                    className="bg-[#142347] border border-white/15 text-slate-200 rounded px-2 py-1 outline-none focus:border-sky-500 cursor-pointer text-xs max-w-[150px]"
                  >
                    {wilayas.map(w => (
                      <option key={w.num} value={w.num}>
                        {w.num}. {isAr ? w.n : w.en}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {scope === 'case' && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-medium">{isAr ? 'الحالة:' : isFr ? 'Cas :' : 'Case:'}</span>
                  <select
                    value={thematicCase}
                    onChange={(e) => setThematicCase(e.target.value as ThematicCaseKey)}
                    className="bg-[#142347] border border-white/15 text-slate-200 rounded px-2 py-1 outline-none focus:border-sky-500 cursor-pointer text-xs"
                  >
                    <option value="water">{isAr ? '💧 أزمة مياه وعجز مائي' : isFr ? 'Crise Hydrique' : 'Water Crisis'}</option>
                    <option value="drought">{isAr ? '🌾 جفاف فلاحي ومحاصيل' : isFr ? 'Sécheresse Agricole' : 'Crop Drought'}</option>
                    <option value="urban">{isAr ? '🏙️ توسع عمراني وضغط' : isFr ? 'Pression Urbaine' : 'Urban Expansion'}</option>
                    <option value="retail">{isAr ? '🛒 فجوة تجارية وتموينية' : isFr ? 'Déficit Commercial' : 'Retail Gap'}</option>
                    <option value="flood">{isAr ? '🌊 فيضانات ومضاربة عقار' : isFr ? 'Inondations & Foncier' : 'Floods & Speculation'}</option>
                    <option value="industry">{isAr ? '🏭 جاهزية صناعية واستثمار' : isFr ? 'Potentiel Industriel' : 'Industry Readiness'}</option>
                    <option value="health">{isAr ? '🏥 الصحة والمستشفيات' : isFr ? 'Santé & Hôpitaux' : 'Healthcare & Hospitals'}</option>
                    <option value="hazards">{isAr ? '🌋 الأخطار الطبيعية' : isFr ? 'Risques Naturels' : 'Natural Hazards'}</option>
                    <option value="transport">{isAr ? '🚆 النقل والسكك SNTF' : isFr ? 'Transport & Rail SNTF' : 'Transport & SNTF Rail'}</option>
                    <option value="anomaly">{isAr ? '⚠️ شذوذات إحصائية بالذكاء' : isFr ? 'Anomalies IA' : 'AI Anomalies'}</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-medium">{isAr ? 'الأفق:' : isFr ? 'Horizon :' : 'Horizon:'}</span>
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
                  className="bg-[#142347] border border-white/15 text-slate-200 rounded px-2 py-1 outline-none focus:border-sky-500 cursor-pointer text-xs"
                >
                  {[2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Multi-Wilaya Selection Strip (when in compare mode - supports all wilayas) */}
          {scope === 'compare' && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-white/10 text-xs overflow-x-auto pb-1">
              <span className="text-amber-400 font-semibold me-1 shrink-0">
                {isAr ? `حدد حتى 6 ولايات (${compareWilayas.length}/6):` : `Compare up to 6 (${compareWilayas.length}/6):`}
              </span>
              {wilayas.map(w => {
                const isSelected = compareWilayas.some(cw => cw.num === w.num);
                return (
                  <button
                    key={w.num}
                    type="button"
                    onClick={() => handleToggleCompareWilaya(w)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer border shrink-0 ${
                      isSelected
                        ? 'bg-sky-600/30 border-sky-400 text-sky-200'
                        : 'bg-[#142347] border-white/10 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {isSelected && '✓ '}
                    {w.num}. {isAr ? w.n : w.en}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Iframe Sandbox Preview */}
        <div className="flex-1 bg-white p-1 overflow-hidden relative">
          <iframe
            key={`${mode}-${scope}-${activeWilaya.num}-${targetYear}-${reportLang}-${refreshTick}`}
            ref={iframeRef}
            title="Strategic Report Live Preview"
            srcDoc={reportHtml}
            className="w-full h-full border-0 rounded bg-white shadow-inner"
          />
        </div>
      </div>
    </div>
  );
};
