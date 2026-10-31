// ===== gis_map — AI Agent Team =====
// © 2026 Copyright salim-slimani
// Each agent is a specialist persona (map analysis / crisis / foresight).
// Works offline with the built-in expert engine; optionally calls live
// models via OpenRouter when a key is provided (key stays in localStorage).
// NOTE: plain string concatenation only (no template literals) for maximum
// compatibility with strict proxies / older engines.

var AI_AGENTS = [
  {id:'spark', name:'Muse Spark', version:'1.3', icon:'⚡', color:'#F59E0B',
   role:'Map Analyst', specialty:'Spatial diagnosis — reads every layer on the map and pinpoints WHERE and WHY.',
   liveModel:'google/gemini-flash-1.5',
   system:'You are Muse Spark, a GIS map-analysis specialist for Algeria. Diagnose the wilaya from its spatial indicators and say WHERE the problem is and WHY it is there.'},
  {id:'gemini', name:'Gemini', version:'3 Flash', icon:'✨', color:'#0EA5E9',
   role:'Crisis Manager', specialty:'Rapid triage — what burns first, what to do in the next 72 hours.',
   liveModel:'google/gemini-flash-1.5',
   system:'You are Gemini Flash, a crisis-management agent for Algeria. Triage fast: rank threats, give 72-hour actions, keep it short.'},
  {id:'gpt', name:'ChatGPT', version:'GPT', icon:'🤖', color:'#10B981',
   role:'Foresight Strategist', specialty:'Scenarios to 2030 — optimistic / baseline / pessimistic futures.',
   liveModel:'openai/gpt-4o-mini',
   system:'You are ChatGPT, a foresight strategist for Algeria. Build optimistic, baseline and pessimistic scenarios to the target year with early warnings.'},
  {id:'qwen', name:'Qwen', version:'Max', icon:'🌊', color:'#38BDF8',
   role:'Water & Agri Expert', specialty:'Water budgets, irrigation and crop suitability.',
   liveModel:'qwen/qwen-2.5-72b-instruct',
   system:'You are Qwen, a water and agriculture expert for Algeria. Focus on water balance, irrigation efficiency and which crop fits the soil and rainfall.'},
  {id:'deepseek', name:'DeepSeek', version:'R1', icon:'🧠', color:'#A78BFA',
   role:'Deep Reasoner', specialty:'Root causes with numbers — no symptom-chasing.',
   liveModel:'deepseek/deepseek-chat',
   system:'You are DeepSeek, a root-cause analyst for Algeria. Show your reasoning step by step with the numbers, then give the single highest-leverage intervention.'},
  {id:'claude', name:'Claude', version:'Sonnet', icon:'📜', color:'#F472B6',
   role:'Risk & Policy Advisor', specialty:'Governance brief — who decides what, which regulation unlocks the fix.',
   liveModel:'anthropic/claude-3.5-sonnet',
   system:'You are Claude, a risk-governance advisor for Algeria. Write a short policy brief: decision, owner, legal lever, and what to stop doing.'},
  {id:'grok', name:'Grok', version:'2', icon:'📡', color:'#EAB308',
   role:'Anomaly Watch', specialty:'Live anomaly radar — what looks abnormal right now.',
   liveModel:'x-ai/grok-beta',
   system:'You are Grok, an anomaly-watch agent for Algeria. Flag anything abnormal in the indicators and say whether it is an opportunity or a threat.'}
];

var activeAgentId = 'spark';

function agentById(id){ return AI_AGENTS.find(function(a){ return a.id === id; }); }

// ---- shared context (reuses the GIS+AI engine in app.js) ----
function agentContext(w){
  return {
    name: displayName(w), year: targetYear,
    water: predictWater(w, targetYear), drought: cropRisk(w, targetYear),
    urban: urbanGrowth(w, targetYear), industry: industryScore(w),
    gap: coverageGap(w), floodPct: Math.round(w.flood * 100),
    anom: anomaly(w), crop: suitabilityAgri(w),
    pop: w.pop, price: w.price, soil: w.soil, rain: w.rain, ndvi: w.ndvi,
    dams: w.dams, wells: w.wells, markets: w.markets, coverage: w.coverage,
    energy: w.energy, roads: w.roads, labor: w.labor
  };
}
function riskLevel(c){
  var s = (c.water < -25 ? 2 : c.water < -10 ? 1 : 0) + (c.floodPct > 40 ? 2 : c.floodPct > 25 ? 1 : 0)
    + (c.drought > 60 ? 2 : c.drought > 45 ? 1 : 0) + (c.gap > 30 ? 1 : 0);
  return s >= 5 ? '🔴 CRITICAL' : s >= 3 ? '🟠 HIGH' : s >= 1 ? '🟡 WATCH' : '🟢 STABLE';
}

// ---- offline expert engine: one distinctive voice per agent ----
function localAgentAnalysis(agent, w){
  var c = agentContext(w);
  var L = [];
  L.push('<div class="a-head" style="border-color:' + agent.color + '"><span class="a-icon">' + agent.icon + '</span><div><b>' + agent.name + ' ' + agent.version + '</b> · ' + agent.role + '<br><small>' + riskLevel(c) + ' — ' + c.name + ' → ' + c.year + '</small></div></div>');
  if(agent.id === 'spark'){
    L.push('<b>Spatial read:</b> deficit <b>' + c.water + '</b>, flood <b>' + c.floodPct + '%</b>, NDVI <b>' + c.ndvi + '</b>, coverage gap <b>' + c.gap + '%</b>, industry score <b>' + c.industry + '/100</b>.<br><b>Where:</b> ' + (c.floodPct > 35 ? 'flood beds — freeze construction there; grow on safe plateaus.' : 'current footprint is buildable — densify before sprawling.') + ' <b>Why:</b> ' + (c.anom ? c.anom.toLowerCase() + '.' : 'indicators are internally consistent.'));
  } else if(agent.id === 'gemini'){
    var t = [];
    if(c.water < -25) t.push('water deficit');
    if(c.floodPct > 40) t.push('flood exposure');
    if(c.drought > 60) t.push('crop failure risk');
    if(c.gap > 30) t.push('retail gap');
    L.push('<b>72-hour triage:</b> ' + (t.length ? t.join(' + ') : 'no burning platform — run drills, not rescues') + '.<br>1) ' + (c.water < -20 ? 'Cap well extraction + tanker plan for the driest communes.' : 'Audit wells vs recharge.') + '<br>2) ' + (c.floodPct > 35 ? 'Clear wadi beds + pre-position pumps before the next storm.' : 'Update the flood-exposure parcel map.') + '<br>3) ' + (c.gap > 25 ? 'Mobile markets to the worst-covered villages this week.' : 'Restock strategic depots.'));
  } else if(agent.id === 'gpt'){
    L.push('<b>Scenarios → ' + c.year + ':</b><br>🌱 <b>Optimistic:</b> managed drilling + ' + c.crop.toLowerCase() + ' hold the line; growth +' + c.urban + '% absorbed in planned districts.<br>➖ <b>Baseline:</b> deficit drifts to <b>' + c.water + '</b>, drought <b>' + c.drought + '%</b> — coping, not solving.<br>🔥 <b>Pessimistic:</b> back-to-back dry years × price spike → informal sprawl into risk zones.<br><b>Early warnings to watch:</b> well levels, NDVI curve, land-price slope.');
  } else if(agent.id === 'qwen'){
    L.push('<b>Water budget:</b> forecast <b>' + c.water + '</b> (' + c.dams + ' dams, ' + c.wells + ' wells, ' + c.rain + ' mm rain). ' + (c.water < -20 ? 'Demand outruns recharge — drip irrigation + drought-tolerant varieties are mandatory, not optional.' : 'Balance is workable if irrigation efficiency rises.') + '<br><b>Crop call:</b> ' + c.crop + '. Drought risk <b>' + c.drought + '%</b> by ' + c.year + '.');
  } else if(agent.id === 'deepseek'){
    var bottleneck = c.water < -20 ? 'water is the binding constraint' : 'power/roads are the constraint, not demand';
    var fix = c.water < -20 ? 'one managed aquifer + metered irrigation' : ('one missing link — ' + (c.roads < 75 ? 'roads' : c.energy < 70 ? 'power' : 'market depots'));
    L.push('<b>Reasoning:</b> 1) water ' + c.water + ' ← pop ' + c.pop + 'k × demand growth + rainfall decline; 2) industry ' + c.industry + ' ← ' + bottleneck + '; 3) retail gap ' + c.gap + '% ← markets (' + c.markets + ') lag population.<br><b>Highest-leverage fix:</b> ' + fix + ' unlocks the rest.');
  } else if(agent.id === 'claude'){
    L.push('<b>Policy brief:</b><br>• <b>Decision:</b> ' + (c.floodPct > 35 ? 'no-build overlay on flood beds' : 'fast-track titles for idle land') + '. <b>Owner:</b> wali + APC. <b>Lever:</b> land-use enforcement + digital cadastre.<br>• <b>Stop doing:</b> ' + (c.wells > 900 ? 'unmetered drilling' : 'subsidizing sprawl without services') + '.<br>• <b>Fund first:</b> ' + (c.water < -20 ? 'water security' : 'market/logistics coverage') + '.');
  } else if(agent.id === 'grok'){
    L.push('<b>Radar:</b> ' + (c.anom ? '⚠️ ' + c.anom : 'no strong anomaly — all signals within band') + '.<br>Signal check: NDVI <b>' + c.ndvi + '</b> vs rain ' + c.rain + 'mm ' + (c.ndvi < 0.25 && c.rain > 300 ? '— divergence worth a field visit ' : '') + '• price ' + c.price.toLocaleString() + ' DZD/m² ' + (c.price > 120000 ? '— hot, watch speculation' : '') + '.');
  }
  L.push('<div class="a-foot">Offline expert engine • connect a key below for live ' + agent.name + ' calls</div>');
  return L.join('');
}

function councilAnalysis(w){
  var c = agentContext(w);
  var votes = [
    {t: 'Secure water (forecast ' + c.water + ')', s: (c.water < -10 ? 3 : 1) + (c.wells > 800 ? 1 : 0)},
    {t: 'Freeze building in flood beds (' + c.floodPct + '%)', s: c.floodPct > 25 ? 3 : 0},
    {t: 'New market/depot (gap ' + c.gap + '%)', s: c.gap > 20 ? 2 : 0},
    {t: 'Shift to ' + c.crop.toLowerCase() + ' (drought ' + c.drought + '%)', s: c.drought > 45 ? 2 : 1},
    {t: 'Unlock industrial site (score ' + c.industry + ')', s: c.industry < 60 ? 1 : 0},
    {t: 'Plan district for +' + c.urban + '% growth', s: 2}
  ].sort(function(a, b){ return b.s - a.s; });
  var top3 = votes.slice(0, 3).map(function(v){ return '<li>' + v.t + '</li>'; }).join('');
  return '<div class="a-head" style="border-color:#10B981"><span class="a-icon">🏛️</span><div><b>Agent Council</b> · 7 specialists, 1 consensus<br><small>' + riskLevel(c) + ' — ' + c.name + ' → ' + c.year + '</small></div></div>'
    + '<b>Consensus priorities:</b><ol>' + top3 + '</ol>'
    + '<b>Where agents disagree:</b> ' + (c.water < -20 ? 'speed of desalination vs demand control' : 'growth pace — plan firm, phase flexible') + '.'
    + '<div class="a-foot">Council = majority vote of agent priority weights</div>';
}

function nationalAgentBrief(){
  var byWater = WILAYAS.slice().sort(function(a, b){ return predictWater(a, targetYear) - predictWater(b, targetYear); });
  var byDrought = WILAYAS.slice().sort(function(a, b){ return cropRisk(b, targetYear) - cropRisk(a, targetYear); });
  return {worstWater: byWater[0], worstDrought: byDrought[0]};
}

// ---- live calls (OpenRouter, optional) ----
function orKey(){ try{ return (localStorage.getItem('gismap_or_key') || '').trim(); }catch(e){ return ''; } }
function liveAgentAnalysis(agent, placeLabel, ctxText){
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {'Authorization': 'Bearer ' + orKey(), 'Content-Type': 'application/json', 'HTTP-Referer': 'https://salim-studio.github.io/gis_map/', 'X-Title': 'gis_map'},
    body: JSON.stringify({model: agent.liveModel, messages: [
      {role: 'system', content: agent.system},
      {role: 'user', content: 'Place: ' + placeLabel + '. Indicators: ' + ctxText + '. Target year ' + targetYear + '. Answer in English, concise, structured.'}
    ]})
  }).then(function(res){
    if(!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(j){ return j.choices[0].message.content; });
}

// ---- UI ----
function ctxText_EN(w){
  var c = agentContext(w);
  return 'water deficit ' + c.water + ', drought ' + c.drought + '%, urban +' + c.urban + '%, industry ' + c.industry + '/100, retail gap ' + c.gap + '%, flood ' + c.floodPct + '%, soil ' + c.soil + ', rain ' + c.rain + 'mm, NDVI ' + c.ndvi + ', dams ' + c.dams + ', wells ' + c.wells + ', markets ' + c.markets + ', anomaly: ' + (c.anom || 'none');
}
function currentScopeWilaya(){
  var scopeEl = document.getElementById('agentScope');
  var scope = scopeEl ? scopeEl.value : 'national';
  if(scope === 'national') return null;
  return findWilaya(scope) || WILAYAS.find(function(x){ return x.en === 'Setif'; });
}
function refreshAgentScope(){
  var s = document.getElementById('agentScope'); if(!s) return;
  var cur = s.value || 'Setif';
  var opts = '<option value="national">National flashpoints</option>';
  var sorted = WILAYAS.slice().sort(function(a, b){ return (a.num == null ? 999 : a.num) - (b.num == null ? 999 : b.num); });
  sorted.forEach(function(w){
    opts += '<option value="' + w.en + '">' + (w.num <= 58 ? w.num + ' — ' : '') + displayName(w) + '</option>';
  });
  s.innerHTML = opts;
  s.value = (cur === 'wilaya' || cur === 'national') ? 'national' : cur;
  var ok = WILAYAS.some(function(w){ return w.en === s.value; });
  if(!ok) s.value = 'national';
}
function runAgent(council){
  council = !!council;
  var out = document.getElementById('agentOutput'); if(!out) return;
  var w = currentScopeWilaya();
  var liveBox = document.getElementById('agentLive');
  var useLive = liveBox && liveBox.checked && orKey();
  out.innerHTML = '<div class="a-loading">Thinking…</div>';
  var done = function(html){ out.innerHTML = html; };
  var fail = function(e){
    var html = '<div class="a-error">Live call failed (' + e.message + ') — showing offline analysis instead.</div>';
    if(w) html += localAgentAnalysis(agentById(activeAgentId), w);
    done(html);
  };
  try{
    if(w){
      if(council){ done(councilAnalysis(w)); return; }
      var agent = agentById(activeAgentId);
      if(useLive){
        liveAgentAnalysis(agent, displayName(w), ctxText_EN(w)).then(function(txt){
          done('<div class="a-head" style="border-color:' + agent.color + '"><span class="a-icon">' + agent.icon + '</span><div><b>' + agent.name + ' ' + agent.version + ' (live)</b> · ' + agent.role + '<br><small>' + displayName(w) + ' → ' + targetYear + '</small></div></div><div class="a-live">' + txt.split('\n').join('<br>') + '</div>');
        }).catch(fail);
      } else done(localAgentAnalysis(agent, w));
    } else {
      var b = nationalAgentBrief();
      if(council){
        done('<div class="a-head" style="border-color:#10B981"><span class="a-icon">🏛️</span><div><b>Agent Council — national</b> → ' + targetYear + '</div></div>Top water priority: <b>' + displayName(b.worstWater) + '</b> (' + predictWater(b.worstWater, targetYear) + '). Top drought watch: <b>' + displayName(b.worstDrought) + '</b> (' + cropRisk(b.worstDrought, targetYear) + '%).<br>Pick a wilaya scope for the full per-agent playbook.');
        return;
      }
      var agent2 = agentById(activeAgentId);
      done(localAgentAnalysis(agent2, b.worstWater).split(displayName(b.worstWater)).join(displayName(b.worstWater) + ' <small>(national flashpoint)</small>'));
    }
  }catch(e){ fail(e); }
}
function renderAgentGrid(){
  var g = document.getElementById('agentGrid'); if(!g) return;
  var html = AI_AGENTS.map(function(a){
    return '<button class="agent-card' + (a.id === activeAgentId ? ' active' : '') + '" data-agent="' + a.id + '" style="--ac:' + a.color + '">'
      + '<span class="agent-icon">' + a.icon + '</span>'
      + '<b>' + a.name + ' <small>' + a.version + '</small></b>'
      + '<i>' + a.role + '</i><span>' + a.specialty + '</span>'
      + '</button>';
  }).join('');
  g.innerHTML = html;
  var btns = g.querySelectorAll('[data-agent]');
  btns.forEach(function(b){
    b.onclick = function(){ activeAgentId = b.getAttribute('data-agent'); renderAgentGrid(); runAgent(false); };
  });
}
function agentsReady(fn){ if(document.readyState === 'loading') window.addEventListener('DOMContentLoaded', fn); else fn(); }
window.initAgents = function(){
  if(window.__agentsDone) return true;
  try{
    refreshAgentScope();
    renderAgentGrid();
    try{
      var s = document.getElementById('agentScope');
      var w = currentScopeWilaya();
      if(s && w) s.value = w.en;
    }catch(e){}
    window.__agentsDone = true;
    return true;
  }catch(e){
    var o = document.getElementById('agentOutput');
    if(o) o.innerHTML = '<div class="a-error">Agents failed to start: ' + e.message + '</div>';
    return false;
  }
};
agentsReady(function(){
  window.initAgents();
  var k = document.getElementById('orKey'); if(k) k.value = orKey();
  var r = document.getElementById('agentRun'); if(r) r.onclick = function(){ runAgent(false); };
  var cc = document.getElementById('agentCouncil'); if(cc) cc.onclick = function(){ runAgent(true); };
  var sc = document.getElementById('agentScope'); if(sc) sc.onchange = function(){ runAgent(false); };
  if(k) k.onchange = function(){ try{ localStorage.setItem('gismap_or_key', k.value.trim()); }catch(e){} };
});
/*GISMAP_EOF:agents*/
