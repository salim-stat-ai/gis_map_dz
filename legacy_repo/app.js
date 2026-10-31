// ===== gis_map — GIS + AI engine (English) =====
// © 2026 Copyright salim-slimani
// Map init is guarded: if the Leaflet CDN is blocked, indicators, agents
// and import keep working and a banner explains the map outage.
let map = null;
try{
  if(window.L){
    map = L.map('map').setView([28.5, 2.5], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap contributors'}).addTo(map);
  }
}catch(e){ map = null; }

let markers = {};
let activeLayers = new Set(['realestate','agri','water','commerce','industry']);
let targetYear = 2030;
let charts = {};

// --- AI models (lightweight, trainable placeholders) ---
function predictWater(w, year){
  const h = year - 2026;
  const demandGrowth = w.pop * 0.035 * h;   // 3.5%/yr demand
  const climateLoss = w.rain * 0.012 * h;   // -1.2%/yr rainfall
  return Math.round(w.waterDef*10 - demandGrowth*0.15 - climateLoss*0.2);
}
function cropRisk(w, year){
  const h = year - 2026;
  let r = 100 - (w.soil*0.5 + w.rain*0.06 + w.ndvi*60);
  r += h*2.1;
  if(w.rain<200) r+=18;
  return Math.max(2, Math.min(98, Math.round(r)));
}
function urbanGrowth(w, year){
  const h = year - 2026;
  return Math.round((w.pop/100) * (w.price/50000) * h * 0.8 + h*1.5);
}
function industryScore(w){
  return Math.round((w.energy*0.3 + w.roads*0.3 + w.labor*0.2 + (100-w.waterDef*-1)*0.2));
}
function anomaly(w){
  const expected = w.pop/40;
  const diff = expected - w.markets;
  if(diff>15) return `Severe market shortage (${Math.round(diff)} markets missing) — opportunity for a new market`;
  if(w.waterDef<-30 && w.wells>900) return `Critical groundwater depletion — extraction exceeds recharge`;
  if(w.flood>0.4 && w.price>90000) return `High property prices inside a flood zone — speculation risk`;
  if(w.ndvi<0.2 && w.soil>35) return `Low NDVI despite fair soil — under-use or irrigation gap`;
  if(w.industry<50 && w.energy>70) return `Empty industrial zone despite power access — one missing factor (water/road)`;
  return null;
}
function suitabilityAgri(w){
  if(w.soil>75 && w.rain>350) return "Excellent for cereals";
  if(w.soil>55 && w.rain>500) return "Ideal for fruit trees";
  if(w.rain<150) return "Fit for Saharan farming + smart irrigation/desalination";
  return "Mixed farming + soil improvement";
}
function recommend(w){
  const recs=[];
  const pw = predictWater(w,targetYear);
  if(pw<-25) recs.push(`🚨 Forecast water deficit ${pw}: priority for desalination / managed drilling + irrigation control`);
  if(w.flood>0.35) recs.push(`⛔ Freeze construction in wadi beds — steer growth to safe plateaus`);
  if(w.price>120000) recs.push(`🏠 Detect idle land from satellite + digitize titles to cool prices`);
  if(coverageGap(w)>25) recs.push(`🛒 Open a new market/depot — coverage gap ${coverageGap(w)}%`);
  recs.push(`🌾 ${suitabilityAgri(w)} — drought risk ${cropRisk(w,targetYear)}% in ${targetYear}`);
  const ind = industryScore(w);
  if(ind>70) recs.push(`🏭 Excellent industrial site (${ind}/100) — water+power+road available`);
  else recs.push(`🏭 Average site (${ind}/100) — missing: ${w.waterDef<-20?'water ':''}${w.roads<75?'road ':''}${w.energy<70?'power':''}`);
  recs.push(`🏙️ Expected urban growth +${urbanGrowth(w,targetYear)}% by ${targetYear} — plan the new district now`);
  return recs;
}
function coverageGap(w){ return Math.max(0, Math.round(100 - w.coverage)); }
function colorBySector(w, sector){
  if(sector==='water') return w.waterDef<-25?'#EF4444':w.waterDef<-10?'#F59E0B':'#10B981';
  if(sector==='agri') return w.ndvi>0.55?'#10B981':w.ndvi>0.32?'#EAB308':'#EF4444';
  if(sector==='realestate') return w.flood>0.4?'#EF4444':w.price>120000?'#F59E0B':'#10B981';
  if(sector==='commerce') return coverageGap(w)>35?'#EF4444':coverageGap(w)>15?'#F59E0B':'#10B981';
  if(sector==='industry') return industryScore(w)>70?'#10B981':industryScore(w)>55?'#F59E0B':'#EF4444';
  const risks=[w.waterDef<-20?1:0, w.flood>0.4?1:0, coverageGap(w)>30?1:0, cropRisk(w,2026)>60?1:0];
  const s=risks.reduce((a,b)=>a+b,0);
  return s>=2?'#EF4444':s===1?'#F59E0B':'#10B981';
}
function sizeBySector(w, sector){
  if(sector==='water') return 10+Math.abs(w.waterDef)*0.7;
  if(sector==='commerce') return 10+w.pop/120;
  if(sector==='realestate') return 10+w.price/12000;
  if(sector==='agri') return 10+w.ndvi*28;
  return 12+w.industry*0.25;
}
function currentSector(){ return document.getElementById('sectorSelect').value; }

function drawMap(){
  if(!map || !window.L){ updateLegend(); updateKPI(); updateDashboard(); return; }
  Object.values(markers).forEach(m=>map.removeLayer(m));
  markers={};
  const sector=currentSector()==='all'?'all':currentSector();
  WILAYAS.forEach(w=>{
    const showAnom=document.getElementById('aiAnomaly').checked;
    const c=colorBySector(w,sector);
    const r=sizeBySector(w,sector);
    const mk=L.circleMarker([w.lat,w.lon],{radius:Math.min(30,r),color:c,fillColor:c,fillOpacity:0.55,weight:2}).addTo(map);
    const an=anomaly(w);
    mk.bindPopup(`<b>${displayName(w)}</b><br>${sectorLabel(sector)}<br>${an&&showAnom?'🤖 '+an:recommend(w)[0]}`);
    mk.on('click',()=>selectWilaya(w.en));
    markers[w.en]=mk; markers[w.n]=mk;
  });
  updateLegend(); updateKPI(); updateDashboard();
}
function sectorLabel(s){
  return {all:'Overall assessment',realestate:'🏠 Real estate',agri:'🌾 Agriculture',water:'💧 Water',commerce:'🛒 Retail',industry:'🏭 Industry'}[s]||s;
}
function updateLegend(){
  const s=currentSector();
  document.getElementById('legend').innerHTML=`<b>${sectorLabel(s)} key (${targetYear})</b><br>
  <span style="background:#10B981">● Good / safe</span>
  <span style="background:#F59E0B">● Watch</span>
  <span style="background:#EF4444">● Priority risk</span><br>
  <small style="color:#9AA9C7">Circle size = indicator intensity • Enable AI for anomalies</small>`;
}
function updateKPI(){
  const avgWater=Math.round(WILAYAS.reduce((a,w)=>a+predictWater(w,targetYear),0)/WILAYAS.length);
  const thirst=WILAYAS.filter(w=>predictWater(w,targetYear)<-20).length;
  const drought=WILAYAS.filter(w=>cropRisk(w,targetYear)>60).length;
  const gap=WILAYAS.filter(w=>coverageGap(w)>30).length;
  document.getElementById('kpi').innerHTML=`
   <div class="kpi"><b>${avgWater}</b><small>Avg water deficit ${targetYear}</small></div>
   <div class="kpi"><b>${thirst}</b><small>Thirst-risk wilayas</small></div>
   <div class="kpi"><b>${drought}</b><small>Drought-risk wilayas</small></div>
   <div class="kpi"><b>${gap}</b><small>Retail-gap areas</small></div>`;
}
function updateDashboard(){
  document.getElementById('dashYear').textContent=targetYear;
  const byWater=[...WILAYAS].sort((a,b)=>predictWater(a,targetYear)-predictWater(b,targetYear)).slice(0,6);
  const byDrought=[...WILAYAS].sort((a,b)=>cropRisk(b,targetYear)-cropRisk(a,targetYear)).slice(0,6);
  const byUrban=[...WILAYAS].sort((a,b)=>urbanGrowth(b,targetYear)-urbanGrowth(a,targetYear)).slice(0,6);
  const anoms=WILAYAS.map(w=>({w,a:anomaly(w)})).filter(x=>x.a).slice(0,6);
  document.getElementById('thirstList').innerHTML=byWater.map(w=>`<li><b>${displayName(w)}</b> — deficit ${predictWater(w,targetYear)} (dams:${w.dams} wells:${w.wells})</li>`).join('');
  document.getElementById('droughtList').innerHTML=byDrought.map(w=>`<li><b>${displayName(w)}</b> — ${cropRisk(w,targetYear)}% — ${suitabilityAgri(w)}</li>`).join('');
  document.getElementById('urbanList').innerHTML=byUrban.map(w=>`<li><b>${displayName(w)}</b> — +${urbanGrowth(w,targetYear)}% — ${w.price.toLocaleString()} DZD/m²</li>`).join('');
  document.getElementById('anomalyList').innerHTML=(anoms.map(x=>`<li><b>${displayName(x.w)}</b>: ${x.a}</li>`).join('')||'<li>No major anomaly — stable</li>');
  const totalPop=WILAYAS.reduce((a,w)=>a+w.pop,0);
  document.getElementById('dashCards').innerHTML=`
   <div class="card"><b>💧 ${byWater[0].en}</b>Highest water deficit ${targetYear}</div>
   <div class="card"><b>🌾 ${byDrought[0].en}</b>Top drought risk ${cropRisk(byDrought[0],targetYear)}%</div>
   <div class="card"><b>🏙️ ${byUrban[0].en}</b>Fastest growth +${urbanGrowth(byUrban[0],targetYear)}%</div>
   <div class="card"><b>👥 ${totalPop.toLocaleString()}k</b>Population covered</div>`;
}
function findWilaya(key){ return WILAYAS.find(x=>x.en===key||x.n===key); }
function refreshWilayaOptions(){
  const s = document.getElementById('wilayaSelect'); if(!s) return;
  const cur = s.value;
  s.innerHTML = [...WILAYAS].sort((a,b)=>(a.num??999)-(b.num??999))
    .map(w=>`<option value="${w.en}">${w.num<=58?w.num+' — ':''}${displayName(w)}</option>`).join('');
  if([...WILAYAS].some(w=>w.en===cur)) s.value = cur;
}
function selectWilaya(name){
  const w=findWilaya(name); if(!w) return;
  document.getElementById('wName').textContent=`📍 ${displayName(w)}`;
  const ws=document.getElementById('wilayaSelect'); if(ws) ws.value=w.en;
  const sc=document.getElementById('agentScope'); if(sc && sc.value!=='national') sc.value=w.en;
  document.getElementById('wMeta').innerHTML=`
   Population: <b>${w.pop.toLocaleString()}k</b> • Price: <b>${w.price.toLocaleString()} DZD/m²</b> • Flood: <b>${Math.round(w.flood*100)}%</b><br>
   Soil: <b>${w.soil}/100</b> • Rainfall: <b>${w.rain} mm</b> • NDVI: <b>${w.ndvi}</b><br>
   Dams: <b>${w.dams}</b> • Wells: <b>${w.wells}</b> • Markets: <b>${w.markets}</b> • Coverage: <b>${w.coverage}%</b><br>
   Energy: <b>${w.energy}</b> • Roads: <b>${w.roads}</b> • Labor: <b>${w.labor}</b>`;
  const recs=recommend(w);
  document.getElementById('aiBox').innerHTML=`<b>🤖 AI diagnosis + ${targetYear} forecast:</b><br>• `+recs.join('<br>• ');
  document.getElementById('actions').innerHTML=`
   <button id="b1">🏠 Propose a safe new district</button>
   <button id="b2">💧 Locate drilling / desalination</button>
   <button id="b3">🛒 Propose a new market</button>`;
  document.getElementById('b1').onclick=()=>alert(`New district site shortlisted in ${w.en}: outside flood beds, near roads. ✅`);
  document.getElementById('b2').onclick=()=>alert(`Drilling/desalination site in ${w.en} — forecast deficit ${predictWater(w,targetYear)}. 💧`);
  document.getElementById('b3').onclick=()=>alert(`New market proposed covering a ${coverageGap(w)}% gap. 🛒`);
  drawCharts(w);
  try{ if(map) map.flyTo([w.lat,w.lon],7); }catch(e){}
}
function drawCharts(w){
  if(typeof Chart==='undefined') return;
  Object.values(charts).forEach(c=>c.destroy()); charts={};
  const years=[2026,2027,2028,2029,2030,2031,2032,2033,2034,2035];
  Chart.defaults.color='#D6E0F5';
  charts.w=new Chart(document.getElementById('chartWater'),{type:'line',
    data:{labels:years,datasets:[{label:`Water deficit — ${w.en}`,data:years.map(y=>predictWater(w,y)),borderColor:'#0EA5E9',backgroundColor:'rgba(14,165,233,.2)',fill:true}]},
    options:{plugins:{legend:{labels:{color:'#fff'}}},scales:{x:{ticks:{color:'#9AA9C7'}},y:{ticks:{color:'#9AA9C7'}}}}});
  charts.r=new Chart(document.getElementById('chartRadar'),{type:'radar',
    data:{labels:['Soil','Rain/10','NDVIx100','Energy','Roads','Coverage'],datasets:[{label:w.en,data:[w.soil,w.rain/10,w.ndvi*100,w.energy,w.roads,w.coverage],backgroundColor:'rgba(245,158,11,.25)',borderColor:'#F59E0B'}]},
    options:{plugins:{legend:{labels:{color:'#fff'}}},scales:{r:{ticks:{color:'#9AA9C7'},pointLabels:{color:'#fff'}}}}});
}

document.getElementById('sectorSelect').addEventListener('change',drawMap);
document.querySelectorAll('[data-layer]').forEach(cb=>cb.addEventListener('change',drawMap));
document.getElementById('aiAnomaly').addEventListener('change',drawMap);
document.getElementById('yearRange').addEventListener('input',e=>{
  targetYear=+e.target.value; document.getElementById('yearLabel').textContent=targetYear; drawMap();
});
document.getElementById('aiForecast').addEventListener('change',drawMap);
document.getElementById('searchBox').addEventListener('change',e=>{
  const q=e.target.value.trim().toLowerCase();
  const f=WILAYAS.find(w=>w.en.toLowerCase().includes(q)||w.n.includes(e.target.value.trim()));
  if(f) selectWilaya(f.en); else alert('Wilaya not in demo sample — try: Setif, Oran, Adrar');
});
document.getElementById('aiBtn').addEventListener('click',()=>{
  document.getElementById('aiDashboard').scrollIntoView({behavior:'smooth'});
  alert(`🤖 AI scanned ${WILAYAS.length} wilayas × 14 indicators = ${WILAYAS.length*14} data points and ranked priorities below 👇`);
});
document.getElementById('reportBtn').addEventListener('click',()=>{
  if(window.openReport){ window.openReport(); return; }
  let txt=`gis_map — Algeria GIS-AI report — forecast ${targetYear}\n(c) 2026 Copyright salim-slimani\n\n`;
  WILAYAS.forEach(w=>{ txt+=`${w.en}: water ${predictWater(w,targetYear)} | drought ${cropRisk(w,targetYear)}% | growth +${urbanGrowth(w,targetYear)}% | ${anomaly(w)||'stable'}\n`; });
  const blob=new Blob([txt],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`gis_map-report-${targetYear}.txt`; a.click();
});

drawMap();
refreshWilayaOptions();
selectWilaya('Setif');
{ const el=document.getElementById('wilayaSelect'); if(el) el.addEventListener('change',e=>selectWilaya(e.target.value)); }
/*GISMAP_EOF:app*/
