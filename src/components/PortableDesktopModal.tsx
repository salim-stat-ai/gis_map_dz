/**
 * GIS Map – Portable Desktop Edition Modal
 * One-click download of standalone single-file HTML, full Windows/Mac/Linux Portable ZIP, and PWA Desktop Install
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState } from 'react';
import { Monitor, Download, FileCode2, Package, CheckCircle2, X, Laptop, HardDrive, Loader2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PortableDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const PortableDesktopModal: React.FC<PortableDesktopModalProps> = ({
  isOpen,
  onClose,
  lang
}) => {
  const isAr = lang === 'ar';
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [downloading, setDownloading] = useState<'zip' | 'html' | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerDownload = async (kind: 'zip' | 'html') => {
    setDownloading(kind);
    setStatusMsg(null);
    const url = kind === 'zip' ? '/api/desktop/portable-zip' : '/api/desktop/portable-html';
    const filename =
      kind === 'zip'
        ? 'GIS-Map-Algeria-Desktop-Portable.zip'
        : 'GIS-Map-Algeria-2030-Portable.html';

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);

      setStatusMsg(
        isAr
          ? `✅ تم تنزيل (${filename}) بنجاح! يمكنك تشغيلها مباشرة دون تثبيت.`
          : `✅ Downloaded (${filename})! Ready to run offline without installation.`
      );
    } catch {
      setStatusMsg(
        isAr
          ? '⚠️ تعذر التنزيل من الخادم المحلي في وضع الملف المفرد. استخدم هذا الوضع مباشرة أو شغّل الخادم المحلي.'
          : '⚠️ Download endpoint unavailable when running purely from a local file.'
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B152B] border border-emerald-500/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-[#081020]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white">
                {isAr ? 'نسخة سطح المكتب المحمولة (Portable Desktop)' : 'Portable Desktop Edition'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isAr
                  ? 'تشغيل مباشر على Windows / macOS / Linux بدون تنصيب ومن فلاش USB'
                  : 'Zero-install desktop execution on Windows, macOS & Linux — runs directly from USB or Desktop'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Option 1: Complete Portable Desktop Package (.ZIP) */}
          <div className="bg-[#101D38] border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-300">
                  <Package className="w-4 h-4" />
                  <span>
                    {isAr ? '1. حزمة سطح المكتب البورتابل الكاملة (.ZIP)' : '1. Full Portable Desktop Kit (.ZIP)'}
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
                    {isAr ? 'موصى به' : 'Recommended'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? 'تضم ملف التطبيق الكامل مدمجاً مع مشغّل نافذة سطح المكتب لنظام Windows (.bat) وmacOS (.command) وLinux (.sh) يفتح البرنامج كنافذة مستقلة بدون أشرطة متصفح، بالإضافة لقالب Electron لبناء .exe عند الرغبة.'
                    : 'Includes the self-contained single-file app plus double-click OS desktop-window launchers (.bat / .command / .sh) that open it in a dedicated app window, plus Electron portable scripts.'}
                </p>
              </div>
              <button
                type="button"
                disabled={downloading !== null}
                onClick={() => triggerDownload('zip')}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer shrink-0"
              >
                {downloading === 'zip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isAr ? 'تحميل الحزمة (.ZIP)' : 'Download ZIP Kit'}</span>
              </button>
            </div>
          </div>

          {/* Option 2: Single-File HTML Portable */}
          <div className="bg-[#101D38] border border-sky-500/25 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-extrabold text-sky-300">
                  <FileCode2 className="w-4 h-4" />
                  <span>
                    {isAr ? '2. ملف واحد محمول يعمل فوراً بنقرتين (.HTML)' : '2. Single-File Portable App (.HTML)'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isAr
                    ? 'كامل المنصة (58 ولاية + 12 نموذجاً رياضياً + 7 وكلاء + التقارير + استيراد Excel/GeoJSON) مجمّع في ملف HTML واحد يعمل مباشرة على أي حاسوب أو مفتاح USB بدون إنترنت للحسابات ولا Node.js.'
                    : 'Entire platform (58 wilayas, 12 forecasting models, 7 AI agents, reports & Excel/GeoJSON import) bundled into ONE standalone HTML file.'}
                </p>
              </div>
              <button
                type="button"
                disabled={downloading !== null}
                onClick={() => triggerDownload('html')}
                className="flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-60 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer shrink-0"
              >
                {downloading === 'html' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isAr ? 'تحميل ملف واحد (.HTML)' : 'Download Single HTML'}</span>
              </button>
            </div>
          </div>

          {/* Option 3: Native Desktop App Install (PWA Standalone Window) */}
          <div className="bg-[#101D38] border border-white/10 rounded-xl p-4 space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
                  <Laptop className="w-4 h-4" />
                  <span>
                    {isAr ? '3. تثبيت فوري كبرنامج سطح مكتب (PWA Standalone)' : '3. Install as Desktop App Window (PWA)'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isInstalled
                    ? isAr
                      ? '✅ التطبيق يعمل حالياً في وضع برنامج سطح المكتب المستقل (Standalone).'
                      : '✅ Already running in standalone Desktop App mode.'
                    : isInstallable
                    ? isAr
                      ? 'اضغط الزر لتثبيت أيقونة التطبيق على سطح المكتب وقائمة ابدأ مع العمل دون اتصال.'
                      : 'Click Install to add GIS Map directly to your Desktop & Start Menu with offline caching.'
                    : isIOS
                    ? isAr
                      ? 'على iOS/iPadOS: اضغط زر المشاركة (Share) ثم «إضافة إلى الشاشة الرئيسية».'
                      : 'On iOS/iPadOS: tap Share then "Add to Home Screen".'
                    : isAr
                    ? 'من متصفح Chrome أو Edge: افتح القائمة ⋮ ← «التطبيقات» (Apps) ← «تثبيت هذا الموقع كتطبيق».'
                    : 'In Chrome or Edge: Menu ⋮ → Apps → "Install this site as an app" to create a Desktop shortcut.'}
                </p>
              </div>
              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={install}
                  className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-4 py-2.5 rounded-xl shadow transition cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isAr ? 'تثبيت على سطح المكتب' : 'Install Desktop App'}</span>
                </button>
              )}
            </div>
          </div>

          {statusMsg && (
            <div className="bg-[#091224] border border-emerald-500/30 text-emerald-200 text-xs px-3.5 py-2.5 rounded-xl">
              {statusMsg}
            </div>
          )}

          {/* Portable Guarantees */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px] text-slate-300 pt-1">
            <div className="bg-[#081020] border border-white/5 rounded-lg p-2.5 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{isAr ? 'يعمل من فلاش USB مباشرة' : 'Runs straight from USB drive'}</span>
            </div>
            <div className="bg-[#081020] border border-white/5 rounded-lg p-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>{isAr ? 'جميع النماذج حسابية محلياً 100%' : '100% local calculation engines'}</span>
            </div>
            <div className="bg-[#081020] border border-white/5 rounded-lg p-2.5 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{isAr ? 'يدعم الطباعة والتصدير وExcel' : 'Full Excel, CSV & print export'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
