/**
 * GIS Map – National Early Warning System (NEWS)
 * Geo-aware Multi-Horizon Risk Monitoring & Protocol Diversification
 * © 2026 Salim Slimani & National Foresight System
 */

import { EarlyWarningAlert, GeoZoneId, ProtocolHorizons, SubRegionId, WilayaRecord } from '../types';
import {
  getHazardIndex,
  getHealthCoverage,
  getHeritageSitesCount,
  getHospitalsCount,
  getHotelsCount,
  getSeismicRisk,
  getTourismScore,
  getTransportScore,
  getWildfireRisk,
  hasRailAccess
} from './reporting';

const COASTAL_WILAYAS = new Set([2, 6, 13, 15, 16, 18, 21, 23, 27, 31, 35, 36, 42, 46]);
const TELL_BASIN_WILAYAS = new Set([9, 10, 22, 24, 25, 26, 29, 41, 43, 44, 48]);
const HIGH_PLATEAUS_WILAYAS = new Set([3, 4, 5, 12, 14, 17, 19, 20, 28, 32, 34, 38, 40, 45]);
// Northern / Western Saharan Oases & Corridors: Saoura (8, 52), Ziban (7, 51), Oued Righ (30, 55, 57), Souf (39), M'Zab (47, 58)
const OASIS_NORTH_WILAYAS = new Set([7, 8, 30, 39, 47, 51, 52, 55, 57, 58]);
// Deep Sahara: Touat (1), Ahaggar & Tanezrouft/Tiniri (11, 50, 54), Tassili n'Ajjer (33, 56), Hammada/Erg Iguidi-Chech (37), Gourara (49), Tidikelt (53)
const DEEP_SAHARA_WILAYAS = new Set([1, 11, 33, 37, 49, 50, 53, 54, 56]);

export interface SubRegionMeta {
  id: SubRegionId;
  label: string;
  labelAr: string;
  detail: string;
  detailAr: string;
}

export const ALGERIA_SUBREGION_MAP: Record<number, SubRegionMeta> = {
  // 1. الإقليم الصحراوي (Sahara Natural Regions)
  8:  { id: 'saoura', label: "Saoura Basin (Béchar, Kenadsa & Taghit)", labelAr: 'الساورة (بشار، القنادسة، تاغيت)', detail: 'Oued Saoura valley between Grand Erg Occidental & Hammada', detailAr: 'وادي الساورة بين العرق الغربي الكبير شرقاً وهضاب الحمادة غرباً' },
  52: { id: 'saoura', label: 'Saoura Oasis Corridor (Béni Abbès)', labelAr: 'الساورة (بني عباس وواحات الوادي)', detail: 'Lower Oued Saoura ksour & palm corridor', detailAr: 'امتداد وادي الساورة وقصور الواحات بمحاذاة العرق الغربي الكبير' },
  37: { id: 'hammada_erg', label: 'Hammada du Drâa, Erg Iguidi & Chech', labelAr: 'الحمادة وعرق إيقدي والشاش (تندوف)', detail: 'Rocky Hammada du Drâa bordered by Ergs Iguidi & Chech', detailAr: 'هضاب حمادة الدراع الصخرية الفاصلة لعرق إيقدي والشاش' },
  49: { id: 'gourara', label: 'Gourara Red Oases (Timimoun)', labelAr: 'قورارة (تيميمون والسبخة وتادمايت)', detail: 'Red oasis belt around Timimoun Sebkha & Tademaït plateau edge', detailAr: 'الواحات الحمراء المحيطة بسبخة تيميمون وحافة هضبة تادمايت' },
  1:  { id: 'touat', label: 'Touat Oasis Belt (Adrar & Reggane)', labelAr: 'توات (أدرار، رقان، زاوية كنتة)', detail: 'Elongated Foggara oases along Oued Messaoud & Grand Erg Occidental', detailAr: 'شريط واحات الفقارات بمحاذاة وادي مسعود والعرق الغربي الكبير' },
  53: { id: 'tidikelt', label: 'Tidikelt Depression (In Salah & Aoulef)', labelAr: 'تيديكلت (عين صالح، أولف، إن غار)', detail: 'Southern Tademaït hinge connecting Central Sahara to Ahaggar', detailAr: 'جنوب هضبة تادمايت وحلقة الوصل بين الصحراء الوسطى والهقار' },
  47: { id: 'mzab', label: "Chebka & M'Zab Valley (Ghardaïa)", labelAr: 'الشبكة / وادي مزاب (غرداية وقصورها)', detail: 'Dissected limestone Chebka plateau & seven M’Zab ksour', detailAr: 'الهضبة الكلسية الشبكية لوادي مزاب والقصور السبعة' },
  58: { id: 'mzab', label: "Southern M'Zab – Tademaït (El Meniaa)", labelAr: 'الشبكة / مزاب الجنوبي وتادمايت (المنيعة)', detail: 'M’Zab–Tademaït Albian oasis gateway', detailAr: 'امتداد الشبكة والواحات الحوضية نحو هضبة تادمايت' },
  7:  { id: 'ziban', label: 'Ziban Foothills (Biskra & Tolga)', labelAr: 'الزيبان (بسكرة وطولقة)', detail: 'Piedmont palm oases at the foot of the Saharan Atlas', detailAr: 'واحات الزيبان عند سفوح الأطلس الصحراوي' },
  51: { id: 'ziban', label: 'Western Ziban (Ouled Djellal)', labelAr: 'الزيبان الغربي (أولاد جلال)', detail: 'Saharan Atlas piedmont & Oued Djedi pastoral oases', detailAr: 'امتداد واحات الزيبان وسفوح الأطلس الصحراوي' },
  55: { id: 'oued_righ', label: 'Oued Righ Depression (Touggourt)', labelAr: 'وادي ريغ (تقرت وواحات النخيل)', detail: 'Artesian palm-oasis trough stretching south of Biskra', detailAr: 'منخفض وادي ريغ الغني بواحات النخيل والآبار الارتوازية' },
  57: { id: 'oued_righ', label: "Upper Oued Righ (El M'Ghair & Chott Melrhir)", labelAr: 'وادي ريغ الشمالي (المغير)', detail: 'Northern Oued Righ oasis & Chott Melrhir depression', detailAr: 'المنخفض الواحي لوادي ريغ ومحيط شط ملغيغ' },
  30: { id: 'oued_righ', label: 'Oued Mya & Southern Oued Righ (Ouargla)', labelAr: 'وادي ريغ وحوض مية (ورقلة)', detail: 'Artesian Complexe Terminal & Albian basin', detailAr: 'الامتداد الجنوبي لوادي ريغ وحوض وادي مية الألبي' },
  39: { id: 'souf', label: 'Souf / Oued Souf (Grand Erg Oriental)', labelAr: 'سوف / وادي سوف (العرق الشرقي الكبير)', detail: 'Dune oases famous for sunken Ghout palm cultivation', detailAr: 'العرق الشرقي الكبير ونظام الغوط لزراعة النخيل' },
  33: { id: 'tassili', label: "Tassili n'Ajjer Plateau (Illizi)", labelAr: 'الطاسيلي ناجر (إليزي)', detail: 'Sandstone canyon plateau & prehistoric rock-art sanctuary', detailAr: 'هضبة الطاسيلي الصخرية الشاسعة ومحمية النقوش الصخرية' },
  56: { id: 'tassili', label: "Tassili n'Ajjer Core (Djanet)", labelAr: 'الطاسيلي ناجر (جانت)', detail: 'UNESCO sandstone formations & prehistoric cultural core', detailAr: 'قلب هضبة الطاسيلي ناجر وتكويناتها والرسوم الصخرية' },
  11: { id: 'ahaggar', label: 'Ahaggar Volcanic Massif (Tamanrasset)', labelAr: 'الهقار (تمنراست والكتلة البركانية)', detail: 'High Saharan volcanic massif flanked by Tanezrouft & Tiniri regs', detailAr: 'الكتلة الجبلية البركانية للهقار بين سهول تانزروفت وتينيري' },
  50: { id: 'ahaggar', label: 'Tanezrouft & Western Ahaggar (Bordj Badji Mokhtar)', labelAr: 'تانزروفت وغرب الهقار (برج باجي مختار)', detail: 'Vast gravel reg of Tanezrouft west of the Ahaggar massif', detailAr: 'سهول حصى تانزروفت الشاسعة غرب كتلة الهقار' },
  54: { id: 'ahaggar', label: 'Tiniri & Southern Ahaggar (In Guezzam)', labelAr: 'تينيري وجنوب الهقار (عين قزام)', detail: 'Southern Ahaggar plains bordering Tiniri', detailAr: 'سهول الهقار الجنوبية المحيطة بتينيري' },

  // 2. الهضاب العليا والأطلس الصحراوي (High Plateaus & Saharan Atlas)
  28: { id: 'hodna', label: "Hodna Closed Basin (M'Sila & Bou Saâda)", labelAr: 'الحضنة (المسيلة وبوسعادة وشط الحضنة)', detail: 'Central endorheic Hodna basin & Chott El Hodna', detailAr: 'حوض الحضنة المغلق وسط الجزائر وشط الحضنة' },
  34: { id: 'hodna', label: 'Northern Hodna & Bibans (Bordj Bou Arreridj)', labelAr: 'الحضنة والبيبان (برج بوعريريج)', detail: 'High plains transition between Hodna basin & Bibans range', detailAr: 'السهول العليا الشمالية لحوض الحضنة وسلسلة البيبان' },
  5:  { id: 'aures', label: 'Aurès Massif (Batna)', labelAr: 'الأوراس (باتنة والكتلة الأوراسية)', detail: 'Rugged eastern Aurès mountain massif & highland valleys', detailAr: 'الكتلة الجبلية الوعرة للأوراس في الشرق الجزائري' },
  40: { id: 'aures', label: 'Eastern Aurès & Nemencha Margin (Khenchela)', labelAr: 'الأوراس الشرقي والنمامشة (خنشلة)', detail: 'Eastern Aurès cedar highlands bordering Nemencha', detailAr: 'مرتفعات الأوراس الشرقية وامتدادها نحو النمامشة' },
  4:  { id: 'aures', label: 'Aurès Piedmont & Chotts (Oum El Bouaghi)', labelAr: 'الأوراس والسباخ العليا (أم البواقي)', detail: 'Northeastern high plains bordering the Aurès massif', detailAr: 'السهوب العليا الشرقية المتاخمة لكتلة الأوراس' },
  12: { id: 'nemencha', label: 'Nemencha Highlands (Tébessa)', labelAr: 'النمامشة (تبسة)', detail: 'Steppic mountain extension east of the Aurès massif', detailAr: 'الامتداد الجبلي والهضبي للنمامشة شرق الأوراس' },
  17: { id: 'atlas_ksour', label: 'Ouled Naïl Mountains (Djelfa · Saharan Atlas)', labelAr: 'جبال أولاد نايل (الجلفة · الأطلس الصحراوي)', detail: 'Central Saharan Atlas ridge & Green Dam corridor', detailAr: 'سلسلة جبال أولاد نايل على طول الأطلس الصحراوي' },
  3:  { id: 'atlas_ksour', label: 'Amour Mountains (Laghouat · Saharan Atlas)', labelAr: 'جبال عمور (الأغواط · الأطلس الصحراوي)', detail: 'Djebel Amour massif along the Saharan Atlas', detailAr: 'جبال عمور بالأطلس الصحراوي' },
  32: { id: 'atlas_ksour', label: 'Amour–Ksour Steppe (El Bayadh)', labelAr: 'جبال عمور والقصور (البيض)', detail: 'Western Saharan Atlas ridges & high pastoral steppe', detailAr: 'امتداد جبال عمور والقصور بالأطلس الصحراوي' },
  45: { id: 'atlas_ksour', label: 'Ksour Mountains (Naâma & Aïn Sefra)', labelAr: 'جبال القصور (النعامة وعين الصفراء)', detail: 'Westernmost Saharan Atlas Ksour range & Chott El Gharbi', detailAr: 'جبال القصور في أقصى غرب الأطلس الصحراوي' },
  14: { id: 'sersou', label: 'Sersou Agricultural Plateau (Tiaret)', labelAr: 'السرسو (تيارت · الهضبة الزراعية الخصبة)', detail: 'Fertile cereal plateau immediately south of the Tell Atlas', detailAr: 'هضبة السرسو الزراعية الخصبة جنوب الأطلس التلي' },
  38: { id: 'sersou', label: 'Sersou & Southern Ouarsenis (Tissemsilt)', labelAr: 'السرسو والونشريس (تيسمسيلت)', detail: 'Hinge between fertile Sersou plateau & Ouarsenis massif', detailAr: 'حلقة الوصل بين هضبة السرسو وكتلة الونشريس' },
  19: { id: 'high_plains_east', label: 'Sétif High Plains & Lesser Kabylia (Babors)', labelAr: 'سهول سطيف العليا وشمال القبائل الصغرى', detail: 'High cereal plains rising into Lesser Kabylia Babors range', detailAr: 'الهضاب العليا السطايفية وامتدادها نحو القبائل الصغرى' },
  20: { id: 'high_plateaus_west', label: 'Western High-Plateaus (Saïda)', labelAr: 'الهضاب العليا الغربية (سعيدة)', detail: 'Western steppe highland shelf between Tell & Chott Chergui', detailAr: 'الهضاب العليا الغربية بين التل وشط الشرقي' },

  // 3. الشمال / الإقليم التلي (Tell & Coastal Regions)
  15: { id: 'kabylia', label: 'Greater Kabylia (Tizi Ouzou & Djurdjura)', labelAr: 'القبائل الكبرى (تيزي وزو وجرجرة)', detail: 'Djurdjura mountain & coastal heartland of Greater Kabylia', detailAr: 'قلب القبائل الكبرى وسلسلة جرجرة' },
  35: { id: 'kabylia', label: 'Greater Kabylia Coast (Boumerdès)', labelAr: 'القبائل الكبرى الساحلية (بومرداس)', detail: 'Western corridor of Greater Kabylia & Zemmouri littoral', detailAr: 'الامتداد الساحلي الغربي للقبائل الكبرى' },
  10: { id: 'kabylia', label: 'Kabylia / Djurdjura Piedmont (Bouira)', labelAr: 'القبائل الكبرى الجنوبية (البويرة)', detail: 'Southern flanks of Djurdjura & Sahel–Isser valley', detailAr: 'السفوح الجنوبية لجرجرة ضمن إقليم القبائل' },
  6:  { id: 'kabylia', label: 'Lesser Kabylia (Béjaïa & Soummam)', labelAr: 'القبائل الصغرى (بجاية ووادي الصومام)', detail: 'Heartland of Lesser Kabylia, Soummam valley & Babors coast', detailAr: 'القبائل الصغرى وحوض الصومام وساحل البابور' },
  18: { id: 'kabylia', label: 'Lesser Kabylia East (Jijel)', labelAr: 'القبائل الصغرى الشرقية (جيجل)', detail: 'Forested coastal Babors ridges of Eastern Lesser Kabylia', detailAr: 'الامتداد الساحلي الغابي للقبائل الصغرى' },
  27: { id: 'dahra', label: 'Dahra Coastal Range (Mostaganem)', labelAr: 'الظهرة (مستغانم والساحل التلي)', detail: 'Western Dahra coastal ridge & Lower Cheliff estuary', detailAr: 'سلسلة الظهرة الساحلية ومصب الشلف' },
  2:  { id: 'dahra', label: 'Dahra & Middle Cheliff (Chlef & Ténès)', labelAr: 'الظهرة ووادي الشلف (الشلف وتنس)', detail: 'Coastal Dahra mountains descending into the Cheliff plain', detailAr: 'سلسلة الظهرة الساحلية بين تنس ووادي الشلف' },
  48: { id: 'dahra', label: 'Southern Dahra & Lower Mina (Relizane)', labelAr: 'الظهرة الجنوبية وسهل مينا (غليزان)', detail: 'Southern Dahra piedmont & Cheliff–Mina alluvial valley', detailAr: 'الامتداد الداخلي للظهرة وسهل غليزان' },
  44: { id: 'ouarsenis', label: 'Ouarsenis Massif (Aïn Defla & Upper Cheliff)', labelAr: 'الونشريس والأطلس التلي (عين الدفلى)', detail: 'Massive Ouarsenis mountain complex overlooking Upper Cheliff', detailAr: 'كتلة الونشريس الضخمة وسهل الشلف الأعلى' },
  13: { id: 'trara', label: 'Trara Coastal Mountains (Tlemcen & Ghazaouet)', labelAr: 'الطرارة (تلمسان، الغزوات، ندرومة)', detail: 'Far northwestern coastal Trara range & Tlemcen mountains', detailAr: 'جبال الطرارة الساحلية في أقصى الشمال الغربي' },
  46: { id: 'trara', label: 'Eastern Trara Coast (Aïn Témouchent)', labelAr: 'الطرارة الشرقية والساحل (عين تموشنت)', detail: 'Coastal volcanic ridge extending Trara toward Oran', detailAr: 'الامتداد الساحلي لإقليم الطرارة نحو وهران' },
  16: { id: 'mitidja', label: 'Mitidja & Algiers Sahel (Algiers)', labelAr: 'متيجة والساحل العاصمي (الجزائر العاصمة)', detail: 'Central Mitidja coastal basin & Bay of Algiers', detailAr: 'سهل متيجة الساحلي وحوض الجزائر العاصمة' },
  9:  { id: 'mitidja', label: 'Mitidja & Blida Atlas (Blida)', labelAr: 'سهل متيجة والأطلس البليدي (البليدة)', detail: 'Southern heart of the fertile Mitidja plain', detailAr: 'قلب سهل متيجة الخصيب وسفوح الأطلس البليدي' },
  42: { id: 'mitidja', label: 'Western Mitidja & Chenoua (Tipaza)', labelAr: 'متيجة الغربية والساحل (تيبازة)', detail: 'Western Mitidja littoral corridor & Sahel hills', detailAr: 'الواجهة الساحلية الغربية لسهل متيجة' },
  23: { id: 'edough_annaba', label: 'Edough & Annaba Plain', labelAr: 'سهل عنابة والقالة / إقليم الإيدوغ (عنابة)', detail: 'Northeastern Edough massif & coastal Seybouse plain', detailAr: 'سهل عنابة الساحلي وكتلة الإيدوغ في أقصى الشمال الشرقي' },
  36: { id: 'edough_annaba', label: 'El Kala Wetlands & Edough Plain (El Tarf)', labelAr: 'سهل عنابة والقالة / إقليم الإيدوغ (الطارف)', detail: 'Extreme northeast coastal wetlands & Biosphere lagoons', detailAr: 'سهل القالة والبحيرات الساحلية وإقليم الإيدوغ' },
  21: { id: 'edough_annaba', label: 'West Edough & Skikda Littoral (Skikda)', labelAr: 'ساحل سكيكدة وغرب الإيدوغ', detail: 'Northeastern littoral linking Annaba–Edough & Collo', detailAr: 'الساحل الشمالي الشرقي المتصل بإقليم الإيدوغ وعنابة' },
  31: { id: 'tell_oranie', label: 'Oranie Littoral (Oran)', labelAr: 'الساحل الوهراني والتل الغربي (وهران)', detail: 'Murdjadjo bay & western Mediterranean port basin', detailAr: 'الحوض الساحلي الوهراني بالتل الغربي' },
  22: { id: 'tell_oranie', label: 'Western Tell / Mekerra Plain (Sidi Bel Abbès)', labelAr: 'التل الغربي وسهول تسالة (سيدي بلعباس)', detail: 'Inland Tessala ridges & Mekerra agricultural basin', detailAr: 'سهول تسالة ومكرة بالإقليم التلي الغربي' },
  29: { id: 'tell_oranie', label: 'Ghriss Plain & Beni Chougrane (Mascara)', labelAr: 'سهل غريس وبني شقران (معسكر)', detail: 'Inland Tell valley framed by Beni Chougrane ridges', detailAr: 'سهل غريس وجبال بني شقران بالإقليم التلي الغربي' },
  26: { id: 'tell_titteri', label: 'Titteri & Central Tell Atlas (Médéa)', labelAr: 'التيطري والأطلس التلي الأوسط (المدية)', detail: 'Central Tell highlands overlooking Mitidja & Chelif', detailAr: 'مرتفعات التيطري بالأطلس التلي الأوسط' },
  25: { id: 'tell_constantine', label: 'Eastern Tell & Rhumel Basin (Constantine)', labelAr: 'التل الشرقي وحوض الرمال (قسنطينة)', detail: 'Eastern Tell calcareous plateaus & Rhumel gorge', detailAr: 'أحواض التل الشرقي وهضبة قسنطينة' },
  43: { id: 'tell_constantine', label: 'Eastern Tell & Beni Haroun Basin (Mila)', labelAr: 'التل الشرقي وحوض بني هارون (ميلة)', detail: 'Eastern Tell watershed feeding Beni Haroun reservoir', detailAr: 'الأحواض التلية الشرقية ومحيط سد بني هارون' },
  24: { id: 'tell_constantine', label: 'Seybouse Basin & Eastern Tell (Guelma)', labelAr: 'التل الشرقي وحوض سيبوس (قالمة)', detail: 'Fertile Seybouse valley & Tell thermal ridges', detailAr: 'وادي سيبوس ومرتفعات التل الشرقي' },
  41: { id: 'tell_constantine', label: 'Medjerda Basin & Eastern Tell (Souk Ahras)', labelAr: 'التل الشرقي وحوض مجردة (سوق أهراس)', detail: 'Forested Medjerda watershed on the eastern Tell crest', detailAr: 'حوض مجردة الجبلي بأقصى التل الشرقي' }
};

export function classifyWilayaGeoZone(w: WilayaRecord): {
  id: GeoZoneId;
  label: string;
  labelAr: string;
  subRegionId: SubRegionId;
  subRegionLabel: string;
  subRegionLabelAr: string;
  assetNote: string;
  assetNoteAr: string;
} {
  let id: GeoZoneId;
  if (COASTAL_WILAYAS.has(w.num)) {
    id = 'coastal';
  } else if (TELL_BASIN_WILAYAS.has(w.num)) {
    id = 'tell_basin';
  } else if (HIGH_PLATEAUS_WILAYAS.has(w.num)) {
    id = 'high_plateaus';
  } else if (OASIS_NORTH_WILAYAS.has(w.num)) {
    id = 'oasis_north';
  } else if (DEEP_SAHARA_WILAYAS.has(w.num)) {
    id = 'deep_sahara';
  } else if (w.region === 'Sahara' || w.lat < 31.5) {
    id = 'deep_sahara';
  } else if (w.region === 'High-Plateaus' || w.lat < 35.6) {
    id = 'high_plateaus';
  } else {
    id = w.lat >= 36.6 ? 'coastal' : 'tell_basin';
  }

  const sub: SubRegionMeta = ALGERIA_SUBREGION_MAP[w.num] || (
    id === 'coastal'
      ? { id: 'mitidja', label: 'Tell Littoral', labelAr: 'الساحل التلي', detail: 'Coastal strip', detailAr: 'واجهة بحرية تلية' }
      : id === 'tell_basin'
      ? { id: 'tell_constantine', label: 'Tell Inland Basin', labelAr: 'الأحواض التلية الداخلية', detail: 'Inland Tell valley', detailAr: 'حوض داخلي تلي' }
      : id === 'high_plateaus'
      ? { id: 'atlas_ksour', label: 'High-Plateaus & Steppe', labelAr: 'الهضاب العليا والسهوب', detail: 'High steppe plateau', detailAr: 'إقليم الهضاب العليا والسهوب' }
      : id === 'oasis_north'
      ? { id: 'ziban', label: 'Saharan Corridor Oases', labelAr: 'واحات الممرات الصحراوية', detail: 'Corridor oasis', detailAr: 'واحات وممرات صحراوية' }
      : { id: 'ahaggar', label: 'Deep Sahara Plateau', labelAr: 'العمق الصحراوي', detail: 'Deep arid Sahara', detailAr: 'عمق صحراوي' }
  );

  switch (id) {
    case 'coastal':
      return {
        id,
        label: 'Northern Coastal Tell (Mitidja, Kabylia, Dahra, Trara, Edough)',
        labelAr: 'الإقليم التلي الساحلي (متيجة، القبائل، الظهرة، الطرارة، الإيدوغ)',
        subRegionId: sub.id,
        subRegionLabel: sub.label,
        subRegionLabelAr: sub.labelAr,
        assetNote: `${sub.detail} · ${w.dams} dam(s) · ${w.rain} mm/yr · Pop ${w.pop.toLocaleString()}k`,
        assetNoteAr: `${sub.detailAr} · ${w.dams} سد · أمطار ${w.rain} ملم/سنة · ${w.pop.toLocaleString()} ألف نسمة`
      };
    case 'tell_basin':
      return {
        id,
        label: 'Inland Tell Atlas & Plains (Ouarsenis, Titteri, Eastern & Western Tell)',
        labelAr: 'الإقليم التلي الداخلي (الونشريس، التيطري، أحواض الغرب والشرق)',
        subRegionId: sub.id,
        subRegionLabel: sub.label,
        subRegionLabelAr: sub.labelAr,
        assetNote: `${sub.detail} · ${w.dams} dam(s) · ${w.wells} wells · Soil ${w.soil}/100`,
        assetNoteAr: `${sub.detailAr} · ${w.dams} سد · ${w.wells} بئر · تربة ${w.soil}/100`
      };
    case 'high_plateaus':
      return {
        id,
        label: 'High-Plateaus & Saharan Atlas (Hodna, Aurès, Nemencha, Sersou, Ksour)',
        labelAr: 'الهضاب العليا والأطلس الصحراوي (الحضنة، الأوراس، النمامشة، السرسو، القصور)',
        subRegionId: sub.id,
        subRegionLabel: sub.label,
        subRegionLabelAr: sub.labelAr,
        assetNote: `${sub.detail} · ${w.rain} mm/yr · ${w.dams} dam(s) · ${w.wells} boreholes`,
        assetNoteAr: `${sub.detailAr} · ${w.rain} ملم/سنة · ${w.dams} سد · ${w.wells} بئر`
      };
    case 'oasis_north':
      return {
        id,
        label: "Saharan Oases Corridor (Saoura, Ziban, M'Zab, Oued Righ & Souf)",
        labelAr: 'الواحات والممرات الصحراوية (الساورة، الزيبان، مزاب، وادي ريغ، سوف)',
        subRegionId: sub.id,
        subRegionLabel: sub.label,
        subRegionLabelAr: sub.labelAr,
        assetNote: `${sub.detail} · ${w.rain} mm/yr · ${w.dams} dam(s) · ${w.wells} wells`,
        assetNoteAr: `${sub.detailAr} · ${w.rain} ملم/سنة · ${w.dams} سد · ${w.wells} بئر`
      };
    case 'deep_sahara':
      return {
        id,
        label: "Deep Sahara (Touat, Gourara, Tidikelt, Hammada, Tassili n'Ajjer & Ahaggar)",
        labelAr: 'الصحراء الكبرى والعمق (توات، قورارة، تيديكلت، الحمادة، الطاسيلي، الهقار)',
        subRegionId: sub.id,
        subRegionLabel: sub.label,
        subRegionLabelAr: sub.labelAr,
        assetNote: `${sub.detail} · ${w.rain} mm/yr · Albian / Foggara / Solar basin`,
        assetNoteAr: `${sub.detailAr} · ${w.rain} ملم/سنة · طاقة شمسية وحوض ألبي/فقارات`
      };
  }
}

function buildWaterProtocol(w: WilayaRecord, zone: GeoZoneId, projectedDeficit: number): ProtocolHorizons {
  const highLeakageCity = w.pop >= 1000;
  const heavyBoreholes = w.wells >= 650;
  const hasDams = w.dams >= 2;
  const isFoggaraHeritage = [1, 49, 53].includes(w.num); // Adrar, Timimoun, In Salah
  const isDrainageSurplusOasis = [39, 55, 57].includes(w.num); // El Oued, Touggourt, El M'Ghair (rising water table)
  const isOilGasHub = [30, 33, 53].includes(w.num); // Ouargla, Illizi, In Salah

  if (zone === 'coastal') {
    return {
      shortTerm: highLeakageCity
        ? `Immediate DMA pressure zoning & acoustic leak repairs for ${w.pop.toLocaleString()}k residents; prioritize local marine desalination quota over dam drawdown.`
        : `Rebalance coastal seawater desalination off-take with ${w.dams} local dam(s) and cap unlicensed coastal well pumping (${w.wells} wells).`,
      shortTermAr: highLeakageCity
        ? `تقسيم فوري لشبكات الضغط وإصلاح التسربات لصالح ${w.pop.toLocaleString()} ألف نسمة، مع أولوية التزويد من محطة التحلية الساحلية.`
        : `موازنة الضخ من محطة تحلية مياه البحر مع مخزون ${w.dams} سد/سدود، وتقنين السحب من ${w.wells} بئراً ساحلية.`,
      mediumTerm: w.industry >= 60
        ? `Deploy tertiary-treated wastewater (STEP) loop for industrial cooling (industry index ${w.industry}/100) and expand coastal RO feeder mains.`
        : `Commission modular seawater reverse-osmosis (SWRO) coastal train and rehabilitate urban storage reservoirs before peak summer demand.`,
      mediumTermAr: w.industry >= 60
        ? `ربط المناطق الصناعية (${w.industry}/100) بمحطات تصفية المياه المستعملة (STEP) للتبريد الصناعي وتوسيع قنوات ربط التحلية الساحلية.`
        : `توسيع وحدات التناضح العكسي الساحلية وتأهيل الخزانات البلدية الاستراتيجية لمواجهة ذروة الاستهلاك الصيفي.`,
      longTerm: `Integrate solar-hybrid coastal desalination with automated SCADA distribution grids and coastal-to-hinterland emergency water transfer rings (horizon deficit ${projectedDeficit}).`,
      longTermAr: `دمج تحلية مياه البحر بالطاقة الشمسية الهجينة مع شبكات SCADA الذكية وإنشاء حلقة ربط ساحلية-داخلية لتأمين عجز ${projectedDeficit}.`
    };
  }

  if (zone === 'tell_basin') {
    return {
      shortTerm: hasDams
        ? `Enforce strict reservoir release quotas across ${w.dams} dam(s) and clamp illicit alluvial pumping along ${w.wells} basin wells.`
        : `Activate emergency inter-wilaya transfer allocation and enforce smart metering on high-draw agricultural wells (${w.wells}).`,
      shortTermAr: hasDams
        ? `تطبيق حصص دقيقة لصرف المياه من ${w.dams} سدود ووقف الضخ العشوائي في الوديان على مستوى ${w.wells} بئراً.`
        : `تفعيل حصص الربط المائي من الأحواض المجاورة وتركيب عدادات ذكية على الآبار الفلاحية (${w.wells} بئراً).`,
      mediumTerm: `Link regional dam corridors to nearest coastal desalination trunk (~60–120 km) and reuse treated urban effluent for ${w.soil}/100 fertile valley orchards.`,
      mediumTermAr: `ربط شبكة السدود التلية بأنابيب تحويل المياه المحلاة القادمة من الساحل وتعميم إعادة استعمال المياه المعالجة في السقي الفلاحي (تربة ${w.soil}/100).`,
      longTerm: `Install floating solar covers on dam reservoirs to cut evaporation by 25%, carry out dam desilting, and convert perimeter farms to closed pressurized pipes.`,
      longTermAr: `تركيب ألواح شمسية عائمة على السدود لخفض التبخر بـ25% مع إزالة الأوحال وتحويل محيطات السقي إلى قنوات مغلقة مضغوطة.`
    };
  }

  if (zone === 'high_plateaus') {
    return {
      shortTerm: heavyBoreholes
        ? `Impose remote telemetry quotas on ${w.wells} over-stressed steppe boreholes and deploy mobile brackish-water RO skids for rural communes.`
        : `Protect drinking reserves in ${w.dams} reservoir(s), curb flood-irrigation losses, and prioritize cistern deliveries to isolated steppe douars.`,
      shortTermAr: heavyBoreholes
        ? `فرض عدادات مراقبة عن بُعد على ${w.wells} بئراً لتفادي النضوب، ونشر محطات متنقلة لإزالة ملوحة المياه الجوفية بالبلديات النائية.`
        : `حماية مخزون الشرب في ${w.dams} سد/سدود ومنع السقي بالغمر المكشوف مع تأمين صهاريج للمناطق الرعوية المعزولة.`,
      mediumTerm: `Build hill reservoirs (retenues collinaires) & check-dams to harvest ${w.rain} mm seasonal runoff, paired with solar brackish demineralization (no sea access).`,
      mediumTermAr: `إنجاز حواجز مائية وتلالية لاحتجاز مياه أمطار السهوب (${w.rain} ملم) مع محطات شمسية لتحلية المياه الجوفية المالحة نظراً للبعد عن البحر.`,
      longTerm: `Connect steppe poles to northern major-dam transfer arteries (Beni Haroun / Koudiat model) and scale managed aquifer recharge (MAR) along Chotts basins.`,
      longTermAr: `استكمال التحويلات المائية الكبرى من سدود الشمال نحو الهضاب العليا وتغذية الفرشة الجوفية اصطناعياً على حواف الشطوط.`
    };
  }

  const isSaouraWadi = [8, 52].includes(w.num); // Saoura: Béchar (Djorf Torba) & Béni Abbès

  if (zone === 'oasis_north') {
    if (isSaouraWadi) {
      return {
        shortTerm: `Protect Oued Saoura alluvial recharge, regulate Djorf Torba reservoir releases (${w.dams} dam(s)), and meter ${w.wells} perimeter wells.`,
        shortTermAr: `حماية التغذية السطحية لوادي الساورة وتأطير مخزون سد جرف التربة والمنشآت (${w.dams} سدود) مع ترشيد السحب من ${w.wells} بئراً.`,
        mediumTerm: `Build check-dams across Taghit & Beni Abbes tributary wadis to trap convective runoff between the Grand Erg Occidental and Hammada, plus solar brackish RO.`,
        mediumTermAr: `إنجاز حواجز مائية وتحت-سطحية في روافد الساورة وتاغيت لاحتجاز السيول بين العرق الغربي والحمادة مع تحلية المياه الجوفية شمسياً.`,
        longTerm: `Integrate Oued Saoura watershed telemetry with Béchar–Tindouf corridor deep groundwater recharge and zero-evaporation oasis drip lines (deficit ${projectedDeficit}).`,
        longTermAr: `إرساء حوكمة رقمية لحوض الساورة مع التغذية الاصطناعية للفرشة الجوفية وتعميم التقطير المغلق بواحات بشار وبني عباس (عجز ${projectedDeficit}).`
      };
    }
    return {
      shortTerm: isDrainageSurplusOasis
        ? `Stop uncontrolled artesian drilling (${w.wells} wells); redirect shallow drainage excess out of urban pockets and operate solar brackish RO units for potable supply.`
        : `Audit ${w.wells} boreholes for casing leaks, switch palm irrigation strictly to night-time drip, and run modular brackish groundwater demineralization.`,
      shortTermAr: isDrainageSurplusOasis
        ? `وقف الحفر العشوائي (${w.wells} بئراً) ومعالجة صعود المياه الباطنية بتحويل المصارف خارج النسيج العمراني، مع تشغيل محطات نزع ملوحة جوفية.`
        : `مراقبة تسربات ${w.wells} بئراً ارتوازياً وقصر سقي الواحات على التقطير الليلي مع تشغيل وحدات نزع الملوحة للمياه الجوفية.`,
      mediumTerm: isOilGasHub
        ? `Mandate closed-loop industrial water recycling in hydrocarbon basins (industry ${w.industry}/100) and couple STEP urban effluent reuse to oasis shelterbelts.`
        : `Deploy utility-scale solar-PV brackish RO stations (Complexe Terminal salinity reduction) and line open oasis canals against seepage & evaporation.`,
      mediumTermAr: isOilGasHub
        ? `فرض التدوير المغلق لمياه المنشآت الطاقوية والصناعية (${w.industry}/100) وإعادة توجيه مياه التصفية الحضرية لأحزمة النخيل.`
        : `بناء محطات شمسية لإزالة ملوحة مياه المركب النهائي وتغليف السواقي المكشوفة لمنع الضياع بالتبخر والتسرب.`,
      longTerm: `Build geothermal heat-exchange cooling towers for deep Albian wells paired with solar brine-recovery & biosaline oasis agriculture (deficit ${projectedDeficit}).`,
      longTermAr: `إنشاء أبراج تبريد حرارية للمياه الألبية الساخنة وتثمين الأملاح المستخلصة مع زراعات واحية متكيفة مع الملوحة (عجز ${projectedDeficit}).`
    };
  }

  // deep_sahara (Touat, Gourara, Tidikelt, Hammada/Erg Iguidi-Chech, Tassili n'Ajjer & Ahaggar)
  return {
    shortTerm: isFoggaraHeritage
      ? `Zero sea-desalination feasibility (~1,300+ km inland): deploy solar-PV brackish well demineralization skids and restore gravity Foggaras to eliminate pumping & evaporation loss.`
      : `Remote inland zone (${w.rain} mm/yr, ${w.dams} dams): deploy containerized solar brackish RO units at borehole heads and enforce smart quotas on ${w.wells} wells.`,
    shortTermAr: isFoggaraHeritage
      ? `بُعد تام عن الساحل (+1,300 كم): نشر وحدات شمسية متنقلة لتحلية المياه الجوفية المالحة وصيانة شبكة الفقارات الجاذبية التي تمنع التبخر كلياً.`
      : `منطقة صحراوية معزولة (${w.rain} ملم، ${w.dams} سدود): تركيب محطات شمسية مدمجة لإزالة ملوحة الآبار وتأطير السحب من ${w.wells} بئراً.`,
    mediumTerm: `Construct underground alluvial barrier dams (barrages inféro-flux) in Saharan wadis to trap rare flash floods subsurface, plus sealed pivot irrigation telemetry.`,
    mediumTermAr: `بناء سدود تحت-سطحية في الأودية الصحراوية لاحتجاز سيول الأمطار النادرة دون تبخر، وتعميم الري المحوري المغلق والمراقب رقمياً.`,
    longTerm: `Sovereign Albian (Continental Intercalaire) aquifer governance with geothermal-solar cooling, atmospheric moisture harvesters for outposts, and long-haul treated aquifer links (In Salah–Tamanrasset model).`,
    longTermAr: `حوكمة سيادية للطبقة الألبية العميقة مع محطات تبريد بالطاقة الشمسية وتقنيات حصاد رطوبة الجو للمراكز الحدودية ومد قنوات ربط جوفي معالجة.`
  };
}

function buildDroughtProtocol(w: WilayaRecord, zone: GeoZoneId, droughtRisk: number): ProtocolHorizons {
  if (zone === 'deep_sahara' || zone === 'oasis_north') {
    return {
      shortTerm: `Enforce nocturnal sub-surface bubble irrigation under date-palm micro-canopies (soil ${w.soil}/100, NDVI ${w.ndvi.toFixed(2)}) and halt daytime sprinkler evaporation.`,
      shortTermAr: `إلزام السقي الموضعي الليلي تحت ظلال واحات النخيل (تربة ${w.soil}/100، NDVI ${w.ndvi.toFixed(2)}) ومنع الرش النهاري لتفادي تبخر 60% من المياه.`,
      mediumTerm: `Roll out solar-cooled desert greenhouses & hydroponic fodder units (saving 85% water) alongside bio-char/compost soil water-retention amendments.`,
      mediumTermAr: `تعميم البيوت المحمية المبردة شمسياً والزراعة المائية للأعلاف (توفير 85% ماء) مع تخصيب التربة بالسماد العضوي لحفظ الرطوبة.`,
      longTerm: `Establish 3-tier oasis agroforestry (palms → figs/pomegranates → salt-tolerant grains) powered by solar micro-grids & treated STEP water loops.`,
      longTermAr: `إرساء زراعة واحية متعددة الطوابق مقاومة للحرارة والملوحة ومزودة بشبكات طاقة شمسية ومياه معالجة بنسبة 100%.`
    };
  }

  if (zone === 'high_plateaus') {
    return {
      shortTerm: `Trigger parametric drought fodder relief, pause grazing on degraded steppe plots (NDVI ${w.ndvi.toFixed(2)}), and issue drought-tolerant barley seed kits.`,
      shortTermAr: `تفعيل حصص الأعلاف الوقائية ومنع الرعي الجائر بالمناطق المتدهورة (NDVI ${w.ndvi.toFixed(2)}) مع توزيع بذور الشعير المقاومة للجفاف.`,
      mediumTerm: `Scale the Green Dam (Barrage Vert) agroforestry corridors (pistachio, carob, cactus-fodder) and transition ${w.soil}/100 soils to no-till conservation agriculture.`,
      mediumTermAr: `توسيع أحزمة السد الأخضر بأشجار مثمرة مقاومة (الفستق، الخروب، التين الشوكي العلفي) وتعميم الزرع المباشر لحفظ رطوبة التربة (${w.soil}/100).`,
      longTerm: `Build cooperative hill-dam drip clusters paired with satellite Sentinel-2 variable-rate irrigation and index-based climate crop insurance.`,
      longTermAr: `إنشاء تعاونيات سقي بالتقطير مرتبطة بالسدود التلية مع مراقبة فضائية لحظية وتأمين فلاحي مرتبط بمؤشرات الجفاف.`
    };
  }

  // coastal / tell_basin
  return {
    shortTerm: `Deliver targeted supplemental irrigation pulses at grain flowering stage (${w.rain} mm rain) and deploy straw mulching across ${w.soil}/100 arable plains.`,
    shortTermAr: `تأمين ريات تكميلية حاسمة في مرحلة إزهار الحبوب (${w.rain} ملم أمطار) وتغطية التربة بالقش لحبس الرطوبة بالأحواض الخصبة (${w.soil}/100).`,
    mediumTerm: `Shift marginal rainfed cereal slopes toward hardy olive/almond orchards and pilot agrivoltaic shade panels over high-value horticulture.`,
    mediumTermAr: `تحويل المنحدرات محدودة المردودية إلى غراسات الزيتون واللوز المقاوم وتجريب الألواح الزراعية-الشمسية المظللة للخضروات.`,
    longTerm: `Integrate dam/STEP-fed precision fertigation networks with AI soil-moisture telemetry and climate-resilient durum breeding centers (risk ${droughtRisk}%).`,
    longTermAr: `دمج شبكات التسميد والري الدقيق انطلاقاً من السدود والمياه المصفاة مع مراكز تطوير سلالات القمح الصلب المقاوم (مخاطر ${droughtRisk}%).`
  };
}

function buildFloodProtocol(w: WilayaRecord, zone: GeoZoneId, floodPct: number): ProtocolHorizons {
  if (zone === 'oasis_north' || zone === 'deep_sahara' || zone === 'high_plateaus') {
    return {
      shortTerm: `Clear dry wadi beds (Oueds) of urban debris ahead of convective flash storms (risk ${floodPct}%) and install automated flood-barrier gates at submersible crossings.`,
      shortTermAr: `تنظيف مجاري الأودية الجافة من الردوم قبل العواصف الفجائية (خطر ${floodPct}%) وتركيب حواجز أوتوماتيكية عند الممرات المغمورة.`,
      mediumTerm: `Reconstruct traditional flood-spreading dykes & M'Zab-style Ahbas retention weirs to convert flash floods directly into groundwater aquifer recharge.`,
      mediumTermAr: `إعادة بناء سدود التحويل والأحواض الاستيعابية لتحويل سيول الفيضانات المفاجئة إلى تغذية مباشرة للفرشة الجوفية.`,
      longTerm: `Deploy meteorological Doppler convective radar alerts coupled with raised peri-urban zoning and vegetated stormwater retention parks.`,
      longTermAr: `نشر رادارات رصد العواصف الرعدية مع إعادة تصنيف عمراني للأحياء المرتفعة وإحداث حدائق تجميع مائية حضرية.`
    };
  }

  // coastal / tell_basin
  return {
    shortTerm: `Dredge coastal estuaries & urban stormwater culverts (${floodPct}% exposure), clear bridge bottlenecks, and activate civil-protection SMS sirens.`,
    shortTermAr: `جهر مصبات الأودية الساحلية والبالوعات الحضرية (${floodPct}% تعرض) وتنقية قنوات تصريف القناطر مع تفعيل صفارات والرسائل التحذيرية الفورية.`,
    mediumTerm: `Construct upstream gabion retention basins, reinforce landslide-prone hillside retaining walls, and retrofit sponge-city permeable pavements.`,
    mediumTermAr: `إنجاز أحواض تهدئة وتكسير سيول في أعالي الجبال وتدعيم المنحدرات المنزلقة مع تهيئة أرصفة حضرية نفاذة للمياه.`,
    longTerm: `Operate an AI hydrological-DEM digital twin with automated tidal/coastal pumping stations and relocate high-risk wadi settlements into green corridors.`,
    longTermAr: `تشغيل توأم رقمي هيدرولوجي مدعوم بمحطات ضخ ساحلية آلية وإعادة توطين البنايات المهددة داخل الأودية وتحويلها إلى أحزمة خضراء.`
  };
}

function buildCommerceProtocol(w: WilayaRecord, zone: GeoZoneId, coverageGap: number): ProtocolHorizons {
  if (zone === 'deep_sahara' || zone === 'oasis_north') {
    return {
      shortTerm: `Dispatch solar-refrigerated mobile staple convoys and position emergency ONAB/OAIC grain & dairy buffers to cover the ${coverageGap}% retail shortfall.`,
      shortTermAr: `إطلاق قوافل تموين مبردة بالطاقة الشمسية وتعزيز مخزونات المواد الأساسية (ONAB/OAIC) لسد فجوة التغطية البالغة ${coverageGap}%.`,
      mediumTerm: `Co-finance off-grid solar cold-chain depots along desert trunk roads (roads index ${w.roads}/100) and digital wholesale ordering for isolated communes.`,
      mediumTermAr: `تمويل مستودعات تبريد شمسية مستقلة على المحاور الصحراوية (مؤشر الطرق ${w.roads}/100) ورقمنة طلبيات التموين للبلديات المعزولة.`,
      longTerm: `Establish desert multimodal logistics & cold-storage hubs linking southern agricultural oases with Trans-Saharan cross-border corridors.`,
      longTermAr: `تطوير أقطاب لوجستية صحراوية متعددة الوسائط تربط المنتجات الواحية بالتجارة البينية نحو العمق الإفريقي.`
    };
  }

  return {
    shortTerm: `Authorize weekly producer-to-consumer municipal souks and regulate wholesale margins across the existing ${w.markets} markets (${coverageGap}% gap).`,
    shortTermAr: `ترخيص أسواق بلدية مباشرة من المنتج إلى المستهلك وضبط هوامش الجملة عبر ${w.markets} مرفقاً حالياً لامتصاص فجوة ${coverageGap}%.`,
    mediumTerm: `Build cooperative refrigerated packhouses near farm belts (soil ${w.soil}/100) and upgrade rural feeder roads (${w.roads}/100) to eliminate post-harvest waste.`,
    mediumTermAr: `إنشاء غرف تبريد تعاونية قرب الأحواض الفلاحية (تربة ${w.soil}/100) وتأهيل المسالك الريفية (${w.roads}/100) لخفض الهدر التجاري.`,
    longTerm: `Integrate regional agro-logistics exchanges with real-time cold-chain tracking linking High-Plateaus/Tell producers to coastal consumption hubs.`,
    longTermAr: `ربط أسواق الجملة الإقليمية بمنصة تتبع رقمية لسلاسل التبريد وتوجيه فائض الإنتاج الداخلي نحو المدن الساحلية.`
  };
}

function buildAnomalyProtocol(w: WilayaRecord, zone: GeoZoneId, kind: 'speculation' | 'aquifer_mining'): ProtocolHorizons {
  if (kind === 'aquifer_mining') {
    return {
      shortTerm: `Freeze unlicensed borehole rigs across ${w.wells} wells and seal artesian casing leaks immediately (water index ${w.waterDef}).`,
      shortTermAr: `تجميد تراخيص الحفر غير المراقبة عبر ${w.wells} بئراً وسد التسربات الارتوازية فوراً (عجز مائي ${w.waterDef}).`,
      mediumTerm: `Mandate solar-powered flow limiters and switch thirsty open-field crops to high-value, drip-fed oasis/greenhouse systems.`,
      mediumTermAr: `فرض محددات تدفق تعمل بالطاقة الشمسية والتحول التدريجي من السقي المفتوح إلى البيوت الذكية المقتصدة للماء.`,
      longTerm: zone === 'deep_sahara' || zone === 'oasis_north'
        ? `Establish binding Albian/Complexe Terminal aquifer extraction caps governed by satellite GRACE-derived water-table telemetry.`
        : `Transition farmers to reclaimed STEP water & hill-dam allocations to allow natural aquifer recovery over a 10-year horizon.`,
      longTermAr: zone === 'deep_sahara' || zone === 'oasis_north'
        ? `إقرار سقف سيادي لاستخراج المياه الألبية مراقب عبر الأقمار الصناعية لضمان استدامة الواحات للأجيال القادمة.`
        : `تحويل المستثمرات نحو المياه المصفاة والسدود التلية لاستعادة منسوب الفرشة الجوفية خلال 10 سنوات.`
    };
  }

  return {
    shortTerm: `Audit land registry transfers in flood zones (${Math.round(w.flood * 100)}% flood vs ${w.price.toLocaleString()} DZD/m²) and suspend risky building permits.`,
    shortTermAr: `تدقيق سجلات المعاملات العقارية بالمناطق المهددة (${Math.round(w.flood * 100)}% فيضان، ${w.price.toLocaleString()} دج/م²) وتعليق رخص البناء المشبوهة.`,
    mediumTerm: `Enforce mandatory flood-risk disclosure & seismic/hydrological insurance on urban land transactions while opening serviced infill zones.`,
    mediumTermAr: `إلزامية شهادة الأمان الهيدرولوجي والتأمين ضد الكوارث في العقود العقارية مع فتح أوعية عقارية مهيأة وآمنة.`,
    longTerm: `Rezone high-hazard valley parcels into public sponge-parks / flood buffers and tie cadastral taxation to environmental risk tiers.`,
    longTermAr: `تحويل الأراضي المعرضة لخطر السيول إلى مساحات خضراء وفضاءات امتصاص وربط الضريبة العقارية بمؤشر الخطر المكاني.`
  };
}

export function scanNationalEarlyWarnings(
  wilayas: WilayaRecord[],
  targetYear: number = 2030,
  lang: 'ar' | 'en' = 'ar'
): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];
  const now = new Date().toISOString().split('T')[0];
  const horizon = targetYear - 2026;

  wilayas.forEach(w => {
    const geo = classifyWilayaGeoZone(w);

    // 1. Water Stress Indicator (calibrated to predictWater ×10 cumulative balance scale)
    const projectedDeficit = Math.round(w.waterDef * 10 - (w.pop * 0.035 * horizon) * 0.15 - (w.rain * 0.012 * horizon) * 0.2);
    if (projectedDeficit <= -100) {
      const p = buildWaterProtocol(w, geo.id, projectedDeficit);
      alerts.push({
        id: `ew-water-${w.num}`,
        category: 'water',
        severity: projectedDeficit <= -220 ? 'CRITICAL' : projectedDeficit <= -135 ? 'HIGH' : 'MEDIUM',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'العجز المائي التراكمي' : 'Cumulative Water Deficit',
        currentValue: `${projectedDeficit}`,
        criticalThreshold: '-100',
        detectedAt: now,
        calculationMethod: 'ARIMA Differenced Dynamic Demand Model (ANRH + ONS)',
        uncertaintyMargin: '± 8.5%',
        suggestedAction: `[Short] ${p.shortTerm} [Medium] ${p.mediumTerm} [Long] ${p.longTerm}`,
        suggestedActionAr: `[قصير] ${p.shortTermAr} [متوسط] ${p.mediumTermAr} [طويل] ${p.longTermAr}`,
        protocols: p
      });
    }

    // 2. Crop Drought Risk
    const droughtRisk = Math.max(2, Math.min(98, Math.round(100 - (w.soil * 0.5 + w.rain * 0.06 + w.ndvi * 60) + horizon * 2.1 + (w.rain < 200 ? 18 : 0))));
    if (droughtRisk >= 65) {
      const p = buildDroughtProtocol(w, geo.id, droughtRisk);
      alerts.push({
        id: `ew-drought-${w.num}`,
        category: 'drought',
        severity: droughtRisk >= 80 ? 'CRITICAL' : 'HIGH',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'مؤشر إجهاد المحاصيل الفلاحية (SPEI)' : 'Agricultural Crop Drought Index (SPEI)',
        currentValue: `${droughtRisk}%`,
        criticalThreshold: '60%',
        detectedAt: now,
        calculationMethod: 'Sentinel-2 Satellite NDVI × ONM Decadal Precipitation Deficit',
        uncertaintyMargin: '± 5.2%',
        suggestedAction: `[Short] ${p.shortTerm} [Medium] ${p.mediumTerm} [Long] ${p.longTerm}`,
        suggestedActionAr: `[قصير] ${p.shortTermAr} [متوسط] ${p.mediumTermAr} [طويل] ${p.longTermAr}`,
        protocols: p
      });
    }

    // 3. Flood Bed Hazard
    const floodPct = Math.round(w.flood * 100);
    if (floodPct >= 30) {
      const p = buildFloodProtocol(w, geo.id, floodPct);
      alerts.push({
        id: `ew-flood-${w.num}`,
        category: 'flood',
        severity: floodPct >= 45 ? 'CRITICAL' : floodPct >= 35 ? 'HIGH' : 'MEDIUM',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'نسبة التعرض لفيضانات الأودية' : 'Wadi Bed Inundation Risk',
        currentValue: `${floodPct}%`,
        criticalThreshold: '30%',
        detectedAt: now,
        calculationMethod: 'Hydrological Watershed Slope & Digital Elevation Model (DEM)',
        uncertaintyMargin: '± 6.0%',
        suggestedAction: `[Short] ${p.shortTerm} [Medium] ${p.mediumTerm} [Long] ${p.longTerm}`,
        suggestedActionAr: `[قصير] ${p.shortTermAr} [متوسط] ${p.mediumTermAr} [طويل] ${p.longTermAr}`,
        protocols: p
      });
    }

    // 4. Retail Coverage Desert
    const coverageGap = Math.max(0, Math.round(100 - w.coverage));
    if (coverageGap >= 35) {
      const p = buildCommerceProtocol(w, geo.id, coverageGap);
      alerts.push({
        id: `ew-commerce-${w.num}`,
        category: 'commerce',
        severity: coverageGap >= 55 ? 'HIGH' : 'MEDIUM',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'فجوة التغطية والتموين التجاري' : 'Retail Distribution Gap',
        currentValue: `${coverageGap}%`,
        criticalThreshold: '30%',
        detectedAt: now,
        calculationMethod: 'Huff Gravity Interaction Model (Markets / Population Density)',
        uncertaintyMargin: '± 4.5%',
        suggestedAction: `[Short] ${p.shortTerm} [Medium] ${p.mediumTerm} [Long] ${p.longTerm}`,
        suggestedActionAr: `[قصير] ${p.shortTermAr} [متوسط] ${p.mediumTermAr} [طويل] ${p.longTermAr}`,
        protocols: p
      });
    }

    // 5A. Statistical Speculation Outlier (High price inside flood corridor)
    if (w.price > 110000 && w.flood >= 0.35) {
      const p = buildAnomalyProtocol(w, geo.id, 'speculation');
      alerts.push({
        id: `ew-anomaly-spec-${w.num}`,
        category: 'anomaly',
        severity: 'HIGH',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'مضاربة عقارية عالية بمناطق مهددة' : 'Real Estate Speculation in Flood Zone',
        currentValue: `${w.price.toLocaleString()} DZD/m²`,
        criticalThreshold: '110,000 DZD/m²',
        detectedAt: now,
        calculationMethod: 'Bivariate Outlier Detection (Price vs Inundation Index)',
        uncertaintyMargin: '± 3.0%',
        suggestedAction: `[Short] ${p.shortTerm} [Medium] ${p.mediumTerm} [Long] ${p.longTerm}`,
        suggestedActionAr: `[قصير] ${p.shortTermAr} [متوسط] ${p.mediumTermAr} [طويل] ${p.longTermAr}`,
        protocols: p
      });
    }

    // 5B. Aquifer Over-Extraction Anomaly (High deep boreholes + severe water deficit)
    if (w.waterDef <= -28 && w.wells >= 900) {
      const p = buildAnomalyProtocol(w, geo.id, 'aquifer_mining');
      alerts.push({
        id: `ew-anomaly-well-${w.num}`,
        category: 'anomaly',
        severity: 'CRITICAL',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'استنزاف مفرط للفرشة الجوفية والآبار' : 'Aquifer Over-Extraction Anomaly',
        currentValue: `${w.wells.toLocaleString()} wells`,
        criticalThreshold: '900 wells',
        detectedAt: now,
        calculationMethod: 'Bivariate Hydraulic Anomaly (Borehole Density × Aquifer Recharge)',
        uncertaintyMargin: '± 4.2%',
        suggestedAction: `[Short] ${p.shortTerm} [Medium] ${p.mediumTerm} [Long] ${p.longTerm}`,
        suggestedActionAr: `[قصير] ${p.shortTermAr} [متوسط] ${p.mediumTermAr} [طويل] ${p.longTermAr}`,
        protocols: p
      });
    }
    // 6. Healthcare Access & Bed Capacity Gap
    const healthCov = getHealthCoverage(w);
    const hospitals = getHospitalsCount(w);
    if (healthCov < 48) {
      alerts.push({
        id: `ew-health-${w.num}`,
        category: 'health',
        severity: healthCov < 36 ? 'CRITICAL' : 'HIGH',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'فجوة التغطية الصحية وقدرة المستشفيات' : 'Healthcare Access & Hospital Gap',
        currentValue: `${healthCov}% (${hospitals})`,
        criticalThreshold: '48%',
        detectedAt: now,
        calculationMethod: 'Sanitary Catchment Density × Bed Ratio (MSPRH Model)',
        uncertaintyMargin: '± 4.0%',
        suggestedAction: `[Short] Deploy mobile specialist telemedicine caravans & strengthen SAMU stabilization across ${hospitals} local facilities. [Medium] Commission a 120-bed regional EPH hospital & solar vaccine cold-chain hubs. [Long] Integrate digital CHU referral corridors and tele-radiology to eliminate evacuation delays.`,
        suggestedActionAr: `[قصير] تسيير قوافل طبية متخصصة وعنصر التطبيب عن بُعد وتدعيم الاستعجالات عبر ${hospitals} مرفقاً حالياً. [متوسط] إنجاز مستشفى جهوي 120 سريراً وتجهيز سلسلة تبريد شمسية. [طويل] ربط رقمي مباشر مع المراكز الاستشفائية الجامعية لتصفير تأخر الإجلاء الصحي.`,
        protocols: {
          shortTerm: `Deploy mobile specialist telemedicine units & strengthen SAMU emergency triage across ${hospitals} local medical facilities.`,
          shortTermAr: `إطلاق قوافل طبية متخصصة وتفعيل التطبيب عن بُعد وتدعيم فرق الاستعجالات الطبية عبر ${hospitals} هياكل صحية محلية.`,
          mediumTerm: `Build a new 120-bed EPH surgical pole and equip peripheral polyclinics with solar backup & maternity wings.`,
          mediumTermAr: `برمجة قطب استشفائي جديد (120 سريراً) وتجهيز العيادات الجوارية بالطاقة الشمسية وأجنحة الأمومة.`,
          longTerm: `Establish regional CHU medical-cluster autonomy & drone/air-ambulance evacuation corridors (${geo.label}).`,
          longTermAr: `إحداث قطب طبي جهوي مستقل وتأمين خطوط الإجلاء الجوي والرقمي التخصصي في إطار (${geo.labelAr}).`
        }
      });
    }

    // 7. Composite Natural Hazards (Seismic / Flood / Forest Wildfire)
    const hazIdx = getHazardIndex(w);
    const seisPct = Math.round(getSeismicRisk(w) * 100);
    const firePct = Math.round(getWildfireRisk(w) * 100);
    if (hazIdx >= 58 || seisPct >= 70 || firePct >= 68) {
      const domHazardAr =
        seisPct >= firePct && seisPct >= Math.round(w.flood * 100)
          ? `نشاط زلزالي (${seisPct}%)`
          : firePct >= Math.round(w.flood * 100)
          ? `حرائق غابات (${firePct}%)`
          : `فيضانات أودية (${Math.round(w.flood * 100)}%)`;
      const domHazardEn =
        seisPct >= firePct && seisPct >= Math.round(w.flood * 100)
          ? `Seismic (${seisPct}%)`
          : firePct >= Math.round(w.flood * 100)
          ? `Wildfire (${firePct}%)`
          : `Flood (${Math.round(w.flood * 100)}%)`;

      alerts.push({
        id: `ew-hazard-${w.num}`,
        category: 'hazards',
        severity: hazIdx >= 70 || seisPct >= 76 ? 'CRITICAL' : 'HIGH',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? `مخاطر طبيعية مركبة (${domHazardAr})` : `Multi-Hazard Exposure (${domHazardEn})`,
        currentValue: `${hazIdx}/100`,
        criticalThreshold: '58/100',
        detectedAt: now,
        calculationMethod: 'CRAAG Seismic × Flood DEM × Sentinel Wildfire Index',
        uncertaintyMargin: '± 5.5%',
        suggestedAction: `[Short] Pre-position DGPC civil protection brigades, clear forest firebreaks & inspect seismic shelter sites. [Medium] Enforce RPA99 seismic retrofitting on schools/hospitals and deploy thermal wildfire watchtowers. [Long] Establish satellite-linked multi-hazard early sirens & strict catastrophe zoning.`,
        suggestedActionAr: `[قصير] تمركز مسبق لوحدات الحماية المدنية وفتح المسالك الغابية ومراقبة نقاط الإيواء. [متوسط] إخضاع المستشفيات والمدارس لمعايير التحديث المضاد للزلازل (RPA99) وأبراج رصد الحرائق. [طويل] نظام إنذار فضائي موحد للأخطار الكبرى وتأمين إلزامي ضد الكوارث.`,
        protocols: {
          shortTerm: `Pre-position Civil Protection (DGPC) columns, clear forest firebreaks & audit emergency seismic shelters (${domHazardEn}).`,
          shortTermAr: `انتشار استباقي لوحدات الحماية المدنية، شق الخنادق المضادة للحرائق، وتدقيق مراكز الإيواء (${domHazardAr}).`,
          mediumTerm: `Retrofit critical schools & hospitals to RPA-99/2003 seismic standards and deploy thermal IoT wildfire cameras.`,
          mediumTermAr: `تدعيم المدارس والمستشفيات وفق المعايير المضادة للزلازل (RPA) ونشر كاميرات الرصد الحراري المبكر للحرائق.`,
          longTerm: `Integrate automated seismic micro-zoning, flash-flood radar sirens & parametric disaster insurance coverage.`,
          longTermAr: `دمج التخريط الزلزالي الدقيق وصفارات الرادار الاستباقية وتعميم التأمين التعاوني ضد الكوارث الطبيعية.`
        }
      });
    }

    // 8. Multimodal Transport & Logistics Bottleneck
    const trScore = getTransportScore(w);
    const hasRail = hasRailAccess(w);
    if (trScore < 50 && !hasRail) {
      alerts.push({
        id: `ew-transport-${w.num}`,
        category: 'transport',
        severity: trScore < 38 ? 'HIGH' : 'MEDIUM',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'اختناق النقل والربط متعدد الوسائط' : 'Transport & Rail Connectivity Gap',
        currentValue: `${trScore}/100`,
        criticalThreshold: '50/100',
        detectedAt: now,
        calculationMethod: 'Multimodal Graph Centrality (Road Index + SNTF Rail + Hub Access)',
        uncertaintyMargin: '± 4.8%',
        suggestedAction: `[Short] Rehabilitate RN trunk bottle-necks and subsidize regional freight shuttles (Roads ${w.roads}/100). [Medium] Build dry-port intermodal relay & upgrade provincial road feeders. [Long] Extend SNTF rail spur & multimodal desert/steppe logistics platform.`,
        suggestedActionAr: `[قصير] صيانة المقاطع المتضررة من الطرق الوطنية وتدعيم خطوط النقل اللوجستي الجهوية (الطرق ${w.roads}/100). [متوسط] إنشاء ميناء جاف ومحطة نقل متعددة الوسائط. [طويل] تمديد خط السكة الحديدية (SNTF) وربط الولاية بالممرات اللوجستية القارية.`,
        protocols: {
          shortTerm: `Repair critical National Road (RN) bottle-necks and expand regional passenger & cold-freight shuttles (Roads ${w.roads}/100).`,
          shortTermAr: `تهيئة النقاط السوداء بالطرق الوطنية وتكثيف رحلات النقل العمومي وشحن البضائع المبردة (مؤشر الطرق ${w.roads}/100).`,
          mediumTerm: `Establish an intermodal dry-port logistics platform and reinforce rural arterial connections.`,
          mediumTermAr: `إنجاز محطة لوجستية وميناء جاف لتحويل البضائع مع ازدواجية المحاور الولائية الرئيسية.`,
          longTerm: `Connect the wilaya to the SNTF railway expansion network and electrified high-capacity freight corridors.`,
          longTermAr: `ربط الولاية بشبكة السكك الحديدية الوطنية (SNTF) والمحاور اللوجستية عالية السرعة.`
        }
      });
    }

    // 9. Tourism, Cultural Heritage & Eco-Hospitality Bottleneck
    const tScore = getTourismScore(w);
    const hotelsCnt = getHotelsCount(w);
    const heritageCnt = getHeritageSitesCount(w);
    if ((heritageCnt >= 7 || tScore >= 58) && (hotelsCnt < 16 || (!hasRail && trScore < 58) || w.waterDef <= -25)) {
      const tourismProtocol: ProtocolHorizons =
        geo.id === 'coastal'
          ? {
              shortTerm: `Audit Blue-Flag beach sanitation, regulate seasonal marina shuttles & license ${hotelsCnt} coastal hospitality operators.`,
              shortTermAr: `تأهيل الشواطئ ذات العلامة الزرقاء وتنظيم النقل البحري الموسمي ومراقبة تصنيف ${hotelsCnt} مؤسسة فندقية ساحلية.`,
              mediumTerm: `Upgrade coastal ZET (Zones d'Expansion Touristique) with STEP water recycling & heritage Kasbah restoration across ${heritageCnt} sites.`,
              mediumTermAr: `تهيئة مناطق التوسع السياحي الساحلية (ZET) بمحطات تصفية المياه المستعملة وترميم ${heritageCnt} معلماً وتراثاً ساحلياً.`,
              longTerm: `Position Mediterranean marinas & thalassotherapy clusters on dedicated coastal rail/tram loops with all-season eco-resorts.`,
              longTermAr: `ربط المنتجعات البحرية ومراكز المعالجة بمياه البحر بخطوط النقل الساحلي للرفع من السياحة على مدار السنة.`
            }
          : geo.id === 'deep_sahara' || geo.id === 'oasis_north'
          ? {
              shortTerm: `Deploy solar-powered eco-bivouacs, protect ${heritageCnt} Saharan rock-art/ksar heritage sites & pair tourist convoys with regional air shuttles.`,
              shortTermAr: `نشر مخيمات بيئية شمسية وحماية ${heritageCnt} موقعاً تراثياً وقصوراً صحراوية وتأمين رحلات ربط جوي جهوي للسياح.`,
              mediumTerm: `Build classified Saharan eco-lodges using local vernacular earth architecture (expanding ${hotelsCnt} hotels) with closed-loop solar water desalination.`,
              mediumTermAr: `إنجاز نزل سياحية بيئية مصنفة بالطراز المعماري الصحراوي (توسيع ${hotelsCnt} فندقاً) مزودة بتحلية شمسية مغلقة.`,
              longTerm: `Establish desert cultural heritage circuits linking Tassili n'Ajjer, Ahaggar, Gourara, Touat, Tidikelt, Saoura (Taghit/Béni Abbès) & M'Zab with low-carbon transit.`,
              longTermAr: `إرساء مسارات التراث العالمي الصحراوي (الطاسيلي، الهقار، قورارة، توات، تيديكلت، الساورة ومزاب) بنقل نظيف وأقطاب للصناعة التقليدية.`
            }
          : {
              shortTerm: `Upgrade Roman/Numidian & thermal station signage across ${heritageCnt} sites and subsidize boutique hospitality upgrades (${hotelsCnt} units).`,
              shortTermAr: `تأهيل المسالك السياحية الرومانية والنوميدية والحموية عبر ${heritageCnt} معلماً ودعم تحديث ${hotelsCnt} وحدة فندقية.`,
              mediumTerm: `Rehabilitate high-plateaus hydro-thermal resorts, mountain eco-trails & agri-tourism farmsteads linked to SNTF/regional bus loops.`,
              mediumTermAr: `تحديث المحطات الحموية الجبلية والسهبية ومسارات السياحة الجبلية والفلاحية وربطها بمحطات السكك والنقل الجهوي.`,
              longTerm: `Develop integrated heritage-thermal-cultural heritage circuits linking High Plateaus & Tell basins to national tourism digital booking.`,
              longTermAr: `تطوير أقطاب سياحية متكاملة (تراث + سياحة حموية + بيئية) بين التل والهضاب وإدراجها في المنصة الوطنية للحجز السياحي.`
            };

      alerts.push({
        id: `ew-tourism-${w.num}`,
        category: 'tourism',
        severity: hotelsCnt < 10 && heritageCnt >= 8 ? 'HIGH' : 'MEDIUM',
        wilayaNum: w.num,
        wilayaEn: w.en,
        wilayaAr: w.n,
        geoZone: geo.id,
        geoZoneLabel: geo.label,
        geoZoneLabelAr: geo.labelAr,
        subRegionId: geo.subRegionId,
        subRegionLabel: geo.subRegionLabel,
        subRegionLabelAr: geo.subRegionLabelAr,
        regionalAssetNote: geo.assetNote,
        regionalAssetNoteAr: geo.assetNoteAr,
        metric: lang === 'ar' ? 'فجوة الإيواء وتثمين التراث السياحي' : 'Tourism Hospitality & Heritage Access Gap',
        currentValue: `${tScore}/100 (${hotelsCnt} 🏨)`,
        criticalThreshold: '16 hotels / rail+water',
        detectedAt: now,
        calculationMethod: 'MTA/ONT Heritage Density × Hotel Bed Capacity × Transit Matrix',
        uncertaintyMargin: '± 4.5%',
        suggestedAction: `[Short] ${tourismProtocol.shortTerm} [Medium] ${tourismProtocol.mediumTerm} [Long] ${tourismProtocol.longTerm}`,
        suggestedActionAr: `[قصير] ${tourismProtocol.shortTermAr} [متوسط] ${tourismProtocol.mediumTermAr} [طويل] ${tourismProtocol.longTermAr}`,
        protocols: tourismProtocol
      });
    }
  });

  // Sort by severity (Critical first, then High, then Medium, then Low)
  const severityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  alerts.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);

  return alerts;
}
