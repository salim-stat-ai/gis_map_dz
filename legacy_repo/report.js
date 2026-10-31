// ===== gis_map — Detailed Professional Reports (wilayas & cases) v2 =====
// © 2026 Copyright salim-slimani
// Detailed A4 reports: full 18-indicator tables, national-average comparison,
// per-sector deep dives, year-by-year forecasts 2026-2035, anomaly detail,
// prioritized action plan (owner + horizon + impact). Offline. Print=>PDF.
(function(){
'use strict';

var LS_KEY = 'gismap_reports_v2';

var I18N = {
  ar: {
    title: 'تقرير جيو-استخباراتي مفصّل', subtitle: 'الجزائر — تحليل الولايات والحالات',
    scope: 'نطاق التقرير', wilaya: 'ولاية', multis: 'مقارنة ولايات', national: 'وطني شامل', kase: 'حالة موضوعاتية',
    caseType: 'نوع الحالة', year: 'أفق التوقع', lang: 'اللغة',
    c_water: '💧 أزمة مياه — عجز مائي', c_drought: '🌾 جفاف فلاحي — خطر المحاصيل',
    c_urban: '🏙️ توسع عمراني', c_retail: '🛒 فجوة تجارية', c_flood: '🌊 فيضانات وعقار', c_industry: '🏭 صناعة وطاقة', c_anomaly: '⚠️ شذوذات مكتشفة بالذكاء الاصطناعي',
    generate: '✨ توليد التقرير المفصّل', print: '🖨️ طباعة / PDF', html: '⬇ HTML مستقل', csv: '⬇ CSV الجداول', close: '✕ إغلاق',
    exec: 'الملخص التنفيذي', kpis: 'مؤشرات رئيسية',
    s_ind: '1) بطاقة المؤشرات التفصيلية (18 مؤشراً)',
    s_sec: '2) التحليل القطاعي المعمّق',
    s_fc: '3) التوقعات سنة بسنة 2026–2035',
    s_risk: '4) مصفوفة المخاطر والشذوذات',
    s_plan: '5) خطة العمل ذات الأولوية (مسؤول + أفق + أثر)',
    s_full: '6) الجدول الشامل للولايات المشمولة',
    method: '7) المنهجية والمصادر والاعتماد',
    wilayasCovered: 'الولايات المشمولة', date: 'التاريخ', horizon: 'الأفق', classification: 'وثيقة عمل — للاستغلال الداخلي',
    p1: 'عاجل P1', p2: 'متوسط P2', p3: 'تخطيط P3',
    stable: 'مستقرة', critical: 'حرجة', high: 'مرتفعة', watch: 'للمراقبة',
    footer: 'أُنتج آلياً من gis_map (GIS + AI). بيانات توضيحية — دقق مع ONM / ANRH / DSA / ONS قبل القرار الرسمي.',
    noData: 'لا توجد بيانات — تحقق من تحميل data.js',
    value: 'القيمة', natAvg: 'المتوسط الوطني', rank: 'الترتيب', status: 'الوضع',
    owner: 'الجهة المسؤولة', horizonCol: 'الأفق الزمني', impact: 'الأثر المتوقع', action: 'الإجراء',
    above: 'فوق المتوسط', below: 'دون المتوسط', near: 'قريب من المتوسط',
    reportId: 'رقم التقرير', preparedBy: 'أُعدّ بواسطة', signature: 'التوقيع والختم'
  },
  fr: {
    title: 'Rapport Géo-Intelligence détaillé', subtitle: 'Algérie — Wilayas & cas thématiques',
    scope: 'Périmètre', wilaya: 'Wilaya', multis: 'Comparaison', national: 'National', kase: 'Cas thématique',
    caseType: 'Type de cas', year: 'Horizon', lang: 'Langue',
    c_water: '💧 Crise eau — déficit hydrique', c_drought: '🌾 Sécheresse — risque cultures',
    c_urban: '🏙️ Expansion urbaine', c_retail: '🛒 Désert commercial', c_flood: '🌊 Inondations & foncier', c_industry: '🏭 Industrie & énergie', c_anomaly: "⚠️ Anomalies détectées par l'IA",
    generate: '✨ Générer le rapport détaillé', print: '🖨️ Imprimer / PDF', html: '⬇ HTML autonome', csv: '⬇ CSV tableaux', close: '✕ Fermer',
    exec: 'Résumé exécutif', kpis: 'Indicateurs clés',
    s_ind: '1) Fiche détaillée des indicateurs (18)',
    s_sec: '2) Analyse sectorielle approfondie',
    s_fc: '3) Prévisions année par année 2026–2035',
    s_risk: '4) Matrice des risques & anomalies',
    s_plan: '5) Plan d’action prioritaire (responsable + horizon + impact)',
    s_full: '6) Tableau global des wilayas couvertes',
    method: '7) Méthodologie, sources & validation',
    wilayasCovered: 'Wilayas couvertes', date: 'Date', horizon: 'Horizon', classification: 'Document de travail — usage interne',
    p1: 'Urgent P1', p2: 'Moyen P2', p3: 'Planification P3',
    stable: 'stable', critical: 'critique', high: 'élevé', watch: 'à surveiller',
    footer: 'Généré par gis_map (SIG + IA). Données démo — vérifier ONM / ANRH / DSA / ONS avant décision officielle.',
    noData: 'Pas de données — vérifiez data.js',
    value: 'Valeur', natAvg: 'Moyenne nat.', rank: 'Rang', status: 'Statut',
    owner: 'Responsable', horizonCol: 'Horizon', impact: 'Impact attendu', action: 'Action',
    above: 'au-dessus', below: 'en dessous', near: 'proche',
    reportId: 'N° rapport', preparedBy: 'Préparé par', signature: 'Signature & cachet'
  },
  en: {
    title: 'Detailed Geo-Intelligence Report', subtitle: 'Algeria — Wilayas & thematic cases',
    scope: 'Scope', wilaya: 'Wilaya', multis: 'Compare', national: 'National', kase: 'Thematic case',
    caseType: 'Case type', year: 'Horizon', lang: 'Language',
    c_water: '💧 Water crisis — deficit', c_drought: '🌾 Crop drought risk',
    c_urban: '🏙️ Urban expansion', c_retail: '🛒 Retail gap', c_flood: '🌊 Floods & land', c_industry: '🏭 Industry & energy', c_anomaly: '⚠️ AI-flagged anomalies',
    generate: '✨ Generate detailed report', print: '🖨️ Print / PDF', html: '⬇ Standalone HTML', csv: '⬇ CSV tables', close: '✕ Close',
    exec: 'Executive summary', kpis: 'Key figures',
    s_ind: '1) Detailed indicator sheet (18 indicators)',
    s_sec: '2) In-depth sector analysis',
    s_fc: '3) Year-by-year forecasts 2026–2035',
    s_risk: '4) Risk matrix & anomalies',
    s_plan: '5) Prioritized action plan (owner + horizon + impact)',
    s_full: '6) Full table of covered wilayas',
    method: '7) Methodology, sources & validation',
    wilayasCovered: 'Wilayas covered', date: 'Date', horizon: 'Horizon', classification: 'Working document — internal use',
    p1: 'Urgent P1', p2: 'Medium P2', p3: 'Planning P3',
    stable: 'stable', critical: 'critical', high: 'high', watch: 'watch',
    footer: 'Auto-generated by gis_map (GIS + AI). Demo data — cross-check ONM / ANRH / DSA / ONS before official decisions.',
    noData: 'No data — check data.js',
    value: 'Value', natAvg: 'Nat. avg', rank: 'Rank', status: 'Status',
    owner: 'Owner', horizonCol: 'Horizon', impact: 'Expected impact', action: 'Action',
    above: 'above avg', below: 'below avg', near: 'near avg',
    reportId: 'Report ID', preparedBy: 'Prepared by', signature: 'Signature & stamp'
  }
};

var lastDoc = { html: '', rows: [], meta: null, detail: [] };
var _caseKind = 'water', _caseLang = 'ar';

function T(lang){ return I18N[lang] || I18N.ar; }
function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function G(name, fb){ try{ if(typeof window[name]==='function') return window[name]; }catch(e){} return fb; }
function wilayas(){ try{ return (typeof WILAYAS!=='undefined' && WILAYAS) ? WILAYAS : []; }catch(e){ return []; } }
function wByEn(en){ var ws=wilayas(); for(var i=0;i<ws.length;i++) if(ws[i].en===en) return ws[i]; return null; }
function disp(w){ try{ if(typeof displayName==='function') return displayName(w); }catch(e){} return (w.en||'')+' · '+(w.n||''); }
function fmt(n){ return Number(n||0).toLocaleString('en-US'); }

// ---------- risk ----------
function riskOf(w, year){
  var pw=G('predictWater',null), cr=G('cropRisk',null), cg=G('coverageGap',function(x){return 100-(x.coverage||0);});
  var s=0;
  try{
    if(pw && pw(w,year)<-25) s+=2; else if(pw && pw(w,year)<-10) s+=1;
    if((w.flood||0)>0.4) s+=2; else if((w.flood||0)>0.25) s+=1;
    if(cr && cr(w,year)>60) s+=2; else if(cr && cr(w,year)>45) s+=1;
    if(cg(w)>30) s+=1;
  }catch(e){}
  return s>=5?3 : s>=3?2 : s>=1?1 : 0;
}
function riskLabel(lv, t){ return lv===3?('🔴 '+t.critical) : lv===2?('🟠 '+t.high) : lv===1?('🟡 '+t.watch) : ('🟢 '+t.stable); }

// ---------- national stats ----------
function natAvg(f){
  var ws=wilayas(); if(!ws.length) return 0;
  var s=0; ws.forEach(function(w){ s += (+f(w))||0; });
  return s/ws.length;
}
function rankOf(w, fn, desc){
  var ws=wilayas().slice().sort(function(a,b){ return desc ? fn(b)-fn(a) : fn(a)-fn(b); });
  for(var i=0;i<ws.length;i++) if(ws[i].en===w.en) return (i+1)+' / '+ws.length;
  return '—';
}
function vsAvg(v, avg, lang, invert){
  var d = v - avg, tol = Math.abs(avg)*0.08 + 0.5;
  var good = invert ? d < -tol : d > tol;
  var bad  = invert ? d > tol : d < -tol;
  var t = T(lang);
  if(!bad && !good) return '⚪ '+t.near;
  if(lang==='fr') return (bad?'🔻 ':'▲ ')+Math.abs(Math.round(d))+(good?' (favorable)':' (défavorable)');
  if(lang==='en') return (bad?'🔻 ':'▲ ')+Math.abs(Math.round(d))+(good?' (good)':' (bad)');
  return (bad?'🔻 ':'▲ ')+Math.abs(Math.round(d))+(good?' (جيد)':' (يستدعي التدخل)');
}

// ---------- cases ----------
function caseList(kind, year){
  var ws=wilayas().slice();
  var pw=G('predictWater',function(){return 0;}), cr=G('cropRisk',function(){return 0;}),
      ug=G('urbanGrowth',function(){return 0;}), cg=G('coverageGap',function(x){return 100-(x.coverage||0);}),
      isc=G('industryScore',function(){return 50;}), an=G('anomaly',function(){return null;});
  var scored = ws.map(function(w){
    var k=0, why='';
    if(kind==='water'){ k=pw(w,year); why='deficit '+k; }
    else if(kind==='drought'){ k=-cr(w,year); why=cr(w,year)+'%'; }
    else if(kind==='urban'){ k=-ug(w,year); why='+'+ug(w,year)+'%'; }
    else if(kind==='retail'){ k=-cg(w); why=cg(w)+'% gap'; }
    else if(kind==='flood'){ k=-(w.flood*100 + (w.price/50000)); why=Math.round(w.flood*100)+'%'; }
    else if(kind==='industry'){ k=isc(w); why=isc(w)+'/100'; }
    else if(kind==='anomaly'){ k=an(w)?-100:0; why=an(w)||'stable'; }
    return {w:w,k:k,why:why};
  });
  scored.sort(function(a,b){ return a.k-b.k; });
  if(kind==='industry') scored.reverse();
  if(kind==='anomaly') scored.sort(function(a,b){ return ((b.w&&G('anomaly',function(){return null;})(b.w))?1:0)-((a.w&&G('anomaly',function(){return null;})(a.w))?1:0); });
  return scored.slice(0,10);
}
function currentCaseLabel(lang){
  var t=T(lang||_caseLang);
  return {water:t.c_water,drought:t.c_drought,urban:t.c_urban,retail:t.c_retail,flood:t.c_flood,industry:t.c_industry,anomaly:t.c_anomaly}[_caseKind]||t.c_water;
}

// ---------- detailed narratives ----------
function summarizeWilaya(w, year, lang){
  var pw=G('predictWater',function(){return 0;}), cr=G('cropRisk',function(){return 0;}), ug=G('urbanGrowth',function(){return 0;});
  var cg=G('coverageGap',function(x){return 100-(x.coverage||0);})(w);
  if(lang==='fr') return 'Déficit eau '+pw(w,year)+', sécheresse '+cr(w,year)+'%, croissance +'+ug(w,year)+'%, gap commercial '+cg+'%, inondation '+Math.round((w.flood||0)*100)+'%, site industriel '+G('industryScore',function(){return 0;})(w)+'/100.';
  if(lang==='en') return 'Water '+pw(w,year)+', drought '+cr(w,year)+'%, growth +'+ug(w,year)+'%, retail gap '+cg+'%, flood '+Math.round((w.flood||0)*100)+'%, industry '+G('industryScore',function(){return 0;})(w)+'/100.';
  return 'عجز مائي '+pw(w,year)+'، خطر جفاف '+cr(w,year)+'٪، نمو عمراني +'+ug(w,year)+'٪، فجوة تجارية '+cg+'٪، فيضان '+Math.round((w.flood||0)*100)+'٪، موقع صناعي '+G('industryScore',function(){return 0;})(w)+'/100.';
}

function narrative(scope, list, year, lang){
  var t=T(lang);
  var crit=list.filter(function(x){return riskOf(x.w,year)===3;}).length;
  var head = lang==='fr'
    ? 'Ce rapport détaillé couvre <b>'+list.length+' wilaya(s)</b> à horizon <b>'+year+'</b>, dont <b>'+crit+' critique(s)</b>. Chaque wilaya est documentée par 18 indicateurs, une analyse sectorielle en 5 volets, des prévisions 2026–2035 et un plan d’action chiffré.'
    : lang==='en'
    ? 'This detailed report covers <b>'+list.length+' wilaya(s)</b> to <b>'+year+'</b>, including <b>'+crit+' critical</b>. Each wilaya is documented with 18 indicators, 5-sector deep dives, 2026–2035 forecasts and a costed action plan.'
    : 'يغطي هذا التقرير المفصّل <b>'+list.length+' ولاية</b> في أفق <b>'+year+'</b>، منها <b>'+crit+' حرجة</b>. كل ولاية موثقة بـ18 مؤشراً، وتحليل قطاعي في 5 محاور، وتوقعات 2026–2035، وخطة عمل مُرقمة بالأولوية والمسؤول والأفق.';
  if(scope==='wilaya'&&list.length){
    var w=list[0].w;
    head += lang==='fr' ? '<br>Focus : <b>'+esc(disp(w))+'</b> — risque global <b>'+esc(riskLabel(riskOf(w,year),t))+'</b>. '+esc(summarizeWilaya(w,year,'fr'))
      : lang==='en' ? '<br>Focus: <b>'+esc(disp(w))+'</b> — overall <b>'+esc(riskLabel(riskOf(w,year),t))+'</b>. '+esc(summarizeWilaya(w,year,'en'))
      : '<br>التركيز: <b>'+esc(disp(w))+'</b> — خطر إجمالي <b>'+esc(riskLabel(riskOf(w,year),t))+'</b>. '+esc(summarizeWilaya(w,year,'ar'));
  } else if(scope==='case'){
    head += lang==='fr' ? '<br>Cas : <b>'+esc(currentCaseLabel(lang))+'</b> — top-10 classé avec justifications chiffrées.'
      : lang==='en' ? '<br>Case: <b>'+esc(currentCaseLabel(lang))+'</b> — ranked top-10 with quantified justification.'
      : '<br>الحالة: <b>'+esc(currentCaseLabel(lang))+'</b> — ترتيب العشر الأكثر تعرضاً مع تبرير مُرقم لكل ولاية.';
  } else if(scope==='compare'){
    head += lang==='fr' ? '<br>Comparaison directe indicateur par indicateur avec écarts à la moyenne nationale.'
      : lang==='en' ? '<br>Direct indicator-by-indicator comparison with gaps to national average.'
      : '<br>مقارنة مباشرة مؤشراً بمؤشر مع الفجوة عن المتوسط الوطني لكل ولاية.';
  }
  return head;
}

// تحليل قطاعي مفصّل لكل ولاية
function sectorDeep(w, sector, year, lang){
  var pw=G('predictWater',function(){return 0;}), cr=G('cropRisk',function(){return 0;}),
      ug=G('urbanGrowth',function(){return 0;}), cg=G('coverageGap',function(x){return 100-(x.coverage||0);}),
      isc=G('industryScore',function(){return 50;});
  var ar = lang!=='fr' && lang!=='en';
  if(sector==='water'){
    var d='💧 '+(ar?'المياه: ':'Eau : ')+'dams='+w.dams+', wells='+fmt(w.wells)+', rain='+w.rain+'mm → '
      + (ar?('العجز المتوقع '+pw(w,year)+' في '+year+'. ') : ('déficit prévu '+pw(w,year)+' en '+year+'. '))
      + (pw(w,year)<-25 ? (ar?'الوضع حرج: الطلب (سكان '+fmt(w.pop)+'k) يفوق التغذية. المطلوب: تحلية/حفر مقنن + عدادات + سقي ذكي.':'critique : forages pilotés + comptage + irrigation goutte-à-goutte.')
        : pw(w,year)<-10 ? (ar?'وضع متوسط: ترشيد الشبكة وصيانة التسربات كافٍ على المدى القصير.':'moyen : sobriété réseau + anti-fuites.')
        : (ar?'وضع متحكم فيه: صيانة وقائية وتخزين.':'maîtrisé : maintenance préventive.'));
    return d;
  }
  if(sector==='agri'){
    var droughtTxt = ar ? ('خطر الجفاف ' + cr(w,year) + '٪ في ' + year + '. ') : ('secheresse ' + cr(w,year) + '% en ' + year + '. ');
    var zoneTxt = (w.rain<200) ? (ar ? 'منطقة جافة: الزراعة الصحراوية + تحلية + بيوت محمية.' : 'zone aride : saharien + dessalement + serres.') : (ar ? 'تحسين التربة + تنقيط + إنذار مبكر قبل الحصاد.' : 'sols + goutte-a-goutte + alerte pre-recolte.');
    var s='🌾 '+(ar?'الفلاحة: ':'Agri : ')+'soil='+w.soil+'/100, rain='+w.rain+'mm, NDVI='+w.ndvi+' -> '+suit(w)+' | ' + droughtTxt + zoneTxt;
    return s;
  }
  if(sector==='realestate'){
    var floodTxt;
    if((w.flood||0)>0.4) floodTxt = ar ? 'خطر فيضان مرتفع: تجميد البناء في الاودية + توجيه النمو للهضاب + مسح الاراضي الشاغرة.' : 'inondation elevee : gel oueds + plateaux + cadastre satellite.';
    else if(w.price>120000) floodTxt = ar ? 'اسعار ملتهبة: رقمنة العقود + كشف الاراضي الخاملة لتهدئة السوق.' : 'prix eleves : titres numeriques + foncier dormant.';
    else floodTxt = ar ? 'سوق متوازنة: احياء جديدة مخططة مع شبكات.' : 'marche equilibre : nouveaux quartiers planifies.';
    var growthTxt = ar ? (' نمو متوقع +' + ug(w,year) + '٪.') : (' croissance +' + ug(w,year) + '%.');
    return '🏠 '+(ar?'العقار: ':'Foncier : ')+'price='+fmt(w.price)+' DZD/m2, flood='+Math.round((w.flood||0)*100)+'% -> '
      + floodTxt + growthTxt;
  }
  if(sector==='commerce'){
    return '🛒 '+(ar?'التجارة: ':'Commerce : ')+'markets='+w.markets+', coverage='+w.coverage+'% (gap '+cg(w)+'%) → '
      + (cg(w)>30 ? (ar?'فجوة حادة: سوق جديد/مستودع أولوية P1 يغطي '+cg(w)+'٪.':'gap sévère : nouveau marché P1.') : cg(w)>15 ? (ar?'فجوة متوسطة: نقطة بيع وسيطة.':'gap moyen : point de vente.') : (ar?'تغطية جيدة: تحسين اللوجستيك.':'bonne couverture : logistique.'));
  }
  var sc=isc(w);
  return '🏭 '+(ar?'الصناعة: ':'Industrie : ')+'score='+sc+'/100 (energy='+w.energy+', roads='+w.roads+', labor='+w.labor+') → '
    + (sc>70 ? (ar?'موقع ممتاز: منطقة صناعية جاهزة للمستثمرين.':'site excellent : zone prête.') : (ar?('موقع متوسط: الناقص: '+((w.waterDef<-20)?'ماء ':'')+((w.roads<75)?'طرق ':'')+((w.energy<70)?'طاقة':'')+' — عالجه قبل التسويق.') : ('site moyen — combler eau/route/énergie.')));
  function suit(x){ try{ return G('suitabilityAgri',function(){return ''; })(x); }catch(e){ return ''; } }
}

// خطة عمل مفصلة: إجراء + أولوية + أفق + مسؤول + أثر
function actionPlan(w, year, lang){
  var pw=G('predictWater',function(){return 0;}), cr=G('cropRisk',function(){return 0;}),
      ug=G('urbanGrowth',function(){return 0;}), cg=G('coverageGap',function(x){return 100-(x.coverage||0);}),
      isc=G('industryScore',function(){return 50;});
  var t=T(lang), P=[];
  var ar = lang!=='fr'&&lang!=='en';
  var FR = (lang==='fr');
  function pick(a,f,e){ if(ar) return a; if(FR) return f; return e; }
  function own(a,f,e){ return pick(a,f,e); }
  var MO = ar ? 'شهرا' : 'mois';
  if(pw(w,year)<-25) P.push({p:t.p1, a: pick('تامين الماء (عجز '+pw(w,year)+'): حفر مقنن + عدادات + سقي بالتنقيط', 'Securiser eau (deficit '+pw(w,year)+'): forages pilotes + compteurs + goutte-a-goutte', 'Secure water (deficit '+pw(w,year)+'): managed wells + metering + drip'), h:'0-18 '+MO, o: own('ANRH + مديرية الري + البلدية','ANRH + Hydraulique + APC','ANRH + Water dept + municipality'), e: pick('خفض العجز 30-40٪', 'deficit -30-40%', 'deficit -30-40%')});
  else if(pw(w,year)<-10) P.push({p:t.p2, a: pick('برنامج ضد التسربات + تحسيس + صيانة الشبكة', 'Anti-fuites + sensibilisation + maintenance', 'Anti-leak program + metering + maintenance'), h:'0-12 '+MO, o: own('مديرية الري + الجزائرية للمياه','Hydraulique + ADE','Water utility'), e: pick('توفير 10-15٪ من الضياع', 'pertes -10-15%', 'losses -10-15%')});
  if((w.flood||0)>0.35) P.push({p:t.p1, a: pick('منع البناء في الاودية + تحويل النمو للهضاب الامنة + قنوات تصريف', 'Gel oueds + plateaux surs + drainage', 'Freeze wadi beds + safe plateaus + drainage'), h:'0-24 '+MO, o: own('الولاية + التعمير + الحماية المدنية','Wilaya + Urbanisme + Protection civile','Wilaya + Planning + Civil protection'), e: pick('خفض الخسائر الفيضانية جذريا', 'pertes inondations reduites', 'flood losses cut')});
  if(cg(w)>25) P.push({p:t.p2, a: pick('سوق/مستودع جديد يغطي فجوة '+cg(w)+'٪', 'Nouveau marche - gap '+cg(w)+'%', 'New market - gap '+cg(w)+'%'), h:'6-18 '+MO, o: own('مديرية التجارة + البلدية','Commerce + APC','Trade dept + municipality'), e: pick('تغطية +'+Math.round(cg(w)/2)+'٪ واسعار اقل', 'couverture +, prix -', 'coverage up, prices down')});
  var suitTxt=''; try{ suitTxt=G('suitabilityAgri',function(){return ''; })(w); }catch(e){ suitTxt=''; }
  P.push({p: cr(w,year)>60?t.p1:t.p2, a: pick('الفلاحة: ', 'Agri: ', 'Agri: ')+suitTxt+' ('+cr(w,year)+'%)', h:'0-36 '+MO, o: own('DSA + الغرفة الفلاحية', 'DSA + Chambre agriculture', 'DSA + farmers'), e: pick('حماية المحصول ومردودية اعلى', 'rendement protege', 'protected yield')});
  P.push({p:t.p3, a: pick('حي جديد مخطط يستوعب +'+ug(w,year)+'٪ نمو عمراني', 'Nouveau quartier +'+ug(w,year)+'%', 'New district +'+ug(w,year)+'%'), h:'12-48 '+MO, o: own('الولاية + التعمير + الوكالة العقارية','Wilaya + Urbanisme + Agence fonciere','Wilaya + Planning'), e: pick('امتصاص النمو دون فوضى', 'croissance ordonnee', 'orderly growth')});
  var s=isc(w);
  var indAct = (s>70) ? pick('تسويق المنطقة للمستثمرين', 'commercialiser la zone', 'market the zone') : pick('استكمال الناقص (ماء/طريق/طاقة) ثم التسويق', 'combler eau/route/energie', 'fill gaps then market');
  P.push({p: s>70?t.p2:t.p3, a: pick('الصناعة (', 'Industrie (', 'Industry (')+s+'/100): '+indAct, h:'12-36 '+MO, o: own('مديرية الصناعة + الولاية','Industrie + Wilaya','Industry dept'), e: pick('مناصب شغل + جباية محلية', 'emplois + fiscalite', 'jobs + revenue')});
  return P;
}

function reportId(){ var d=new Date(); return 'GIS-'+d.getFullYear()+'-'+String(Math.floor(1000+Math.random()*9000)); }

// ---------- modal ----------
function ensureModal(){
  if(document.getElementById('reportModal')) return;
  var m=document.createElement('div');
  m.id='reportModal'; m.className='rep-modal'; m.style.display='none';
  m.innerHTML =
    '<div class="rep-modal-box" role="dialog" aria-label="reports">'+
      '<div class="rep-modal-head"><b id="repHeadTitle">📄 التقارير المفصّلة</b><button id="repClose" class="btn-ghost">✕</button></div>'+
      '<div class="rep-opts">'+
        '<label>'+esc('النطاق / Périmètre / Scope')+'<select id="repScope">'+
          '<option value="wilaya">📍 ولاية واحدة / Wilaya</option>'+
          '<option value="compare">⚖️ مقارنة ولايات / Comparaison</option>'+
          '<option value="case">🎯 حالة موضوعاتية / Cas thématique</option>'+
          '<option value="national">🇩🇿 توليف وطني / National</option>'+
        '</select></label>'+
        '<label id="repWilWrap">'+esc('الولاية')+'<select id="repWilaya"></select></label>'+
        '<label id="repMultiWrap" style="display:none">'+esc('الولايات (حتى 6)')+'<div id="repMulti" class="rep-multi"></div></label>'+
        '<label id="repCaseWrap" style="display:none">'+esc('الحالة')+'<select id="repCase">'+
          '<option value="water">💧 أزمة مياه</option><option value="drought">🌾 جفاف فلاحي</option>'+
          '<option value="urban">🏙️ توسع عمراني</option><option value="retail">🛒 فجوة تجارية</option>'+
          '<option value="flood">🌊 فيضانات وعقار</option><option value="industry">🏭 صناعة</option>'+
          '<option value="anomaly">⚠️ شذوذات AI</option></select></label>'+
        '<label>'+esc('الأفق')+'<select id="repYear"><option>2027</option><option>2028</option><option>2029</option><option selected>2030</option><option>2031</option><option>2032</option><option>2033</option><option>2035</option></select></label>'+
        '<label>'+esc('اللغة')+'<select id="repLang"><option value="ar" selected>العربية</option><option value="fr">Français</option><option value="en">English</option></select></label>'+
      '</div>'+
      '<div class="rep-actions">'+
        '<button id="repGen" class="btn-gold">✨ توليد التقرير المفصّل</button>'+
        '<button id="repPrint" class="btn-primary">🖨️ طباعة / PDF</button>'+
        '<button id="repHTML" class="btn-ghost">⬇ HTML</button>'+
        '<button id="repCSV" class="btn-ghost">⬇ CSV مفصّل</button>'+
      '</div>'+
      '<div id="reportPreview" class="rep-preview"><span class="rep-hint">اختر النطاق ثم اضغط «توليد التقرير المفصّل» — وثيقة معمقة (18 مؤشراً + 5 قطاعات + توقعات + خطة عمل) جاهزة للطباعة A4.</span></div>'+
    '</div>';
  document.body.appendChild(m);
  document.getElementById('repClose').onclick=closeReport;
  m.addEventListener('click',function(e){ if(e.target===m) closeReport(); });
  document.getElementById('repScope').onchange=syncOptVis;
  document.getElementById('repGen').onclick=generateFromUI;
  document.getElementById('repPrint').onclick=printReport;
  document.getElementById('repHTML').onclick=downloadHTML;
  document.getElementById('repCSV').onclick=downloadCSV;
  document.getElementById('repLang').onchange=function(){ _caseLang=this.value; document.getElementById('repHeadTitle').textContent = '📄 '+T(this.value).title; };
  document.getElementById('repCase').onchange=function(){ _caseKind=this.value; };
  fillWilayaLists();
  syncOptVis();
}
function fillWilayaLists(){
  var ws=wilayas().slice().sort(function(a,b){return (a.num||999)-(b.num||999);});
  var sel=document.getElementById('repWilaya'); if(!sel) return;
  sel.innerHTML=ws.map(function(w){return '<option value="'+esc(w.en)+'">'+esc((w.num<=58?w.num+' — ':'')+disp(w))+'</option>';}).join('');
  try{ sel.value='Setif'; }catch(e){}
  var multi=document.getElementById('repMulti');
  if(multi){
    var top=['Algiers','Oran','Setif','Constantine','Annaba','Blida'];
    multi.innerHTML=ws.map(function(w){
      var c=top.indexOf(w.en)>=0?' checked':'';
      return '<label><input type="checkbox" value="'+esc(w.en)+'"'+c+'> '+esc(disp(w))+'</label>';
    }).join('');
  }
}
function syncOptVis(){
  var s=document.getElementById('repScope').value;
  document.getElementById('repWilWrap').style.display=(s==='wilaya')?'':'none';
  document.getElementById('repMultiWrap').style.display=(s==='compare')?'':'none';
  document.getElementById('repCaseWrap').style.display=(s==='case')?'':'none';
}
function readUI(){
  var scope=document.getElementById('repScope').value;
  var year=parseInt(document.getElementById('repYear').value,10)||2030;
  var lang=document.getElementById('repLang').value||'ar';
  _caseLang=lang; _caseKind=document.getElementById('repCase').value||'water';
  var list=[];
  if(scope==='wilaya'){ var w=wByEn(document.getElementById('repWilaya').value); if(w) list=[{w:w}]; }
  else if(scope==='compare'){
    var boxes=document.querySelectorAll('#repMulti input:checked');
    for(var i=0;i<Math.min(6,boxes.length);i++){ var ww=wByEn(boxes[i].value); if(ww) list.push({w:ww}); }
    if(!list.length){ var all=wilayas().slice(0,4); for(var j=0;j<all.length;j++) list.push({w:all[j]}); }
  }
  else if(scope==='case'){ list=caseList(_caseKind,year).map(function(x){return {w:x.w, why:x.why};}); }
  else { list=wilayas().map(function(w){return {w:w};}); }
  return {scope:scope,year:year,lang:lang,list:list};
}

// ---------- KPIs ----------
function kpiRow(list, year){
  var pw=G('predictWater',function(){return 0;}), cr=G('cropRisk',function(){return 0;}), ug=G('urbanGrowth',function(){return 0;}),
      cg=G('coverageGap',function(x){return 100-(x.coverage||0);});
  var n=list.length||1;
  var avgW=Math.round(list.reduce(function(a,x){return a+pw(x.w,year);},0)/n);
  var avgD=Math.round(list.reduce(function(a,x){return a+cr(x.w,year);},0)/n);
  var totPop=list.reduce(function(a,x){return a+((x.w.pop)||0);},0);
  var maxD=list.slice().sort(function(a,b){return cr(b.w,year)-cr(a.w,year);})[0];
  var maxU=list.slice().sort(function(a,b){return ug(b.w,year)-ug(a.w,year);})[0];
  var crit=list.filter(function(x){return riskOf(x.w,year)===3;}).length;
  var gap=list.filter(function(x){return cg(x.w)>30;}).length;
  return {avgW:avgW, avgD:avgD, totPop:totPop, maxD:maxD, maxU:maxU, crit:crit, gap:gap};
}

// ---------- detailed indicator sheet (18 indicators) ----------
var IND_DEFS = [
  {k:'pop',    l:'السكان (ألف)', f:function(w){return fmt(w.pop)+'k';}, n:function(){return natAvg(function(w){return w.pop;});}, inv:false, r:'rankPop'},
  {k:'price',  l:'السعر م² (دج)', f:function(w){return fmt(w.price);}, n:function(){return natAvg(function(w){return w.price;});}, inv:true, r:'rankPrice'},
  {k:'flood',  l:'الفيضان %', f:function(w){return Math.round((w.flood||0)*100)+'%';}, n:function(){return natAvg(function(w){return (w.flood||0)*100;});}, inv:true, r:'rankFlood'},
  {k:'soil',   l:'التربة /100', f:function(w){return w.soil;}, n:function(){return natAvg(function(w){return w.soil;});}, inv:false, r:'rankSoil'},
  {k:'rain',   l:'الأمطار مم', f:function(w){return w.rain;}, n:function(){return natAvg(function(w){return w.rain;});}, inv:false, r:'rankRain'},
  {k:'ndvi',   l:'NDVI', f:function(w){return w.ndvi;}, n:function(){return natAvg(function(w){return w.ndvi;});}, inv:false, r:'rankNdvi'},
  {k:'dams',   l:'السدود', f:function(w){return w.dams;}, n:function(){return natAvg(function(w){return w.dams;});}, inv:false, r:'rankDams'},
  {k:'wells',  l:'الآبار', f:function(w){return fmt(w.wells);}, n:function(){return natAvg(function(w){return w.wells;});}, inv:true, r:'rankWells'},
  {k:'waterDef', l:'العجز المائي (أساس)', f:function(w){return w.waterDef;}, n:function(){return natAvg(function(w){return w.waterDef;});}, inv:false, r:'rankWdef'},
  {k:'markets', l:'الأسواق', f:function(w){return w.markets;}, n:function(){return natAvg(function(w){return w.markets;});}, inv:false, r:'rankMarkets'},
  {k:'coverage', l:'التغطية %', f:function(w){return w.coverage+'%';}, n:function(){return natAvg(function(w){return w.coverage;});}, inv:false, r:'rankCov'},
  {k:'energy', l:'الطاقة', f:function(w){return w.energy;}, n:function(){return natAvg(function(w){return w.energy;});}, inv:false, r:'rankEnergy'},
  {k:'roads',  l:'الطرق', f:function(w){return w.roads;}, n:function(){return natAvg(function(w){return w.roads;});}, inv:false, r:'rankRoads'},
  {k:'labor',  l:'اليد العاملة', f:function(w){return w.labor;}, n:function(){return natAvg(function(w){return w.labor;});}, inv:false, r:'rankLabor'},
  {k:'industry', l:'الصناعة', f:function(w){return w.industry;}, n:function(){return natAvg(function(w){return w.industry;});}, inv:false, r:'rankInd'}
];
function indVal(w,k){
  if(k==='flood') return (w.flood||0)*100;
  if(k==='ndvi') return w.ndvi;
  return +w[k]||0;
}
function indAvg(k){
  if(k==='flood') return natAvg(function(w){return (w.flood||0)*100;});
  if(k==='ndvi') return natAvg(function(w){return w.ndvi;});
  return natAvg(function(w){return +w[k]||0;});
}
function indRank(w,k,inv){
  return rankOf(w,function(x){return indVal(x,k);},!inv);
}

// ---------- document ----------
function buildDoc(o){
  var t=T(o.lang), ws=o.list.map(function(x){return x.w;});
  if(!ws.length) return '<p>'+esc(t.noData)+'</p>';
  var rtl=o.lang==='ar'?' dir="rtl" lang="ar"':' lang="'+o.lang+'"';
  var k=kpiRow(o.list,o.year);
  var today=new Date().toISOString().slice(0,10);
  var rid=reportId();
  var scopeLbl={wilaya:t.wilaya,compare:t.multis,case:t.kase,national:t.national}[o.scope];
  var titleScope = o.scope==='wilaya'&&ws[0] ? disp(ws[0])
    : o.scope==='case' ? currentCaseLabel(o.lang)
    : o.scope==='compare' ? ws.map(function(w){return w.en;}).join(' · ')
    : (o.lang==='fr' ? 'Algérie — 58 wilayas' : o.lang==='en' ? 'Algeria — 58 wilayas' : 'الجزائر — 58 ولاية');

  var h='';
  h+='<article class="rep-doc"'+rtl+'>';
  // cover
  h+='<header class="rep-cover"><div class="rep-brand"><div class="rep-logo">🗺️</div><div><div class="rep-title">'+esc(t.title)+'</div><div class="rep-sub">gis_map · GIS + AI — '+esc(t.subtitle)+' — '+esc(scopeLbl)+'</div></div></div>';
  h+='<h1 class="rep-h1">'+esc(titleScope)+'</h1>';
  h+='<div class="rep-meta"><span>🆔 '+esc(t.reportId)+': <b>'+rid+'</b></span><span>📅 '+esc(t.date)+': <b>'+esc(today)+'</b></span><span>🎯 '+esc(t.horizon)+': <b>'+o.year+'</b></span><span>📦 '+esc(t.wilayasCovered)+': <b>'+ws.length+'</b></span></div>';
  h+='<div class="rep-class">'+esc(t.classification)+'</div></header>';
  // exec + kpis
  h+='<section class="rep-sec"><h2>'+esc(t.exec)+'</h2><p class="rep-narr">'+narrative(o.scope,o.list,o.year,o.lang)+'</p><div class="rep-kpis">';
  h+='<div class="rep-kpi"><b>'+k.avgW+'</b><small>'+(o.lang==='fr'?'Déficit eau moyen':'متوسط العجز المائي')+'</small></div>';
  h+='<div class="rep-kpi danger"><b>'+k.crit+'</b><small>'+(o.lang==='fr'?'Wilayas critiques':'ولايات حرجة')+'</small></div>';
  h+='<div class="rep-kpi"><b>'+k.avgD+'%</b><small>'+(o.lang==='fr'?'Sécheresse moyenne':'متوسط خطر الجفاف')+'</small></div>';
  h+='<div class="rep-kpi"><b>'+fmt(k.totPop)+'k</b><small>'+(o.lang==='fr'?'Population couverte':'السكان المشمولون')+'</small></div>';
  h+='<div class="rep-kpi"><b>'+(k.maxD?esc(k.maxD.w.en):'—')+'</b><small>'+(o.lang==='fr'?'Top sécheresse ':'أعلى جفاف ')+(k.maxD?G('cropRisk',function(){return 0;})(k.maxD.w,o.year)+'%':'')+'</small></div>';
  h+='<div class="rep-kpi"><b>'+(k.maxU?esc(k.maxU.w.en):'—')+'</b><small>'+(o.lang==='fr'?'Croissance max +':'أقصى نمو +')+(k.maxU?G('urbanGrowth',function(){return 0;})(k.maxU.w,o.year)+'%':'')+'</small></div>';
  h+='</div></section>';

  // 1) detailed indicator sheets (wilaya: vertical per wilaya; others: compact + full detail rows capped)
  h+='<section class="rep-sec"><h2>'+esc(t.s_ind)+'</h2>';
  var focus = (o.scope==='wilaya'||o.scope==='compare') ? ws : ws.slice(0,10);
  focus.forEach(function(w){
    var lv=riskOf(w,o.year);
    h+='<div class="rep-wil"><div class="rep-wil-head"><b>📍 '+esc(disp(w))+(w.num?' <small>#'+w.num+'</small>':'')+'</b><span class="rep-risk r'+lv+'">'+esc(riskLabel(lv,t))+'</span></div>';
    h+='<div class="rep-wil-grid"><span>👥 '+fmt(w.pop)+'k</span><span>🏠 '+fmt(w.price)+' DZD/m²</span><span>🌧️ '+w.rain+'mm</span><span>💧 '+G('predictWater',function(){return 0;})(w,o.year)+'</span><span>🌾 '+G('cropRisk',function(){return 0;})(w,o.year)+'%</span><span>🏙️ +'+G('urbanGrowth',function(){return 0;})(w,o.year)+'%</span><span>🏭 '+G('industryScore',function(){return 0;})(w)+'/100</span><span>🛒 '+w.coverage+'%</span></div>';
    h+='<div class="rep-twrap"><table class="rep-table rep-detail"><thead><tr><th>'+esc(o.lang==='fr'?'Indicateur':o.lang==='en'?'Indicator':'المؤشر')+'</th><th>'+esc(t.value)+'</th><th>'+esc(t.natAvg)+'</th><th>'+esc(t.rank)+'</th><th>'+esc(t.status)+'</th></tr></thead><tbody>';
    IND_DEFS.forEach(function(d){
      var v=indVal(w,d.k), a=indAvg(d.k);
      var aTxt = (d.k==='flood') ? Math.round(a)+'%' : (d.k==='ndvi') ? (+a).toFixed(2) : (d.k==='price'||d.k==='wells'||d.k==='pop') ? fmt(Math.round(a)) : Math.round(a);
      h+='<tr><td>'+esc(d.l)+'</td><td><b>'+esc(d.f(w))+'</b></td><td>'+esc(aTxt)+'</td><td>'+esc(indRank(w,d.k,d.inv))+'</td><td>'+esc(vsAvg(v,a,o.lang,d.inv))+'</td></tr>';
    });
    // computed forecasts rows
    h+='<tr><td>'+(o.lang==='fr'?'Eau prévue ':'المياه المتوقعة ')+o.year+'</td><td><b>'+G('predictWater',function(){return 0;})(w,o.year)+'</b></td><td>'+Math.round(natAvg(function(x){return G('predictWater',function(){return 0;})(x,o.year);}))+'</td><td>'+esc(rankOf(w,function(x){return G('predictWater',function(){return 0;})(x,o.year);},false))+'</td><td>'+esc(vsAvg(G('predictWater',function(){return 0;})(w,o.year),natAvg(function(x){return G('predictWater',function(){return 0;})(x,o.year);}),o.lang,false))+'</td></tr>';
    h+='<tr><td>'+(o.lang==='fr'?'Sécheresse ':'الجفاف ')+o.year+'</td><td><b>'+G('cropRisk',function(){return 0;})(w,o.year)+'%</b></td><td>'+Math.round(natAvg(function(x){return G('cropRisk',function(){return 0;})(x,o.year);}))+'%</td><td>'+esc(rankOf(w,function(x){return G('cropRisk',function(){return 0;})(x,o.year);},true))+'</td><td>'+esc(vsAvg(G('cropRisk',function(){return 0;})(w,o.year),natAvg(function(x){return G('cropRisk',function(){return 0;})(x,o.year);}),o.lang,true))+'</td></tr>';
    h+='</tbody></table></div>';
    var an=null; try{ an=G('anomaly',function(){return null;})(w); }catch(e){}
    if(an) h+='<div class="rep-anom">🤖 '+esc(an)+'</div>';
    h+='</div>';
  });
  if(o.scope==='national'||o.scope==='case') h+='<p class="rep-note">+ '+(ws.length-focus.length)+' '+(o.lang==='fr'?'wilayas reprises dans le tableau global §6 et le CSV.':'ولايات تجد تفصيلها في الجدول الشامل (قسم 6) وملف CSV.')+'</p>';
  h+='</section>';

  // 2) sector deep dives
  h+='<section class="rep-sec"><h2>'+esc(t.s_sec)+'</h2>';
  var secs=['water','agri','realestate','commerce','industry'];
  var secCap = {water:'💧 '+(o.lang==='fr'?'Eau':o.lang==='en'?'Water':'المياه'), agri:'🌾 '+(o.lang==='fr'?'Agriculture':o.lang==='en'?'Agriculture':'الفلاحة'), realestate:'🏠 '+(o.lang==='fr'?'Foncier':o.lang==='en'?'Real estate':'العقار'), commerce:'🛒 '+(o.lang==='fr'?'Commerce':o.lang==='en'?'Retail':'التجارة'), industry:'🏭 '+(o.lang==='fr'?'Industrie':o.lang==='en'?'Industry':'الصناعة')};
  focus.slice(0, o.scope==='national'?6:10).forEach(function(w){
    h+='<div class="rep-wil"><div class="rep-wil-head"><b>📍 '+esc(disp(w))+'</b><span class="rep-risk r'+riskOf(w,o.year)+'">'+esc(riskLabel(riskOf(w,o.year),t))+'</span></div>';
    secs.forEach(function(s){
      h+='<div class="rep-sect"><b>'+esc(secCap[s])+'</b><p>'+esc(sectorDeep(w,s,o.year,o.lang))+'</p></div>';
    });
    h+='</div>';
  });
  h+='</section>';

  // 3) year-by-year forecasts
  h+='<section class="rep-sec"><h2>'+esc(t.s_fc)+'</h2><div class="rep-twrap"><table class="rep-table"><thead><tr><th>Wilaya</th>';
  for(var y=2026;y<=2035;y++) h+='<th>'+y+'</th>';
  h+='</tr></thead><tbody>';
  var detailRows=[];
  focus.slice(0,12).forEach(function(w){
    var line={wilaya:disp(w)};
    h+='<tr><td><b>'+esc(w.en)+'</b><br><small>💧</small></td>';
    for(var yy=2026;yy<=2035;yy++){ var v=G('predictWater',function(){return 0;})(w,yy); line['water_'+yy]=v; h+='<td>'+v+'</td>'; }
    h+='</tr><tr class="rep-sub"><td><small>🌾 %</small></td>';
    for(var y2=2026;y2<=2035;y2++){ var c=G('cropRisk',function(){return 0;})(w,y2); line['drought_'+y2]=c; h+='<td>'+c+'%</td>'; }
    h+='</tr>';
    detailRows.push(line);
  });
  h+='</tbody></table></div><p class="rep-note">💧 '+(o.lang==='fr'?'lignes principales = déficit hydrique prévu ; lignes secondaires = risque sécheresse %.':'السطور الرئيسية = العجز المائي المتوقع، والفرعية = خطر الجفاف ٪.')+'</p></section>';

  // 4) risk matrix & anomalies
  h+='<section class="rep-sec"><h2>'+esc(t.s_risk)+'</h2><div class="rep-twrap"><table class="rep-table"><thead><tr><th>Wilaya</th><th>'+(o.lang==='fr'?'Eau':'ماء')+'</th><th>'+(o.lang==='fr'?'Inondation':'فيضان')+'</th><th>'+(o.lang==='fr'?'Sécheresse':'جفاف')+'</th><th>'+(o.lang==='fr'?'Commerce':'تجارة')+'</th><th>'+esc(t.status)+'</th><th>🤖 AI</th></tr></thead><tbody>';
  ws.slice(0, o.scope==='national'?20:12).forEach(function(w){
    var pw=G('predictWater',function(){return 0;})(w,o.year), dr=G('cropRisk',function(){return 0;})(w,o.year),
        cg=G('coverageGap',function(x){return 100-(x.coverage||0);})(w), an=null;
    try{ an=G('anomaly',function(){return null;})(w); }catch(e){}
    h+='<tr><td><b>'+esc(w.en)+'</b></td><td>'+pw+'</td><td>'+Math.round((w.flood||0)*100)+'%</td><td>'+dr+'%</td><td>'+cg+'%</td><td>'+esc(riskLabel(riskOf(w,o.year),t))+'</td><td><small>'+esc(an||'—')+'</small></td></tr>';
  });
  h+='</tbody></table></div></section>';

  // 5) action plan
  h+='<section class="rep-sec"><h2>'+esc(t.s_plan)+'</h2>';
  focus.slice(0, o.scope==='national'?6:10).forEach(function(w){
    h+='<div class="rep-wil"><div class="rep-wil-head"><b>📍 '+esc(disp(w))+'</b></div><div class="rep-twrap"><table class="rep-table"><thead><tr><th>#</th><th>'+esc(t.action)+'</th><th>P</th><th>'+esc(t.horizonCol)+'</th><th>'+esc(t.owner)+'</th><th>'+esc(t.impact)+'</th></tr></thead><tbody>';
    actionPlan(w,o.year,o.lang).forEach(function(r,i){
      h+='<tr><td>'+(i+1)+'</td><td>'+esc(r.a)+'</td><td><span class="rep-prio">'+esc(r.p)+'</span></td><td>'+esc(r.h)+'</td><td><small>'+esc(r.o)+'</small></td><td><small>'+esc(r.e)+'</small></td></tr>';
    });
    h+='</tbody></table></div></div>';
  });
  h+='</section>';

  // 6) full table
  var rows=[];
  h+='<section class="rep-sec"><h2>'+esc(t.s_full)+'</h2><div class="rep-twrap"><table class="rep-table"><thead><tr><th>#</th><th>Wilaya</th><th>Pop(k)</th><th>'+(o.lang==='fr'?'Eau ':'ماء ')+o.year+'</th><th>'+(o.lang==='fr'?'Sécheresse':'جفاف')+'</th><th>+Urb%</th><th>'+(o.lang==='fr'?'Inond.':'فيضان')+'</th><th>Ind/100</th><th>'+(o.lang==='fr'?'Risque':'الخطر')+'</th></tr></thead><tbody>';
  ws.forEach(function(w){
    var lv=riskOf(w,o.year);
    var r={num:w.num,n:disp(w),pop:w.pop,water:G('predictWater',function(){return 0;})(w,o.year),drought:G('cropRisk',function(){return 0;})(w,o.year),urban:G('urbanGrowth',function(){return 0;})(w,o.year),flood:Math.round((w.flood||0)*100)+'%',industry:G('industryScore',function(){return 0;})(w),risk:riskLabel(lv,t)};
    rows.push(r);
    h+='<tr><td>'+(w.num||'')+'</td><td><b>'+esc(disp(w))+'</b></td><td>'+fmt(w.pop)+'</td><td>'+r.water+'</td><td>'+r.drought+'%</td><td>+'+r.urban+'%</td><td>'+r.flood+'</td><td>'+r.industry+'</td><td>'+esc(r.risk)+'</td></tr>';
  });
  h+='</tbody></table></div></section>';

  // 7) method + sign
  h+='<section class="rep-sec rep-method"><h2>'+esc(t.method)+'</h2><p>'+
    (o.lang==='fr'
      ? 'Modèles embarqués : demande +3,5 %/an (pop), pluie −1,2 %/an, risque cultures via sol/pluie/NDVI (+2,1 pts/an), croissance urbaine via pop×prix. 58 wilayas × 18 indicateurs + prévisions 2026–2035. Données démo — valider ONM, ANRH, DSA, ONS, Sentinel-2 avant usage officiel. Révision recommandée chaque trimestre.'
      : o.lang==='en'
      ? 'Embedded models: demand +3.5%/yr (pop), rainfall −1.2%/yr, crop risk from soil/rain/NDVI (+2.1 pts/yr), urban growth from pop×price. 58 wilayas × 18 indicators + 2026–2035 forecasts. Demo data — validate with ONM, ANRH, DSA, ONS, Sentinel-2 before official use. Quarterly review recommended.'
      : 'نماذج مضمنة: طلب +3.5٪/سنة (السكان)، أمطار −1.2٪/سنة، خطر المحاصيل من التربة/الأمطار/NDVI (+2.1 نقطة/سنة)، النمو العمراني من السكان×الأسعار. 58 ولاية × 18 مؤشراً + توقعات 2026–2035. بيانات توضيحية — المصادقة مع ONM وANRH وDSA وONS وصور Sentinel-2 قبل الاستعمال الرسمي. تُراجع التقارير كل ثلاثة أشهر.')
    +'</p><div class="rep-sign"><span>© 2026 salim-slimani — gis_map · '+rid+'</span><span>gis-report-'+o.year+'-'+o.scope+' · '+esc(today)+'</span></div>'
    +'<div class="rep-sign2"><span>'+esc(t.preparedBy)+': gis_map GIS+AI</span><span>'+esc(t.signature)+': ………………………</span></div>'
    +'<p class="rep-foot">'+esc(t.footer)+'</p></section>';
  h+='</article>';

  lastDoc={ html:h, rows:rows, meta:{scope:o.scope,year:o.year,lang:o.lang,title:titleScope,date:today,id:rid}, detail:detailRows };
  saveHist(lastDoc.meta);
  return h;
}

function saveHist(m){
  try{
    var a=JSON.parse(localStorage.getItem(LS_KEY)||'[]');
    a.unshift(Object.assign({at:new Date().toISOString()},m));
    localStorage.setItem(LS_KEY,JSON.stringify(a.slice(0,10)));
  }catch(e){}
}
function generateFromUI(){
  var o=readUI();
  var box=document.getElementById('reportPreview');
  box.innerHTML=buildDoc(o);
  try{ box.scrollIntoView({behavior:'smooth',block:'start'}); }catch(e){}
}
function printReport(){
  var box=document.getElementById('reportPreview');
  if(!box || !lastDoc.html){ generateFromUI(); box=document.getElementById('reportPreview'); }
  document.body.classList.add('printing-report');
  setTimeout(function(){ try{ window.print(); }catch(e){} setTimeout(function(){ document.body.classList.remove('printing-report'); },400); },60);
}
function standaloneCSS(){
  return 'body{font-family:Inter,Segoe UI,Tahoma,Arial,sans-serif;background:#f1f5f9;color:#0f172a;margin:0;padding:24px}'+
  '.rep-doc{max-width:960px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.15)}'+
  '.rep-cover{background:linear-gradient(120deg,#062B26,#0B3B66);color:#fff;padding:26px 28px}'+
  '.rep-brand{display:flex;gap:12px;align-items:center}.rep-logo{font-size:34px}.rep-title{font-size:20px;font-weight:800}.rep-sub{opacity:.8;font-size:13px}'+
  '.rep-h1{margin:14px 0 6px;font-size:26px}.rep-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:13px;opacity:.92}.rep-class{display:inline-block;margin-top:10px;background:#F59E0B;color:#221A03;font-weight:800;font-size:12px;padding:4px 12px;border-radius:999px}'+
  '.rep-sec{padding:18px 24px;border-top:1px solid #e2e8f0}.rep-sec h2{margin:0 0 10px;font-size:17px;color:#0B3B66}.rep-narr{line-height:2;font-size:14px}'+
  '.rep-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px}'+
  '.rep-kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center}.rep-kpi b{font-size:22px;display:block}.rep-kpi small{color:#64748b}.rep-kpi.danger{border-color:#EF4444;background:#fef2f2}'+
  '.rep-table{width:100%;border-collapse:collapse;font-size:12.5px}.rep-table th,.rep-table td{border:1px solid #e2e8f0;padding:6px 8px;text-align:start;vertical-align:top}.rep-table th{background:#0B3B66;color:#fff}.rep-twrap{overflow-x:auto;margin-top:8px}'+
  '.rep-table tr.rep-sub td{background:#f8fafc;color:#475569}'+
  '.rep-wil{border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:10px 0;break-inside:avoid}.rep-wil-head{display:flex;justify-content:space-between;gap:8px;align-items:center}'+
  '.rep-risk{font-size:12px;font-weight:800;padding:3px 10px;border-radius:999px;background:#f1f5f9;white-space:nowrap}.rep-risk.r3{background:#fee2e2}.rep-risk.r2{background:#fef3c7}.rep-risk.r1{background:#fef9c3}.rep-risk.r0{background:#dcfce7}'+
  '.rep-wil-grid{display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px;color:#334155;margin:8px 0}.rep-anom{background:#fffbeb;border:1px dashed #F59E0B;border-radius:8px;padding:6px 8px;margin-top:6px;font-size:12.5px}'+
  '.rep-sect{margin:6px 0;padding:8px 10px;background:#f8fafc;border-radius:8px}.rep-sect b{font-size:13px}.rep-sect p{margin:4px 0 0;font-size:12.5px;line-height:1.9;color:#1e293b}'+
  '.rep-prio{background:#0B3B66;color:#fff;font-size:11px;padding:1px 8px;border-radius:999px;white-space:nowrap}'+
  '.rep-note{font-size:12px;color:#64748b}.rep-method p{font-size:12.5px;line-height:1.9;color:#334155}.rep-sign,.rep-sign2{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;font-size:12px;color:#64748b;border-top:1px dashed #cbd5e1;padding-top:8px;margin-top:8px}.rep-foot{font-size:11.5px;color:#94a3b8}';
}
function standaloneHTML(){
  if(!lastDoc.html) generateFromUI();
  var rtl=lastDoc.meta&&lastDoc.meta.lang==='ar'?' dir="rtl" lang="ar"':'';
  return '<!DOCTYPE html><html'+rtl+'><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>gis_map '+esc(lastDoc.meta?lastDoc.meta.id:'')+' '+esc(lastDoc.meta?lastDoc.meta.title:'')+'</title><style>'+standaloneCSS()+'</style></head><body>'+lastDoc.html+'</body></html>';
}
function downloadHTML(){
  var full=standaloneHTML();
  var blob=new Blob([full],{type:'text/html;charset=utf-8'});
  dl(blob,'gis_map-'+(lastDoc.meta?lastDoc.meta.id:'report')+'-'+(lastDoc.meta?lastDoc.meta.scope:'x')+'-'+(lastDoc.meta?lastDoc.meta.year:'')+'.html');
}
function downloadCSV(){
  if(!lastDoc.rows.length) generateFromUI();
  var q=function(v){ v=String(v==null?'':v); return '"'+v.replace(/"/g,'""')+'"'; };
  var lines=['report_id,num,name,pop_k,price_dzd_m2,flood_pct,soil,rain_mm,ndvi,dams,wells,water_base,water_'+(lastDoc.meta?lastDoc.meta.year:'' )+',drought_pct,urban_pct,coverage_pct,energy,roads,labor,industry,risk'];
  var byName={}; wilayas().forEach(function(w){ byName[disp(w)]=w; });
  lastDoc.rows.forEach(function(r){
    var w=byName[r.n]||{};
    lines.push([lastDoc.meta?lastDoc.meta.id:'',w.num||'',q(r.n),w.pop||'',w.price||'',(w.flood!=null?Math.round(w.flood*100):''),w.soil||'',w.rain||'',w.ndvi||'',w.dams||'',w.wells||'',w.waterDef||'',r.water,r.drought,r.urban,(w.coverage||''),w.energy||'',w.roads||'',w.labor||'',w.industry||'',q(r.risk)].join(','));
  });
  var blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  dl(blob,'gis_map-'+(lastDoc.meta?lastDoc.meta.id:'report')+'-detail.csv');
}
function dl(blob,name){
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); setTimeout(function(){ try{URL.revokeObjectURL(a.href);}catch(e){} a.remove(); },800);
}
function openReport(){ ensureModal(); fillWilayaLists(); var m=document.getElementById('reportModal'); m.style.display='flex'; }
function closeReport(){ var m=document.getElementById('reportModal'); if(m) m.style.display='none'; }

window.openReport=openReport; window.closeReport=closeReport;
window.generateReport=generateFromUI; window.printGisReport=printReport;
window.buildGisReportHTML=function(opts){ return buildDoc(opts); };
window.standaloneReportHTML=standaloneHTML;
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeReport(); });

})();
/*GISMAP_EOF:report*/
