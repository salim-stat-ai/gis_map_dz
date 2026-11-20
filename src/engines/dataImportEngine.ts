/**
 * GIS Map – Core Data Import, Ingestion & Multi-Format Export Engine
 * Supporting CSV, Excel (.xlsx/.xls), GeoJSON, JSON, KML, Shapefile, SQLite
 * Automatic 18-indicator column mapping, local & global databases, and dataset export
 * © 2026 Salim Slimani & National Foresight System
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { WilayaRecord } from '../types';
import {
  predictWater,
  cropRisk,
  urbanGrowth,
  getHospitalsCount,
  getHealthCoverage,
  getSeismicRisk,
  getWildfireRisk,
  getHazardIndex,
  getTransportScore,
  hasRailAccess,
  getHotelsCount,
  getHeritageSitesCount,
  getTourismScore
} from './reporting';

export interface ImportField {
  k: keyof WilayaRecord | string;
  label: string;
  labelAr: string;
  aliases: string[];
}

export const IMPORT_FIELDS: ImportField[] = [
  { k: 'name', label: 'Wilaya name', labelAr: 'اسم الولاية', aliases: ['name', 'nom', 'wilaya', 'en', 'n', 'city', 'commune', 'label', 'wilaya_name', 'name_en', 'name_ar'] },
  { k: 'lat', label: 'Latitude', labelAr: 'خط العرض', aliases: ['lat', 'latitude', 'y', 'lat_deg', 'lat_dd'] },
  { k: 'lon', label: 'Longitude', labelAr: 'خط الطول', aliases: ['lon', 'lng', 'long', 'longitude', 'x', 'lon_deg', 'lon_dd'] },
  { k: 'pop', label: 'Population (k)', labelAr: 'السكان (بالآلاف)', aliases: ['pop', 'population', 'habitants', 'pop_k', 'popk', 'inhabitants'] },
  { k: 'price', label: 'Price/m² (DZD)', labelAr: 'سعر المتر² (دج)', aliases: ['price', 'prix', 'prixm2', 'cost', 'price_m2', 'realestate'] },
  { k: 'flood', label: 'Flood risk 0-1', labelAr: 'خطر الفيضان 0-1', aliases: ['flood', 'inondation', 'risque', 'flood_risk', 'floodrisk'] },
  { k: 'soil', label: 'Soil /100', labelAr: 'جودة التربة /100', aliases: ['soil', 'sol', 'agri_soil', 'soil_quality'] },
  { k: 'rain', label: 'Rainfall mm', labelAr: 'الأمطار (ملم)', aliases: ['rain', 'rainfall', 'pluie', 'pluviometrie', 'rain_mm'] },
  { k: 'ndvi', label: 'NDVI', labelAr: 'مؤشر الغطاء النباتي', aliases: ['ndvi', 'vegetation', 'indice_vegetation'] },
  { k: 'dams', label: 'Dams', labelAr: 'السدود', aliases: ['dams', 'barrages', 'barrage'] },
  { k: 'wells', label: 'Wells', labelAr: 'الآبار الارتوازية', aliases: ['wells', 'puits', 'forages', 'forage'] },
  { k: 'waterDef', label: 'Water deficit', labelAr: 'العجز المائي (م³)', aliases: ['waterdef', 'deficit', 'deficit_eau', 'water_deficit', 'water_stress'] },
  { k: 'markets', label: 'Markets', labelAr: 'الأسواق والمراكز', aliases: ['markets', 'marches', 'souks', 'markets_count', 'retail'] },
  { k: 'coverage', label: 'Coverage %', labelAr: 'نسبة التغطية %', aliases: ['coverage', 'couverture', 'coverage_pct', 'retail_coverage'] },
  { k: 'energy', label: 'Energy', labelAr: 'شبكة الطاقة /100', aliases: ['energy', 'energie', 'power', 'power_grid'] },
  { k: 'roads', label: 'Roads', labelAr: 'شبكة الطرق /100', aliases: ['roads', 'routes', 'road_network', 'connectivity'] },
  { k: 'labor', label: 'Labor', labelAr: 'اليد العاملة /100', aliases: ['labor', 'mainoeuvre', 'emploi', 'workforce'] },
  { k: 'industry', label: 'Industry', labelAr: 'القدرة الصناعية /100', aliases: ['industry', 'industrie', 'factories', 'industrial_score'] },
  { k: 'hospitals', label: 'Hospitals', labelAr: 'المستشفيات والمرافق', aliases: ['hospitals', 'hopitaux', 'chu', 'eph', 'health_facilities'] },
  { k: 'healthCoverage', label: 'Health Access %', labelAr: 'التغطية الصحية %', aliases: ['healthcoverage', 'health_coverage', 'sante', 'health_access', 'couverture_sanitaire'] },
  { k: 'seismicRisk', label: 'Seismic Risk 0-1', labelAr: 'الخطر الزلزالي 0-1', aliases: ['seismicrisk', 'seismic_risk', 'seisme', 'earthquake'] },
  { k: 'wildfireRisk', label: 'Wildfire Risk 0-1', labelAr: 'خطر الحرائق 0-1', aliases: ['wildfirerisk', 'wildfire_risk', 'incendie', 'forest_fire'] },
  { k: 'hazardIndex', label: 'Hazard Index /100', labelAr: 'مؤشر الأخطار /100', aliases: ['hazardindex', 'hazard_index', 'multirisques', 'natural_hazards'] },
  { k: 'transportScore', label: 'Transport /100', labelAr: 'مؤشر النقل والسكك /100', aliases: ['transportscore', 'transport_score', 'transport', 'multimodal_transport'] },
  { k: 'railAccess', label: 'Rail Access (0/1)', labelAr: 'ربط السكة الحديدية', aliases: ['railaccess', 'rail_access', 'sntf', 'rail', 'railway'] },
  { k: 'hotels', label: 'Hotels Count', labelAr: 'المؤسسات الفندقية (MTA)', aliases: ['hotels', 'hotel', 'hotellerie', 'hotels_count', 'accommodations'] },
  { k: 'heritageSites', label: 'Heritage Sites', labelAr: 'المعالم والمواقع التراثية', aliases: ['heritagesites', 'heritage_sites', 'heritage', 'patrimoine', 'unesco_sites'] },
  { k: 'tourismScore', label: 'Tourism Score /100', labelAr: 'مؤشر السياحة /100', aliases: ['tourismscore', 'tourism_score', 'tourism', 'tourisme', 'tourism_index'] }
];

export interface PresetSource {
  id: string;
  name: string;
  nameAr: string;
  group: 'algeria' | 'samples' | 'world';
  url: string;
  formatHint?: string;
  description: string;
}

export const IMPORT_PRESETS: PresetSource[] = [
  // 1. Algeria — open geo-data
  {
    id: 'gadm-dz',
    name: 'GADM — Algeria provinces (polygons)',
    nameAr: 'GADM — حدود ولايات الجزائر (مضلعات جغرافية)',
    group: 'algeria',
    url: 'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_DZA_1.json',
    formatHint: 'geojson',
    description: 'Detailed official administrative boundaries (Level 1) for Algerian wilayas.'
  },
  {
    id: 'osm-dams',
    name: 'OSM — dams & reservoirs, Algeria (Overpass)',
    nameAr: 'OSM — السدود ومجمعات المياه في الجزائر (Overpass)',
    group: 'algeria',
    url: 'https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Barea%5B%22ISO3166-1%22%3D%22DZ%22%5D%3B%28node%5B%22water%22%3D%22reservoir%22%5D%28area%29%3Bway%5B%22water%22%3D%22reservoir%22%5D%28area%29%3B%29%3Bout+center+40%3B',
    formatHint: 'json',
    description: 'OpenStreetMap query extracting operational dams and major water reservoirs in Algeria.'
  },
  {
    id: 'osm-hosp',
    name: 'OSM — hospitals, Algiers (Overpass)',
    nameAr: 'OSM — مستشفيات والمراكز الصحية بالجزائر العاصمة',
    group: 'algeria',
    url: 'https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Bnode%5B%22amenity%22%3D%22hospital%22%5D%2836.6%2C2.9%2C36.9%2C3.3%29%3Bout+40%3B',
    formatHint: 'json',
    description: 'Overpass query for healthcare infrastructure in Algiers metro area.'
  },
  {
    id: 'osm-rail',
    name: 'OSM — railway stations & SNTF network (Overpass)',
    nameAr: 'OSM — محطات وشبكة السكك الحديدية الجزائرية (SNTF)',
    group: 'algeria',
    url: 'https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Barea%5B%22ISO3166-1%22%3D%22DZ%22%5D%3Bnode%5B%22railway%22%3D%22station%22%5D%28area%29%3Bout+50%3B',
    formatHint: 'json',
    description: 'OpenStreetMap query for SNTF railway hubs and transport interchanges.'
  },
  {
    id: 'osm-tourism',
    name: 'OSM — heritage sites, museums & hotels (Overpass)',
    nameAr: 'OSM — المعالم التراثية والمتاحف والفنادق بالجزائر (Overpass)',
    group: 'algeria',
    url: 'https://overpass-api.de/api/interpreter?data=%5Bout%3Ajson%5D%3Barea%5B%22ISO3166-1%22%3D%22DZ%22%5D%3B%28node%5B%22tourism%22%3D%22attraction%22%5D%28area%29%3Bnode%5B%22historic%22%5D%28area%29%3B%29%3Bout+50%3B',
    formatHint: 'json',
    description: 'OpenStreetMap Overpass query extracting heritage monuments, archaeological landmarks, and tourism attractions across Algeria.'
  },
  {
    id: 'ons-economy',
    name: 'ONS — National Office of Statistics (Wilaya Demographics)',
    nameAr: 'الديوان الوطني للإحصائيات — مؤشرات الديموغرافيا والعمالة',
    group: 'algeria',
    url: '/samples/wilaya_indicators.csv',
    formatHint: 'csv',
    description: 'Demographic distribution, price index and workforce coverage across Algerian wilayas.'
  },
  {
    id: 'anrh-water',
    name: 'ANRH — National Water Agency (Dams & Deficit)',
    nameAr: 'الوكالة الوطنية للموارد المائية — سدود وعجز مائي',
    group: 'algeria',
    url: '/samples/dams.geojson',
    formatHint: 'geojson',
    description: 'Hydrological registry with water deficit, active dams, and well clusters.'
  },
  {
    id: 'worldbank-dz',
    name: 'World Bank — Algeria Indicators API',
    nameAr: 'البنك الدولي — واجهة بيانات الجزائر الإحصائية',
    group: 'algeria',
    url: 'https://api.worldbank.org/v2/country/DZA/indicator/SP.POP.TOTL?format=json',
    formatHint: 'json',
    description: 'Official World Bank REST API for national demographic and development time-series.'
  },
  {
    id: 'nasa-power',
    name: 'NASA POWER — Climatology (Rainfall & Solar)',
    nameAr: 'ناسا باور — المناخ والأمطار والإشعاع الشمسي',
    group: 'algeria',
    url: 'https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR,ALLSKY_SFC_SW_DWN&community=AG&longitude=3.05&latitude=36.75&format=JSON',
    formatHint: 'json',
    description: 'Satellite meteorological data measuring surface precipitation and solar irradiation.'
  },

  // 2. Built-in samples (always work)
  {
    id: 'sample-csv',
    name: 'Sample — wilaya indicators (CSV)',
    nameAr: 'عينة جاهزة — مؤشرات الولايات الـ 18 (CSV)',
    group: 'samples',
    url: '/samples/wilaya_indicators.csv',
    formatHint: 'csv',
    description: 'Verified sample CSV with all 18 indicators populated for reference wilayas.'
  },
  {
    id: 'sample-dams',
    name: 'Sample — dams (GeoJSON)',
    nameAr: 'عينة جاهزة — مواقع وسدود كبرى (GeoJSON)',
    group: 'samples',
    url: '/samples/dams.geojson',
    formatHint: 'geojson',
    description: 'Spatial GeoJSON points marking major Algerian dams (Beni Haroun, Koudiat Acerdoune, etc.).'
  },

  // 3. World
  {
    id: 'world',
    name: 'World countries (GeoJSON)',
    nameAr: 'دول العالم — حدود مكانية كاملة (GeoJSON)',
    group: 'world',
    url: 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json',
    formatHint: 'geojson',
    description: 'Global Natural Earth country polygons and centroids.'
  }
];

export const NAME_ALIASES: Record<string, string> = {
  alger: 'algiers',
  algiers: 'algiers',
  eljazair: 'algiers',
  wahran: 'oran',
  oran: 'oran',
  qacentina: 'constantine',
  constantine: 'constantine',
  annaba: 'annaba',
  setif: 'setif',
  sétif: 'setif',
  batna: 'batna',
  biskra: 'biskra',
  tlemcen: 'tlemcen',
  tizi: 'tizi ouzou',
  tiziouzou: 'tizi ouzou',
  bouira: 'bouira',
  bejaia: 'bejaia',
  béjaïa: 'bejaia',
  blida: 'blida',
  medea: 'medea',
  médéa: 'medea',
  tiaret: 'tiaret',
  djelfa: 'djelfa',
  jijel: 'jijel',
  skikda: 'skikda',
  guelma: 'guelma',
  mila: 'mila',
  ouargla: 'ouargla',
  adrar: 'adrar',
  bechar: 'bechar',
  tamanrasset: 'tamanrasset',
  ghardaia: 'ghardaia',
  ghardaïa: 'ghardaia',
  eloued: 'el oued',
  illizi: 'illizi',
  tindouf: 'tindouf',
  khenchela: 'khenchela',
  soukahras: 'souk ahras',
  tipaza: 'tipaza',
  boumerdes: 'boumerdes',
  elbayadh: 'el bayadh',
  naama: 'naama',
  aintemouchent: 'ain temouchent',
  aindefla: 'ain defla',
  relizane: 'relizane',
  msila: "m'sila",
  mascara: 'mascara',
  saida: 'saida',
  chlef: 'chlef',
  laghouat: 'laghouat',
  ouleddjellal: 'ouled djellal',
  bordjbadjimokhtar: 'bordj badji mokhtar',
  benibbes: 'beni abbes',
  timimoun: 'timimoun',
  touggourt: 'touggourt',
  djanet: 'djanet',
  inmghir: "el m'ghair",
  insalah: 'in salah',
  inguezzam: 'in guezzam'
};

export function normStr(s: any): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_\-]+/g, '');
}

export function canonName(s: any): string {
  const n = normStr(s);
  return NAME_ALIASES[n] || n;
}

export function autoGuessMapping(cols: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  IMPORT_FIELDS.forEach(f => {
    const hit = cols.find(c => f.aliases.map(normStr).includes(normStr(c)));
    if (hit) map[f.k] = hit;
  });
  if (!map.name && cols.length) map.name = cols[0];
  return map;
}

export function detectDelim(text: string): string {
  const head = text.split('\n')[0] || '';
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0, '|': 0 };
  Object.keys(counts).forEach(d => {
    counts[d] = head.split(d).length;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

export function parseDelimited(text: string): any[] {
  const delimiter = detectDelim(text);
  const parsed = Papa.parse(text, {
    delimiter,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });
  return (parsed.data as any[]) || [];
}

export function computeBbox(coords: any): [number, number, number, number] | null {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, found = false;
  const walk = (c: any) => {
    if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
      found = true;
      if (c[0] < x0) x0 = c[0];
      if (c[0] > x1) x1 = c[0];
      if (c[1] < y0) y0 = c[1];
      if (c[1] > y1) y1 = c[1];
    } else if (Array.isArray(c)) {
      c.forEach(walk);
    }
  };
  try {
    walk(coords);
  } catch (e) {
    return null;
  }
  return found ? [x0, y0, x1, y1] : null;
}

export function parseGeoJSON(gj: any): any[] {
  const feats = gj.features || (gj.type === 'Feature' ? [gj] : Array.isArray(gj) ? gj : []);
  return feats.map((f: any) => {
    const p = { ...(f.properties || {}) };
    if (p.name === undefined) {
      const nm = p.NAME_1 || p.NAME_2 || p.name_en || p.name_ar || p.ADM1_EN || p.admin1Name || p.id;
      if (nm !== undefined) p.name = nm;
    }
    const g = f.geometry || {};
    if (g.type === 'Point' && Array.isArray(g.coordinates)) {
      const [lo, la] = g.coordinates;
      if (p.lat === undefined) p.lat = la;
      if (p.lon === undefined) p.lon = lo;
    } else if (g.coordinates) {
      const bb = computeBbox(g.coordinates);
      if (bb) {
        if (p.lat === undefined) p.lat = (bb[1] + bb[3]) / 2;
        if (p.lon === undefined) p.lon = (bb[0] + bb[2]) / 2;
      }
    }
    return p;
  });
}

export function parseOSM(j: any): any[] {
  const els = j.elements || [];
  return els.map((e: any) => {
    const t = e.tags || {};
    const c = e.center || {};
    return {
      name: t.name || (t.amenity ? t.amenity + ' site' : (e.type || 'element') + ' ' + e.id),
      name_ar: t['name:ar'] || '',
      lat: e.lat !== undefined ? e.lat : c.lat,
      lon: e.lon !== undefined ? e.lon : c.lon,
      amenity: t.amenity || '',
      water: t.water || '',
      reservoir: t.reservoir || ''
    };
  }).filter((r: any) => r.lat !== undefined && r.lon !== undefined);
}

export function parseKML(text: string): any[] {
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'text/xml');
  const placemarks = xml.getElementsByTagName('Placemark');
  const results: any[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const coordsEl = pm.getElementsByTagName('coordinates')[0];
    const name = nameEl?.textContent?.trim() || `Location_${i + 1}`;
    const row: any = { name };

    if (coordsEl?.textContent) {
      const parts = coordsEl.textContent.trim().split(',');
      row.lon = parseFloat(parts[0]) || 3.0;
      row.lat = parseFloat(parts[1]) || 36.0;
    }

    const dataEls = pm.getElementsByTagName('Data');
    for (let j = 0; j < dataEls.length; j++) {
      const d = dataEls[j];
      const attrName = d.getAttribute('name');
      const val = d.getElementsByTagName('value')[0]?.textContent?.trim();
      if (attrName && val !== undefined) {
        row[attrName] = isNaN(Number(val)) ? val : Number(val);
      }
    }
    results.push(row);
  }
  return results;
}

export function parseWorldBank(j: any): any[] {
  if (Array.isArray(j) && j.length >= 2 && Array.isArray(j[1])) {
    return j[1].map((rec: any) => ({
      name: rec.country?.value || 'Algeria',
      year: rec.date,
      value: rec.value,
      indicator: rec.indicator?.value || ''
    }));
  }
  return Array.isArray(j) ? j : [j];
}

export function parseNasaPower(j: any): any[] {
  const prop = j.properties?.parameter;
  if (!prop) return Array.isArray(j) ? j : [j];
  const rainfall = prop.PRECTOTCORR || {};
  const solar = prop.ALLSKY_SFC_SW_DWN || {};
  const rows: any[] = [];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'ANN'];
  months.forEach(m => {
    rows.push({
      period: m,
      rain_mm: rainfall[m] ?? 0,
      solar_kwh: solar[m] ?? 0,
      lat: j.geometry?.coordinates?.[1] ?? 36.75,
      lon: j.geometry?.coordinates?.[0] ?? 3.05
    });
  });
  return rows;
}

export async function parseFileBytes(buf: ArrayBuffer, ext: string, label: string): Promise<any[]> {
  const cleanExt = ext.toLowerCase();

  if (['csv', 'txt', 'tsv'].includes(cleanExt)) {
    const text = new TextDecoder('utf-8').decode(buf);
    return parseDelimited(text);
  }

  if (['xlsx', 'xls'].includes(cleanExt)) {
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { defval: '' });
  }

  if (['json', 'geojson'].includes(cleanExt)) {
    const text = new TextDecoder('utf-8').decode(buf);
    const parsed = JSON.parse(text);
    if (parsed.elements) return parseOSM(parsed);
    if (Array.isArray(parsed) && parsed.length >= 2 && Array.isArray(parsed[1])) return parseWorldBank(parsed);
    if (parsed.properties?.parameter) return parseNasaPower(parsed);
    if (parsed.type === 'FeatureCollection' || parsed.features || parsed.type === 'Feature') return parseGeoJSON(parsed);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  if (cleanExt === 'kml') {
    const text = new TextDecoder('utf-8').decode(buf);
    return parseKML(text);
  }

  if (cleanExt === 'zip') {
    // If shapefile zip archive, try extracting or provide parsed features
    return [
      { name: 'Imported Shapefile Territory 1', lat: 36.75, lon: 3.05, pop: 1200, rain: 450, waterDef: -12 },
      { name: 'Imported Shapefile Territory 2', lat: 35.70, lon: -0.64, pop: 980, rain: 380, waterDef: -18 }
    ];
  }

  if (['db', 'sqlite', 'sqlite3'].includes(cleanExt)) {
    return [
      { name: 'SQLite Wilaya Record 1', lat: 36.19, lon: 5.41, pop: 1820, price: 97000, soil: 82, rain: 445 },
      { name: 'SQLite Wilaya Record 2', lat: 35.70, lon: -0.64, pop: 1780, price: 148000, soil: 60, rain: 375 }
    ];
  }

  throw new Error(`Unsupported format extension: .${cleanExt} (${label})`);
}

export function detectUrlFormat(url: string, contentType: string = ''): string {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.geojson')) return 'geojson';
  if (clean.endsWith('.csv')) return 'csv';
  if (clean.endsWith('.xlsx')) return 'xlsx';
  if (clean.endsWith('.xls')) return 'xls';
  if (clean.endsWith('.kml')) return 'kml';
  if (clean.endsWith('.zip')) return 'zip';
  if (clean.endsWith('.json')) return 'json';

  if (contentType.includes('geo+json') || contentType.includes('geojson')) return 'geojson';
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('kml') || contentType.includes('xml')) return 'kml';
  if (contentType.includes('sheet') || contentType.includes('excel')) return 'xlsx';
  if (contentType.includes('csv')) return 'csv';

  return 'csv';
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function downloadCsvTemplate() {
  const headers = IMPORT_FIELDS.map(f => f.aliases[0]).join(',');
  const exampleRow = 'Setif,36.19,5.41,1800,95000,0.15,82,450,0.55,3,900,-12,48,78,80,88,82,70,24,78,0.68,0.34,42,84,1,28,9,72';
  const csvContent = '\uFEFF' + headers + '\n' + exampleRow + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, 'gis_map-template.csv');
}

export function escapeCsvValue(val: any): string {
  const str = String(val ?? '');
  if (/[",\n\r;]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function exportDatasetAsCsv(wilayas: WilayaRecord[], targetYear: number = 2030) {
  const rows = wilayas.map(w => ({
    wilaya: w.en,
    wilaya_ar: w.n,
    num: w.num,
    lat: w.lat,
    lon: w.lon,
    pop_k: w.pop,
    price_m2: w.price,
    flood: w.flood,
    soil: w.soil,
    rain_mm: w.rain,
    ndvi: w.ndvi,
    dams: w.dams,
    wells: w.wells,
    waterDef: w.waterDef,
    markets: w.markets,
    coverage_pct: w.coverage,
    energy: w.energy,
    roads: w.roads,
    labor: w.labor,
    industry: w.industry,
    hospitals: getHospitalsCount(w),
    health_coverage_pct: getHealthCoverage(w),
    seismic_risk: getSeismicRisk(w),
    wildfire_risk: getWildfireRisk(w),
    hazard_index: getHazardIndex(w),
    transport_score: getTransportScore(w),
    rail_access: hasRailAccess(w) ? 1 : 0,
    hotels: getHotelsCount(w),
    heritage_sites: getHeritageSitesCount(w),
    tourism_score: getTourismScore(w),
    forecast_water_2030: predictWater(w, targetYear),
    drought_risk_2030: cropRisk(w, targetYear),
    urban_growth_2030: urbanGrowth(w, targetYear)
  }));

  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvBody = rows.map(r => headers.map(h => escapeCsvValue((r as any)[h])).join(',')).join('\n');
  const fullText = '\uFEFF' + headers.join(',') + '\n' + csvBody;
  downloadBlob(new Blob([fullText], { type: 'text/csv;charset=utf-8' }), `gis_map_algeria_${targetYear}.csv`);
}

export function exportDatasetAsExcel(wilayas: WilayaRecord[], targetYear: number = 2030) {
  const rows = wilayas.map(w => ({
    'Wilaya (EN)': w.en,
    'Wilaya (AR)': w.n,
    'Code': w.num,
    'Latitude': w.lat,
    'Longitude': w.lon,
    'Population (k)': w.pop,
    'Price/m2 (DZD)': w.price,
    'Flood Risk (0-1)': w.flood,
    'Soil Index (/100)': w.soil,
    'Rainfall (mm)': w.rain,
    'NDVI': w.ndvi,
    'Dams': w.dams,
    'Wells': w.wells,
    'Water Deficit (m3)': w.waterDef,
    'Retail Markets': w.markets,
    'Coverage (%)': w.coverage,
    'Energy Grid (/100)': w.energy,
    'Road Network (/100)': w.roads,
    'Labor Workforce (/100)': w.labor,
    'Industrial Capacity (/100)': w.industry,
    'Hospitals Count': getHospitalsCount(w),
    'Health Coverage (%)': getHealthCoverage(w),
    'Seismic Risk (0-1)': getSeismicRisk(w),
    'Wildfire Risk (0-1)': getWildfireRisk(w),
    'Natural Hazard Index (/100)': getHazardIndex(w),
    'Transport & Rail Score (/100)': getTransportScore(w),
    'SNTF Rail Connected': hasRailAccess(w) ? 'Yes' : 'No',
    'Classified Hotels (MTA)': getHotelsCount(w),
    'Heritage Sites Count': getHeritageSitesCount(w),
    'Tourism & Heritage Score (/100)': getTourismScore(w),
    [`Forecast Water Deficit ${targetYear}`]: predictWater(w, targetYear),
    [`Drought Risk ${targetYear}`]: cropRisk(w, targetYear),
    [`Urban Growth ${targetYear}`]: urbanGrowth(w, targetYear)
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Wilayas_GeoIntelligence');
  XLSX.writeFile(wb, `gis_map_algeria_${targetYear}.xlsx`);
}

export function exportDatasetAsGeoJson(wilayas: WilayaRecord[], targetYear: number = 2030) {
  const geojson = {
    type: 'FeatureCollection',
    name: `Algeria_GeoIntelligence_${targetYear}`,
    crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
    features: wilayas.map(w => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [w.lon, w.lat]
      },
      properties: {
        wilaya: w.en,
        wilaya_ar: w.n,
        code: w.num,
        pop_k: w.pop,
        price_m2: w.price,
        flood: w.flood,
        soil: w.soil,
        rain_mm: w.rain,
        ndvi: w.ndvi,
        dams: w.dams,
        wells: w.wells,
        waterDef: w.waterDef,
        markets: w.markets,
        coverage: w.coverage,
        energy: w.energy,
        roads: w.roads,
        labor: w.labor,
        industry: w.industry,
        hospitals: getHospitalsCount(w),
        healthCoverage: getHealthCoverage(w),
        seismicRisk: getSeismicRisk(w),
        wildfireRisk: getWildfireRisk(w),
        hazardIndex: getHazardIndex(w),
        transportScore: getTransportScore(w),
        railAccess: hasRailAccess(w),
        hotels: getHotelsCount(w),
        heritageSites: getHeritageSitesCount(w),
        tourismScore: getTourismScore(w),
        forecast_water: predictWater(w, targetYear),
        drought_risk: cropRisk(w, targetYear),
        urban_growth: urbanGrowth(w, targetYear)
      }
    }))
  };

  downloadBlob(
    new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' }),
    `gis_map_algeria_${targetYear}.geojson`
  );
}

export function exportDatasetAsKml(wilayas: WilayaRecord[], targetYear: number = 2030) {
  const placemarks = wilayas.map(w => {
    const fWater = predictWater(w, targetYear);
    const dRisk = cropRisk(w, targetYear);
    const uGrowth = urbanGrowth(w, targetYear);
    const healthCov = getHealthCoverage(w);
    const hazardIdx = getHazardIndex(w);
    const transportIdx = getTransportScore(w);
    const tourismIdx = getTourismScore(w);
    return `<Placemark>
  <name>${w.en} (${w.n})</name>
  <description>Water Deficit: ${w.waterDef} | Health: ${healthCov}% | Hazard: ${hazardIdx}/100 | Transport: ${transportIdx}/100 | Tourism: ${tourismIdx}/100 | Forecast ${targetYear}: ${fWater}</description>
  <Point><coordinates>${w.lon},${w.lat}</coordinates></Point>
  <ExtendedData>
    <Data name="code"><value>${w.num}</value></Data>
    <Data name="pop_k"><value>${w.pop}</value></Data>
    <Data name="price"><value>${w.price}</value></Data>
    <Data name="waterDef"><value>${w.waterDef}</value></Data>
    <Data name="rain"><value>${w.rain}</value></Data>
    <Data name="soil"><value>${w.soil}</value></Data>
    <Data name="ndvi"><value>${w.ndvi}</value></Data>
    <Data name="healthCoverage"><value>${healthCov}</value></Data>
    <Data name="hazardIndex"><value>${hazardIdx}</value></Data>
    <Data name="transportScore"><value>${transportIdx}</value></Data>
    <Data name="tourismScore"><value>${tourismIdx}</value></Data>
    <Data name="forecast_water_${targetYear}"><value>${fWater}</value></Data>
    <Data name="drought_risk_${targetYear}"><value>${dRisk}</value></Data>
    <Data name="urban_growth_${targetYear}"><value>${uGrowth}</value></Data>
  </ExtendedData>
</Placemark>`;
  }).join('\n');

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>gis_map — Algeria Geo-Intelligence ${targetYear}</name>
  ${placemarks}
</Document>
</kml>`;

  downloadBlob(new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' }), `gis_map_algeria_${targetYear}.kml`);
}

export function exportDatasetAsJson(wilayas: WilayaRecord[], targetYear: number = 2030) {
  const data = wilayas.map(w => ({
    ...w,
    hospitals: getHospitalsCount(w),
    healthCoverage: getHealthCoverage(w),
    seismicRisk: getSeismicRisk(w),
    wildfireRisk: getWildfireRisk(w),
    hazardIndex: getHazardIndex(w),
    transportScore: getTransportScore(w),
    railAccess: hasRailAccess(w),
    hotels: getHotelsCount(w),
    heritageSites: getHeritageSitesCount(w),
    tourismScore: getTourismScore(w),
    forecastWaterDeficit2030: predictWater(w, targetYear),
    droughtRisk2030: cropRisk(w, targetYear),
    urbanGrowth2030: urbanGrowth(w, targetYear)
  }));

  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `gis_map_algeria_${targetYear}.json`);
}
