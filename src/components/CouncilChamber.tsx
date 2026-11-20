/**
 * GIS Map – AI Council Chamber Component
 * 12-Step Evidence Synthesis, Discrepancy Reconciliation, and Executive Roadmap
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState, useEffect } from 'react';
import { CouncilConsensusResult, WilayaRecord } from '../types';
import { conveneAiCouncil } from '../engines/council';
import { Landmark, Sparkles, AlertTriangle, CheckCircle, Scale, ShieldCheck, ArrowRight } from 'lucide-react';

interface CouncilChamberProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  targetYear: number;
  lang: 'ar' | 'en';
}

export const CouncilChamber: React.FC<CouncilChamberProps> = ({
  wilayas,
  selectedWilaya,
  targetYear,
  onSelectWilaya,
  lang
}) => {
  const isAr = lang === 'ar';

  const [councilResult, setCouncilResult] = useState<CouncilConsensusResult>(() =>
    conveneAiCouncil(selectedWilaya, wilayas, targetYear, lang)
  );
  const [isConvening, setIsConvening] = useState<boolean>(false);

  useEffect(() => {
    setCouncilResult(conveneAiCouncil(selectedWilaya, wilayas, targetYear, lang));
  }, [selectedWilaya, wilayas, targetYear, lang]);

  const handleConveneCouncil = () => {
    setIsConvening(true);
    setTimeout(() => {
      const result = conveneAiCouncil(selectedWilaya, wilayas, targetYear, lang);
      setCouncilResult(result);
      setIsConvening(false);
    }, 400);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Chamber Banner */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm mb-1">
              <Landmark className="w-4 h-4" />
              <span>{isAr ? 'مجلس الذكاء الاصطناعي والاستشراف الوطني (AI Council)' : 'National AI Council of Intelligence'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'تجميع الأدلة الرقمية، فض النزاعات التحليلية، وبناء التوافق' : 'Evidence Synthesis, Discrepancy Reconciliation & Consensus'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'لا يعتمد المجلس على التصويت العددي البسيط؛ بل يُرتب قوة الأدلة وفق: جودة البيانات > صحة المنهجية > دقة النموذج > اتساق التحليل المكاني > التفسير السياقي.'
                : 'Scientific consensus engine reconciling agent divergences through evidentiary hierarchy: Data Quality > Methodology > Accuracy > Spatial Coherence.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedWilaya.num}
              onChange={(e) => {
                const w = wilayas.find(x => x.num === Number(e.target.value));
                if (w) {
                  onSelectWilaya(w);
                  const result = conveneAiCouncil(w, wilayas, targetYear, lang);
                  setCouncilResult(result);
                }
              }}
              className="bg-[#121F3D] text-slate-200 border border-white/15 rounded-lg px-3 py-2 text-xs font-bold cursor-pointer"
            >
              {wilayas.map(w => (
                <option key={w.num} value={w.num}>
                  {w.num}. {isAr ? w.n : w.en}
                </option>
              ))}
            </select>

            <button
              onClick={handleConveneCouncil}
              disabled={isConvening}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isConvening ? (isAr ? 'جارٍ انعقاد المجلس…' : 'Synthesizing…') : (isAr ? '🏛️ انعقاد مجلس الذكاء الاصطناعي' : '🏛️ Convene Council')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Council Meta & Data Quality Audit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 block">{isAr ? 'النطاق والمستهدف' : 'Scope & Target'}</span>
          <b className="text-white text-sm mt-0.5 block">{councilResult.scope}</b>
          <span className="text-[11px] text-amber-400 mt-1 block">Horizon {councilResult.targetYear}</span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 block">{isAr ? 'تدقيق اكتمال البيانات' : 'Data Completeness'}</span>
          <b className="text-emerald-400 text-base font-mono mt-0.5 block">
            {councilResult.dataQualityAudit.completenessPct}%
          </b>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {councilResult.dataQualityAudit.sampleSize} {isAr ? 'ملاحظة تاريخية' : 'observations'}
          </span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 block">{isAr ? 'درجة موثوقية المصادر' : 'Source Reliability'}</span>
          <b className="text-sky-400 text-sm mt-0.5 block flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>{councilResult.dataQualityAudit.sourceReliability}</span>
          </b>
          <span className="text-[11px] text-slate-400 mt-1 block">ONS + ANRH + MSPRH + CRAAG + SNTF</span>
        </div>

        <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 shadow-lg">
          <span className="text-xs text-slate-400 block">{isAr ? 'الوكلاء المشاركون' : 'Participating Specialists'}</span>
          <b className="text-purple-400 text-base font-mono mt-0.5 block">7 / 7 Specialists</b>
          <span className="text-[11px] text-slate-400 mt-1 block">100% Quorum</span>
        </div>
      </div>

      {/* Consensus Priorities */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="border-b border-white/10 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">
              {isAr ? 'أولويات التوافق الاستراتيجي للمجلس (مرتبة حسب قوة الأدلة الحسابية)' : 'Evidence-Weighted Consensus Priorities'}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Ranked by Proof Weight</span>
        </div>

        <div className="space-y-3">
          {councilResult.consensusPriorities.map((item) => (
            <div
              key={item.rank}
              className="bg-[#121F3D] border border-white/5 rounded-xl p-4 hover:border-emerald-500/30 transition space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                    {item.rank}
                  </span>
                  <h3 className="font-bold text-sm text-white">
                    {isAr ? item.titleAr : item.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                    Weight: {item.weightScore}/100
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed ps-8">
                {item.rationale}
              </p>

              <div className="ps-8 flex items-center gap-2 text-[11px] text-slate-400">
                <span>{isAr ? 'الوكلاء الداعمون بالأدلة:' : 'Supporting Agents:'}</span>
                <span className="text-slate-200 font-medium">{item.supportingAgents.join(' · ')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discrepancies and Contradictions */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="font-bold text-sm text-white">
              {isAr ? 'تباينات آراء الوكلاء والتناقضات المرصودة مع تفسير أسبابها' : 'Discrepancy Analysis & Root-Cause Explanations'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isAr ? 'لا نخفي الاختلاف ولا نفرض توافقاً مصطنعاً؛ بل نوضح التباين في الأفق الزمني أو زاوية الاختصاص' : 'Transparent synthesis of structural trade-offs between short-term triage and long-term equilibrium.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {councilResult.divergencesAndTradeoffs.map((divItem, idx) => (
            <div key={idx} className="bg-[#121F3D] border border-amber-500/20 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-xs text-amber-300">
                {isAr ? divItem.topicAr : divItem.topic}
              </h3>

              <div className="space-y-2 text-xs">
                {divItem.contendingViews.map((v, i) => (
                  <div key={i} className="bg-[#091224] p-2.5 rounded-lg border border-white/5 space-y-0.5">
                    <span className="font-bold text-sky-400 text-[11px] block">{v.agent}:</span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">{v.perspective}</p>
                  </div>
                ))}
              </div>

              <div className="bg-amber-950/20 border border-amber-500/20 p-2.5 rounded-lg text-[11px] text-amber-200">
                <b>{isAr ? 'تفسير سبب التباين:' : 'Root Cause:'}</b> {divItem.rootCause}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strategic Executive Roadmap */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="border-b border-white/10 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="font-bold text-sm text-white">
              {isAr ? 'خطة العمل التنفيذية الموحدة للمجلس (Executive Action Roadmap)' : 'Executive Action Plan & Institutional Owners'}
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-left rtl:text-right font-semibold">
                <th className="py-2.5 px-3">{isAr ? 'الإجراء الاستراتيجي' : 'Action'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الجهة المسؤولة والمشرفة' : 'Institutional Lead Owner'}</th>
                <th className="py-2.5 px-3">{isAr ? 'الأفق الزمني' : 'Timeframe'}</th>
                <th className="py-2.5 px-3">{isAr ? 'العائد الوقائي / التكلفة' : 'Cost-Benefit Ratio'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {councilResult.executiveRoadmap.map((r, i) => (
                <tr key={i} className="hover:bg-white/5 transition">
                  <td className="py-3 px-3 font-bold text-white">
                    {isAr ? r.actionAr : r.action}
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    {r.leadOwner}
                  </td>
                  <td className="py-3 px-3">
                    <span className="bg-white/10 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                      {r.timeframe}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-emerald-400 font-bold">
                    {r.costBenefitRatio}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
