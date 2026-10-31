/**
 * GIS Map – 7 AI Agents Team Component
 * Specialist Agent Personas Grounded in Quantitative Models
 * © 2026 Salim Slimani & National Foresight System
 */

import React, { useState } from 'react';
import { AgentAnalysisOutput, WilayaRecord } from '../types';
import { AI_AGENT_PROFILES, runAgentAnalysis } from '../engines/agents';
import { Bot, Play, Sparkles, Key, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AgentsCenterProps {
  wilayas: WilayaRecord[];
  selectedWilaya: WilayaRecord;
  onSelectWilaya: (w: WilayaRecord) => void;
  targetYear: number;
  lang: 'ar' | 'en';
}

export const AgentsCenter: React.FC<AgentsCenterProps> = ({
  wilayas,
  selectedWilaya,
  targetYear,
  onSelectWilaya,
  lang
}) => {
  const isAr = lang === 'ar';

  const [activeAgentId, setActiveAgentId] = useState<string>('spark');
  const [analysisOutput, setAnalysisOutput] = useState<AgentAnalysisOutput | null>(() =>
    runAgentAnalysis('spark', selectedWilaya, wilayas, targetYear, lang)
  );
  const [isLiveEnabled, setIsLiveEnabled] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('gismap_or_key') || '';
    } catch {
      return '';
    }
  });

  const handleAskAgent = (agentId: string = activeAgentId) => {
    setActiveAgentId(agentId);
    const result = runAgentAnalysis(agentId, selectedWilaya, wilayas, targetYear, lang);
    setAnalysisOutput(result);
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem('gismap_or_key', key.trim());
    } catch {}
  };

  const activeAgent = AI_AGENT_PROFILES.find(a => a.id === activeAgentId) || AI_AGENT_PROFILES[0];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-400 font-extrabold text-sm mb-1">
              <Bot className="w-4 h-4" />
              <span>{isAr ? 'فريق وكلاء الذكاء الاصطناعي المتخصصين (7 Agents)' : 'Specialist AI Agents Multi-Agent Team'}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-['Sora']">
              {isAr ? 'استخبارات جغرافية واقتصادية مبنية على محركات حسابية' : 'Quantitative-Grounded Multi-Disciplinary Agents'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              {isAr
                ? 'سبعة وكلاء متخصصين يربطون بين الذكاء المكاني، الاستشراف، الميزان المائي، الاقتصاد القياسي، وصناعة السياسات بالأدلة الرقمية.'
                : 'Seven personas executing spatial autocorrelation, crisis triage, hydrological budgets, econometric regressions, and PESTEL policy briefs.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedWilaya.num}
              onChange={(e) => {
                const w = wilayas.find(x => x.num === Number(e.target.value));
                if (w) {
                  onSelectWilaya(w);
                  const result = runAgentAnalysis(activeAgentId, w, wilayas, targetYear, lang);
                  setAnalysisOutput(result);
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
          </div>
        </div>
      </div>

      {/* Agents Roster Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {AI_AGENT_PROFILES.map((agent) => {
          const isSelected = activeAgentId === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => handleAskAgent(agent.id)}
              className={`text-left rtl:text-right p-3.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#142347] border-emerald-400 shadow-lg -translate-y-1'
                  : 'bg-[#0D172E] border-white/10 hover:border-white/20 hover:bg-[#111F3E]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{agent.icon}</span>
                  <span className="text-[10px] font-mono text-slate-400">{agent.version}</span>
                </div>
                <div className="font-extrabold text-xs text-white mt-2">{agent.name}</div>
                <div className="text-[11px] font-semibold text-slate-300 mt-0.5">
                  {isAr ? agent.roleAr : agent.role}
                </div>
              </div>
              <div className="mt-3 text-[10px] text-slate-400 line-clamp-2">
                {isAr ? agent.specialtyAr : agent.specialty}
              </div>
            </button>
          );
        })}
      </div>

      {/* Agent Output Terminal */}
      {analysisOutput && (
        <div className="bg-[#0D172E] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-5">
          {/* Agent Header Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl p-2 rounded-xl bg-white/5 border border-white/10">
                {activeAgent.icon}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base text-white">{analysisOutput.agentName}</h2>
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-slate-300">
                    {analysisOutput.role}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {isAr ? `نطاق التحليل: ولاية ${analysisOutput.wilaya} — أفق ${analysisOutput.targetYear}` : `Scope: ${analysisOutput.wilaya} Wilaya — Horizon ${analysisOutput.targetYear}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                  analysisOutput.riskRating === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : analysisOutput.riskRating === 'HIGH'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : analysisOutput.riskRating === 'WATCH'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {analysisOutput.riskRating}
              </span>

              <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Evidence: {analysisOutput.evidenceQualityScore}%</span>
              </div>
            </div>
          </div>

          {/* Mathematical Tool Used */}
          <div className="bg-[#101D38] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {isAr ? 'الأداة الحسابية المعتمدة:' : 'Primary Mathematical Foundation:'}
            </span>
            <b className="text-sky-300 font-mono">{activeAgent.primaryMathematicalTool}</b>
          </div>

          {/* Quantitative Calculations Cards */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 mb-2">
              {isAr ? 'المخرجات الحسابية المستخلصة من النماذج:' : 'Extracted Quantitative Indicators:'}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {Object.entries(analysisOutput.quantitativeCalculations).map(([k, v]) => (
                <div key={k} className="bg-[#121F3D] p-2.5 rounded-xl border border-white/5 text-center">
                  <span className="text-[10px] text-slate-400 block truncate">{k}</span>
                  <b className="text-emerald-400 font-mono text-sm mt-0.5 block">{String(v)}</b>
                </div>
              ))}
            </div>
          </div>

          {/* Mathematical Findings Bullet Points */}
          <div className="bg-[#121F3D] p-4 rounded-xl border border-white/5 space-y-2">
            <h3 className="font-bold text-xs text-slate-200">
              {isAr ? 'نتائج الاستدلال الإحصائي:' : 'Statistical Findings & Evidence:'}
            </h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {analysisOutput.mathematicalFindings.map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Spatial & Strategic Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#101D38] p-4 rounded-xl border border-white/5 space-y-1.5">
              <h3 className="font-bold text-xs text-sky-400">
                {isAr ? 'التشخيص الجغرافي والمكاني:' : 'Spatial & Territorial Diagnosis:'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {analysisOutput.spatialDiagnosis}
              </p>
            </div>

            <div className="bg-[#101D38] p-4 rounded-xl border border-white/5 space-y-1.5">
              <h3 className="font-bold text-xs text-emerald-400">
                {isAr ? 'التوصيات الاستراتيجية ذات الأولوية:' : 'Strategic Priority Interventions:'}
              </h3>
              <ul className="space-y-1 text-xs text-slate-300">
                {analysisOutput.strategicRecommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Optional Live Key Settings */}
      <div className="bg-[#0D172E] border border-white/10 rounded-xl p-4 text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={isLiveEnabled}
              onChange={(e) => setIsLiveEnabled(e.target.checked)}
              className="accent-emerald-500 rounded"
            />
            <span>{isAr ? 'تفعيل الاتصال المباشر بالنماذج اللغوية (OpenRouter / Gemini Live)' : 'Enable Live Model Calls (OpenRouter / Gemini Live)'}</span>
          </label>

          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Key className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="password"
              placeholder={isAr ? 'مفتاح OpenRouter API (اختياري، محفوظ محلياً في متصفحك)' : 'OpenRouter API Key (optional, stored locally)'}
              value={apiKey}
              onChange={(e) => handleSaveApiKey(e.target.value)}
              className="w-full bg-[#101D38] text-slate-200 border border-white/10 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
