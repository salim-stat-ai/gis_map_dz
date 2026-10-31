// ===== gis_map — Data Import (CSV / Excel / TXT / JSON / GeoJSON / KML / SHP / SQLite) =====
// © 2026 Copyright salim-slimani
// Drop any GIS-ish file, map its columns, preview, then merge into the live map.

const IMPORT_FIELDS = [
  {k:'name', label:'Wilaya name', aliases:['name','nom','wilaya','en','n','city','commune','label']},
  {k:'lat', label:'Latitude', aliases:['lat','latitude','y']},
  {k:'lon', label:'Longitude', aliases:['lon','lng','long','longitude','x']},
  {k:'pop', label:'Population (k)', aliases:['pop','population','habitants']},
  {k:'price', label:'Price/m² (DZD)', aliases:['price','prix','prixm2','cost']},
  {k:'flood', label:'Flood risk 0-1', aliases:['flood','inondation','risque']},
  {k:'soil', label:'Soil /100', aliases:['soil','sol']},
  {k:'rain', label:'Rainfall mm', aliases:['rain','rainfall','pluie','pluviometrie']},
  {k:'ndvi', label:'NDVI', aliases:['ndvi']},
  {k:'dams', label:'Dams', aliases:['dams','barrages']},
  {k:'wells', label:'Wells', aliases:['wells','puits','forages']},
  {k:'waterDef', label:'Water deficit', aliases:['waterdef','deficit','deficit_eau']},
  {k:'markets', label:'Markets', aliases:['markets','marches','souks']},
  {k:'coverage', label:'Coverage %', aliases:['coverage','couverture']},
  {k:'energy', label:'Energy', aliases:['energy','energie']},
  {k:'roads', label:'Roads', aliases:['roads','routes']},
  {k:'labor', label:'Labor', aliases:['labor','mainoeuvre','emploi']},
  {k:'industry', label:'Industry', aliases:['industry','industrie']},
];

let importRows = [];   // array of plain objects
let importCols = [];
let importMap = {};    // fieldKey -> column name
let sqlBase = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/';

// Heavy libs (Excel/SHP/SQLite) load lazily with CDN fallbacks — never on page boot.
function ensureImportLib(kind){
  const has = ()=> kind==='excel' ? (typeof XLSX!=='undefined')
    : kind==='shp' ? (typeof shp!=='undefined')
    : (typeof initSqlJs!=='undefined');
  if(has()) return Promise.resolve(true);
  const urls = {
    excel:['https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.20.3/dist/xlsx.full.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'],
    shp:['https://unpkg.com/shpjs@latest/dist/shp.js',
      'https://cdn.jsdelivr.net/npm/shpjs@latest/dist/shp.js'],
    sql:['https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js',
      'https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/sql-wasm.js']
  }[kind];
  const bases = {sql:['https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/',
    'https://cdn.jsdelivr.net/npm/sql.js@1.8.0/dist/']}[kind];
  const status = document.getElementById('importStatus');
  if(status) status.textContent = 'Loading parser library for .' + (kind==='excel'?'xlsx':kind) + ' …';
  const tryNext = (i)=>{
    if(i>=urls.length) return Promise.resolve(false);
    return window.__gisLoadScript(urls[i]).then(()=>{
      if(kind==='sql' && bases) sqlBase = bases[Math.min(i, bases.length-1)];
      return has() ? true : tryNext(i+1);
    }).catch(()=>tryNext(i+1));
  };
  return (window.__gisLoadScript ? tryNext(0) : Promise.resolve(false));
}

// Ready-made web sources (keys match the preset dropdown in index.html)
const IMPORT_PRESETS = {
  'gadm-dz': 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_DZA_1.json',
  'osm-dams': 'https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Barea%5B%22ISO3166-1%22%3D%22DZ%22%5D%3B%28node%5B%22water%22%3D%22reservoir%22%5D%28area%29%3Bway%5B%22water%22%3D%22reservoir%22%5D%28area%29%3B%29%3Bout+center+40%3B',
  'osm-hosp': 'https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%5B%22amenity%22%3D%22hospital%22%5D%2836.6%2C2.9%2C36.9%2C3.3%29%3Bout+40%3B',
  'sample-csv': 'samples/wilaya_indicators.csv',
  'sample-dams': 'samples/dams.geojson',
  'world': 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json'
};
// Alias map: source spellings (GADM/OSM…) → our English names (normalized)
const NAME_ALIASES = {alger:'algiers'};
function norm(s){ return String(s??'').trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[\s_\-]+/g,''); }
function canonName(s){ const n = norm(s); return NAME_ALIASES[n] || n; }
function autoGuessMapping(){
  importMap = {};
  IMPORT_FIELDS.forEach(f=>{
    const hit = importCols.find(c=>f.aliases.map(norm).includes(norm(c)));
    if(hit) importMap[f.k]=hit;
  });
  if(!importMap.name && importCols.length) importMap.name = importCols[0];
}
function setImportRows(rows){
  importRows = rows.filter(r=>r && typeof r==='object');
  importCols = [...new Set(importRows.flatMap(r=>Object.keys(r)))];
  autoGuessMapping(); renderImportUI();
}

// ---------- parsers ----------
function detectDelim(t){
  const head = t.split('\n')[0]||'';
  const c = {';':0, ',':0, '\t':0, '|':0};
  Object.keys(c).forEach(d=>c[d]=head.split(d).length);
  return Object.entries(c).sort((a,b)=>b[1]-a[1])[0][0];
}
function parseDelimited(text){
  const d = detectDelim(text);
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length);
  if(!lines.length) return [];
  const split = l=>l.split(d).map(s=>s.trim().replace(/^"|"$/g,''));
  const head = split(lines[0]);
  return lines.slice(1).map(l=>{
    const v = split(l); const o={};
    head.forEach((h,i)=>o[h||('col'+i)] = isNaN(+v[i])||v[i]==='' ? (v[i]??'') : +v[i]);
    return o;
  });
}
function parseGeoJSON(gj){
  const feats = gj.features || (gj.type? [gj] : []);
  return feats.map(f=>{
    const p = {...(f.properties||{})};
    if(p.name === undefined){
      const nm = p.NAME_1 || p.NAME_2 || p.name_en || p.ADM1_EN || p.admin1Name || p.id;
      if(nm !== undefined) p.name = nm;
    }
    const g = f.geometry||{};
    if(g.type==='Point' && Array.isArray(g.coords||g.coordinates)){
      const [lo,la] = g.coords||g.coordinates;
      if(p.lat===undefined) p.lat=la; if(p.lon===undefined) p.lon=lo;
    } else if(g.coordinates){
      // polygons/lines: fall back to bbox center so any GIS layer is mappable
      const bb = bbox(g.coordinates);
      if(bb && p.lat===undefined){ p.lat=(bb[1]+bb[3])/2; if(p.lon===undefined) p.lon=(bb[0]+bb[2])/2; }
    }
    return p;
  });
}
function bbox(coords){
  let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity, found=false;
  const walk = (c)=>{
    if(typeof c[0]==='number' && typeof c[1]==='number'){
      found=true;
      if(c[0]<x0)x0=c[0]; if(c[0]>x1)x1=c[0]; if(c[1]<y0)y0=c[1]; if(c[1]>y1)y1=c[1];
    } else c.forEach(walk);
  };
  try{ walk(coords); }catch(e){ return null; }
  return found ? [x0,y0,x1,y1] : null;
}
// OpenStreetMap Overpass JSON → flat rows
function parseOSM(j){
  const els = j.elements || [];
  return els.map(e=>{
    const t = e.tags || {};
    const c = e.center || {};
    return {
      name: t.name || (t.amenity ? t.amenity + ' site' : e.type + ' ' + e.id),
      lat: e.lat !== undefined ? e.lat : c.lat,
      lon: e.lon !== undefined ? e.lon : c.lon,
      amenity: t.amenity || '', water: t.water || '', name_ar: t['name:ar'] || ''
    };
  }).filter(r=>r.lat !== undefined && r.lon !== undefined);
}
function parseKML(text){
  const xml = new DOMParser().parseFromString(text,'text/xml');
  return [...xml.getElementsByTagName('Placemark')].map(pm=>{
    const nm = pm.getElementsByTagName('name')[0];
    const co = pm.getElementsByTagName('coordinates')[0];
    const o = {name: nm?nm.textContent.trim():''};
    if(co){ const [lo,la] = co.textContent.trim().split(',').map(Number); o.lon=lo; o.lat=la; }
    return o;
  });
}
async function handleImportFile(file){
  const ext = file.name.split('.').pop().toLowerCase();
  const status = document.getElementById('importStatus');
  status.textContent = 'Reading '+file.name+' …';
  try{
    if(['csv','txt','tsv'].includes(ext)){
      setImportRows(parseDelimited(await file.text()));
    } else if(['xlsx','xls'].includes(ext)){
      if(!(await ensureImportLib('excel'))) throw new Error('Excel library blocked — allow cdn.sheetjs/jsdelivr/cdnjs and retry.');
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf,{type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      setImportRows(XLSX.utils.sheet_to_json(ws,{defval:''}));
    } else if(['json','geojson'].includes(ext)){
      const j = JSON.parse(await file.text());
      setImportRows(j.elements ? parseOSM(j) : (Array.isArray(j)?j:parseGeoJSON(j)));
    } else if(ext==='kml'){
      setImportRows(parseKML(await file.text()));
    } else if(ext==='zip'){
      if(!(await ensureImportLib('shp'))) throw new Error('SHP library blocked — allow unpkg/jsdelivr and retry.');
      const gj = await shp(await file.arrayBuffer());
      const arr = Array.isArray(gj)?gj.flatMap(g=>parseGeoJSON(g)):parseGeoJSON(gj);
      setImportRows(arr);
    } else if(['db','sqlite','sqlite3'].includes(ext)){
      await importFromSQLite(file);
      return;
    } else throw new Error('Unsupported format: .'+ext);
    status.textContent = `${importRows.length} rows × ${importCols.length} columns from ${file.name}`;
  }catch(e){ status.textContent = 'Error: '+e.message; }
}
async function importFromSQLite(file){
  const status = document.getElementById('importStatus');
  if(!(await ensureImportLib('sql'))) throw new Error('SQLite library blocked — allow cdnjs/jsdelivr and retry.');
  const SQL = await initSqlJs({locateFile:f=>sqlBase+f});
  const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values.map(v=>v[0]) || [];
  if(!tables.length){ status.textContent='No tables in database.'; return; }
  const t = tables[0];
  const res = db.exec(`SELECT * FROM "${t}" LIMIT 2000`)[0];
  if(!res){ status.textContent=`Table ${t} is empty.`; return; }
  setImportRows(res.values.map(row=>Object.fromEntries(res.columns.map((c,i)=>[c,row[i]]))));
  document.getElementById('importStatus').textContent = `${importRows.length} rows from SQLite table "${t}" (${tables.length} tables found)`;
}

// ---------- mapping / preview / merge ----------
function renderImportUI(){
  const wrap = document.getElementById('importMap'); if(!wrap) return;
  wrap.innerHTML = IMPORT_FIELDS.map(f=>`
    <label>${f.label}<select data-map="${f.k}">
      <option value="">— ignore —</option>
      ${importCols.map(c=>`<option ${importMap[f.k]===c?'selected':''}>${c}</option>`).join('')}
    </select></label>`).join('');
  wrap.querySelectorAll('[data-map]').forEach(s=>s.onchange=()=>{ importMap[s.dataset.map]=s.value||undefined; renderPreview(); });
  renderPreview();
}
function mappedRows(){
  return importRows.map(r=>{
    const o={};
    Object.entries(importMap).forEach(([f,col])=>{ if(col && r[col]!==undefined && r[col]!=='') o[f]=r[col]; });
    return o;
  });
}
function renderPreview(){
  const pv = document.getElementById('importPreview'); if(!pv) return;
  const rows = mappedRows().slice(0,8);
  const cols = IMPORT_FIELDS.filter(f=>importMap[f.k]).map(f=>f.k);
  if(!rows.length||!cols.length){ pv.innerHTML='<span style="color:#9AA9C7">Map at least one column to preview.</span>'; return; }
  pv.innerHTML = `<table><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??''}</td>`).join('')}</tr>`).join('')}</table>`;
}
function num(v, dflt){ const x=+v; return isNaN(x)?dflt:x; }
function mergeImport(){
  const rows = mappedRows();
  let updated=0, added=0;
  const touched = [];
  rows.forEach(r=>{
    const nm = String(r.name??'').trim(); if(!nm) return;
    const lat = num(r.lat, null), lon = num(r.lon, null);
    const key = canonName(nm);
    let w = WILAYAS.find(x=>canonName(x.en)===key||canonName(x.n)===key);
    const patch = {};
    ['pop','price','soil','rain','ndvi','dams','wells','waterDef','markets','coverage','energy','roads','labor','industry'].forEach(k=>{ if(r[k]!==undefined&&r[k]!=='') patch[k]=+r[k]; });
    if(r.flood!==undefined&&r.flood!==''){ let f=+r.flood; if(f>1) f=f/100; patch.flood=Math.max(0,Math.min(1,f)); }
    if(w){ Object.assign(w, patch); if(lat!==null){w.lat=lat;} if(lon!==null){w.lon=lon;} updated++; touched.push(w.en); }
    else {
      if(lat===null||lon===null) return; // new places need coordinates
      WILAYAS.push({num:1000+added, n:nm, en:nm, lat, lon,
        pop:patch.pop??100, price:patch.price??50000, flood:patch.flood??0.1, soil:patch.soil??50,
        rain:patch.rain??300, ndvi:patch.ndvi??0.3, dams:patch.dams??1, wells:patch.wells??300,
        waterDef:patch.waterDef??-10, markets:patch.markets??8, coverage:patch.coverage??55,
        energy:patch.energy??65, roads:patch.roads??70, labor:patch.labor??50, industry:patch.industry??45});
      added++; touched.push(nm);
    }
  });
  drawMap(); refreshWilayaOptions();
  // feed imported data straight into the analysis pipeline
  let analyzed = '';
  try{
    if(typeof refreshAgentScope==='function') refreshAgentScope();
    const first = touched.length ? WILAYAS.find(x=>x.en===touched[0]||x.n===touched[0]) : null;
    if(first){
      selectWilaya(first.en);
      const sc = document.getElementById('agentScope');
      if(sc){ sc.value = first.en; }
      if(typeof runAgent==='function'){ runAgent(true); analyzed = ' Council verdict ready below.'; }
    }
  }catch(e){}
  const sel = document.getElementById('wName').textContent.replace('📍 ','').split(' · ')[0];
  const still = WILAYAS.find(x=>x.en===sel||x.n===sel); if(still && !touched.length) selectWilaya(still.en);
  document.getElementById('importStatus').textContent = `Merged: ${updated} updated, ${added} new places. Map now holds ${WILAYAS.length} locations. Forecasts, dashboard, agents and exports all use the new data.${analyzed}`;
}
function downloadTemplate(){
  const head = IMPORT_FIELDS.map(f=>f.aliases[0]).join(',');
  const ex = 'Setif,36.19,5.41,1800,95000,0.15,82,450,0.55,3,900,-12,48,78,80,88,82,70';
  const blob = new Blob([head+'\n'+ex],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='gis_map-template.csv'; a.click();
}
// ---------- fetch from URL (websites / open-data portals) ----------
function urlExt(url, contentType){
  const clean = String(url||'').split('?')[0].toLowerCase();
  if(clean.endsWith('.geojson')) return 'geojson';
  const e = clean.split('.').pop();
  if(['csv','txt','tsv','xlsx','xls','json','geojson','kml','zip'].includes(e)) return e;
  if(contentType.includes('json')) return 'json';
  if(contentType.includes('xml') || contentType.includes('kml')) return 'kml';
  if(contentType.includes('sheet') || contentType.includes('excel')) return 'xlsx';
  return 'csv';
}
async function rowsFromBytes(buf, ext, label){
  if(['csv','txt','tsv'].includes(ext)) return parseDelimited(new TextDecoder().decode(buf));
  if(['xlsx','xls'].includes(ext)){
    if(!(await ensureImportLib('excel'))) throw new Error('Excel library blocked — allow cdn.sheetjs/jsdelivr/cdnjs and retry.');
    const wb = XLSX.read(buf,{type:'array'});
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
  }
  if(['json','geojson'].includes(ext)){
    const j = JSON.parse(new TextDecoder().decode(buf));
    if(j.elements) return parseOSM(j); // Overpass/OSM
    return Array.isArray(j)?j:parseGeoJSON(j);
  }
  if(ext==='kml') return parseKML(new TextDecoder().decode(buf));
  if(ext==='zip'){
    if(!(await ensureImportLib('shp'))) throw new Error('SHP library blocked — allow unpkg/jsdelivr and retry.');
    const gj = await shp(buf);
    return Array.isArray(gj)?gj.flatMap(g=>parseGeoJSON(g)):parseGeoJSON(gj);
  }
  throw new Error('Cannot detect format of '+label);
}
let lastFetch = null; // {buf, name, ext} — raw bytes of the last URL fetch, downloadable
async function handleImportURL(){
  const status = document.getElementById('importStatus');
  const url = (document.getElementById('importURL').value||'').trim();
  if(!url){ status.textContent='Paste a data URL first (CSV, JSON, GeoJSON, KML…).'; return; }
  const forceProxy = document.getElementById('importProxy').checked;
  status.textContent = 'Fetching '+url+' …';
  const get = async (proxy)=>{
    const target = proxy ? 'https://api.allorigins.win/raw?url='+encodeURIComponent(url) : url;
    const res = await fetch(target,{cache:'no-store'});
    if(!res.ok) throw new Error('HTTP '+res.status);
    return {buf: await res.arrayBuffer(), ext: urlExt(url, res.headers.get('content-type')||'')};
  };
  try{
    let got;
    try{ got = await get(forceProxy); }
    catch(e){ if(forceProxy) throw e; got = await get(true); } // auto-fallback via proxy (CORS)
    const path = url.split('?')[0].split('/').pop() || 'download';
    lastFetch = {buf: got.buf, name: path.includes('.') ? path : path + '.' + got.ext, ext: got.ext};
    setImportRows(await rowsFromBytes(got.buf, got.ext, url));
    status.textContent = `${importRows.length} rows × ${importCols.length} columns from URL (.${got.ext}) — map columns, preview, Merge into analysis, or ⬇ Download raw file`;
  }catch(e){ status.textContent='Fetch failed: '+e.message+' — tip: tick “via proxy” for sites without CORS, or download the file and use the file picker.'; }
}
function downloadFetched(){
  const status = document.getElementById('importStatus');
  if(!lastFetch){ status.textContent='Nothing fetched yet — Fetch URL first, then download.'; return; }
  downloadBlob(new Blob([lastFetch.buf]), 'gis_map-fetched-'+lastFetch.name);
  status.textContent = 'Downloaded raw file: ' + lastFetch.name;
}
// ---------- export dataset: Excel / CSV / GIS (GeoJSON / KML) ----------
function datasetRows(){
  return WILAYAS.map(w=>({
    wilaya:w.en, wilaya_ar:w.n, num:w.num, lat:w.lat, lon:w.lon,
    pop_k:w.pop, price_m2:w.price, flood:w.flood, soil:w.soil, rain_mm:w.rain,
    ndvi:w.ndvi, dams:w.dams, wells:w.wells, waterDef:w.waterDef,
    markets:w.markets, coverage_pct:w.coverage, energy:w.energy,
    roads:w.roads, labor:w.labor, industry:w.industry,
    forecast_water:predictWater(w,targetYear),
    drought_risk:cropRisk(w,targetYear),
    urban_growth:urbanGrowth(w,targetYear)
  }));
}
function downloadBlob(blob,name){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),5000);
}
function escCSV(v){
  const s = String(v==null?'':v);
  return /[",\n;]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
}
async function exportDataset(fmt){
  const status = document.getElementById('importStatus');
  const rows = datasetRows(), stamp = 'gis_map-'+targetYear;
  try{
    if(fmt==='csv'){
      const head = Object.keys(rows[0]);
      const txt = '﻿'+head.join(',')+'\n'+rows.map(r=>head.map(h=>escCSV(r[h])).join(',')).join('\n');
      downloadBlob(new Blob([txt],{type:'text/csv;charset=utf-8'}), stamp+'.csv');
    }else if(fmt==='xlsx'){
      if(!(await ensureImportLib('excel'))) throw new Error('Excel library blocked — allow cdn.sheetjs/jsdelivr/cdnjs and retry.');
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'wilayas');
      XLSX.writeFile(wb, stamp+'.xlsx');
    }else if(fmt==='geojson'){
      const gj = {type:'FeatureCollection', features: rows.map(r=>{
        const {lat,lon,...props} = r;
        return {type:'Feature', geometry:{type:'Point',coordinates:[lon,lat]}, properties:props};
      })};
      downloadBlob(new Blob([JSON.stringify(gj)],{type:'application/geo+json'}), stamp+'.geojson');
    }else if(fmt==='kml'){
      const pm = rows.map(r=>'<Placemark><name>'+r.wilaya+'</name>'
        +'<Point><coordinates>'+r.lon+','+r.lat+'</coordinates></Point><ExtendedData>'
        +Object.entries(r).filter(e=>e[0]!=='lat'&&e[0]!=='lon')
          .map(e=>'<Data name="'+e[0]+'"><value>'+e[1]+'</value></Data>').join('')
        +'</ExtendedData></Placemark>').join('');
      downloadBlob(new Blob(['<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document>'+pm+'</Document></kml>'],{type:'application/vnd.google-earth.kml+xml'}), stamp+'.kml');
    }
    status.textContent = `Exported ${rows.length} wilayas (+AI forecasts) → ${stamp}.${fmt}`;
  }catch(e){ status.textContent='Export failed: '+e.message; }
}
window.initImport = function(){
  if(window.__importDone) return true;
  const fi = document.getElementById('importFile'); if(!fi) return false;
  fi.onchange = ()=>{ if(fi.files[0]) handleImportFile(fi.files[0]); };
  const m = document.getElementById('importMerge'); if(m) m.onclick = mergeImport;
  const t = document.getElementById('importTemplate'); if(t) t.onclick = downloadTemplate;
  const fu = document.getElementById('importFetch'); if(fu) fu.onclick = handleImportURL;
  const dl = document.getElementById('importDownload'); if(dl) dl.onclick = downloadFetched;
  const ps = document.getElementById('importPreset');
  if(ps) ps.onchange = ()=>{
    const key = ps.value; if(!key) return;
    const url = IMPORT_PRESETS[key] || key;
    document.getElementById('importURL').value = url;
    handleImportURL();
  };
  document.querySelectorAll('[data-export]').forEach(b=>{ b.onclick = ()=>exportDataset(b.dataset.export); });
  window.__importDone = true;
  return true;
};
(function importReady(fn){ if(document.readyState==='loading') window.addEventListener('DOMContentLoaded', fn); else fn(); })(()=>{
  window.initImport();
});
/*GISMAP_EOF:import*/
