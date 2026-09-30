// Losing something in Japan, where the system for getting it back is the best in the world and
// the hard part is knowing which desk and what to say. Three things on one page: the words, in
// Japanese, to hand over or read out; the right desk for where it was lost, worked out from the
// lines on that day's route cards; and the police report, which is what the insurer will ask
// for. Nothing here needs a signal except the phone call itself.
//
// Contacts as published by each operator, checked 30 September 2026; each is linked so a
// changed number is a tap away rather than a wrong call.
import {LINES,routeFor} from './route-data.js';
import {activeSteps} from './timing.js';
export const ITEMS=[
 ['wallet','wallet','財布'],['phone','phone','スマホ'],['bag','bag','かばん'],['backpack','backpack','リュック'],['jacket','jacket','上着'],
 ['umbrella','umbrella','傘'],['hat','hat','帽子'],['toy','toy','おもちゃ'],['plush','soft toy','ぬいぐるみ'],['camera','camera','カメラ'],
 ['passport','passport','パスポート'],['bottle','water bottle','水筒'],['glasses','glasses','眼鏡',true],['earphones','earphones','イヤホン',true],
 ['tablet','tablet','タブレット'],['stroller','stroller','ベビーカー'],['tickets','tickets','切符',true],['ic','IC card','ICカード'],['keys','keys','鍵',true],['other','something','忘れ物']
];
export const COLOURS=[['','',''],['red','red','赤い'],['blue','blue','青い'],['black','black','黒い'],['white','white','白い'],['green','green','緑の'],['yellow','yellow','黄色い'],['pink','pink','ピンクの'],['grey','grey','灰色の'],['brown','brown','茶色の'],['orange','orange','オレンジの'],['purple','purple','紫の']];
// The desks. `for` is what the where-picker calls it; operators match route-data's names.
export const DESKS=[
 {id:'jreast',operator:'JR East',title:'JR East Infoline',phone:'050-2016-1603',hours:'10:00–18:00, English',note:'Also the staff at any JR East gate the same day: they can ring the terminal station straight away.',url:'https://www.jreast.co.jp/multi/customer_support/infoline.html'},
 {id:'jrcentral',operator:'JR Central',title:'JR Central lost property (Tokaido Shinkansen)',phone:'050-3772-3910',hours:'9:00–17:00, press 3; an interpreter joins',note:'Say the train name and number from the ticket (Nozomi 33), the car and the seat.',url:'https://global.jr-central.co.jp/en/lost-and-found/'},
 {id:'jrwest',operator:'JR West',title:'JR West: any staffed gate or Midori no Madoguchi',phone:'',hours:'Station hours',note:'JR West has no English lost-property line; the ticket office at the nearest big station (Kyoto, Shin-Osaka) looks it up on the spot.',url:'https://www.westjr.co.jp/global/en/'},
 {id:'metro',operator:'Tokyo Metro',title:'Tokyo Metro Lost & Found Center, Iidabashi',phone:'0120-104-767',hours:'9:00–20:00, English',note:'Found things go to the station first, then to Iidabashi the next day.',url:'https://www.tokyometro.jp/lang_en/support/lost/index.html'},
 {id:'toei',operator:'Toei',title:'Toei Subway: the station office',phone:'',hours:'Station hours',note:'Toei and Tokyo Metro are different companies; a thing left on the Oedo or Asakusa line is Toei’s.',url:'https://www.kotsu.metro.tokyo.jp/eng/'},
 {id:'osaka',operator:'Osaka Metro',title:'Osaka Metro customer centre; Lost & Found at Namba (Yotsubashi Line)',phone:'050-3355-8208',hours:'Daytime',note:'',url:'https://subway.osakametro.co.jp/en/'},
 {id:'kyoto',operator:'Kyoto Municipal Subway',title:'Kyoto Subway: the station office',phone:'',hours:'Station hours',note:'Kyoto city buses go through the same office at Kyoto Station.',url:'https://www.city.kyoto.lg.jp/kotsu/'},
 {id:'kintetsu',operator:'Kintetsu',title:'Kintetsu: the station office',phone:'',hours:'Station hours',note:'',url:'https://www.kintetsu.co.jp/foreign/english/'},
 {id:'odakyu',operator:'Odakyu',title:'Odakyu: the station office',phone:'',hours:'Station hours',note:'',url:'https://www.odakyu.jp/english/'},
 {id:'narakotsu',operator:'Nara Kotsu',title:'Nara Kotsu bus: the Nara Station bus office',phone:'',hours:'Daytime',note:'',url:'https://www.narakotsu.co.jp/language/en/'},
 {id:'resortline',operator:'Maihama Resort Line',title:'Disney Resort Line lost and found',phone:'047-305-2424',hours:'From an hour before the parks open to an hour after they close; Japanese',note:'Hand the phone to a Cast Member or the hotel desk to make the call.',url:'https://www.tokyodisneyresort.jp/en/tdr/resortline/lost.html'},
 {id:'disney',for:'park',operator:'Tokyo Disney Resort',title:'In the parks: Main Street House (Disneyland) or Guest Relations by the entrance (DisneySea)',phone:'',hours:'Park hours',note:'Tell the nearest Cast Member first. After the day, the online form; the resort does not ring if it is not found.',url:'https://inq.tokyodisneyresort.jp/form/pub/lost/en'},
 {id:'usj',for:'park',operator:'Universal Studios Japan',title:'USJ Lost and Found, just inside the gates on the left',phone:'0570-20-0606',hours:'9:00–17:00',note:'Ask any crew member on the day.',url:'https://www.usj.co.jp/web/en/us/service-guide/theme-park-services/lost-item'},
 {id:'haneda',for:'airport',operator:'Haneda Airport',title:'Haneda Airport lost and found',phone:'+81-3-5757-7710',hours:'10:00–17:00',note:'Things left on the plane are the airline’s, not the airport’s: Qantas at the gate or the check-in desk.',url:'https://tokyo-haneda.com/en/lost/index.html'},
 {id:'taxi',for:'taxi',operator:'Taxi',title:'The taxi company on the receipt',phone:'',hours:'',note:'The receipt names the company and the car; the hotel front desk will ring them. No receipt: the hotel can still ask the local taxi centre with the time and the route.',url:''},
 {id:'hotel',for:'hotel',operator:'Hotel',title:'The front desk',phone:'',hours:'',note:'Housekeeping bags everything found in a room; ask by room number and date, and they will post it on.',url:''},
 {id:'shop',for:'shop',operator:'A shop or restaurant',title:'Go back, or ring',phone:'',hours:'',note:'The receipt has the number. A shop keeps a found thing for a day or two, then hands it to the police.',url:''}
];
export const deskFor=id=>DESKS.find(d=>d.id===id)||null;
// The desks for a day: the operators on that day's route cards in the order they are ridden,
// a park if the day is a park day, the airport on a flight day, then the hotel and the rest.
export function desksFor(state,day){
 const steps=activeSteps(state||{days:[],steps:[]},day),ops=[],park=[];
 for(const s of steps){
  for(const leg of routeFor(s)||[])if(leg.mode==='ride'&&LINES[leg.line]?.operator&&!ops.includes(LINES[leg.line].operator))ops.push(LINES[leg.line].operator);
  const t=`${s.title||''} ${s.place||''}`;
  if(/disney/i.test(t)&&!park.includes('disney'))park.push('disney');
  if(/universal|usj/i.test(t)&&!park.includes('usj'))park.push('usj');
  if(/haneda|flight|qantas/i.test(t)&&!park.includes('haneda'))park.push('haneda');
 }
 const today=ops.map(o=>DESKS.find(d=>d.operator===o&&!d.for)).filter(Boolean).concat(park.map(deskFor));
 const rest=DESKS.filter(d=>!today.includes(d));
 return {today,rest};
}
// The words. Big Japanese first, because it is for the person being handed the phone.
export function lostDraft({item='other',colour='',detail='',where='',when='',phone=''}={}){
 const it=ITEMS.find(([id])=>id===item)||ITEMS.at(-1),col=COLOURS.find(([id])=>id===colour)||COLOURS[0];
 const ja=[`すみません、落とし物をしました。`,`${when?`${when}、`:''}${where?`${where}で`:''}${col[2]}${it[2]}をなくしました。`,detail?`${detail}`:'',phone?`見つかったら、この番号に連絡してください：${phone}`:''].filter(Boolean);
 const phrase=`${col[1]?`${col[1]} `:''}${it[1]}`,article=it[3]||it[0]==='other'?'':(/^[aeiou]/i.test(phrase)?'an ':'a ');
 const en=[`Excuse me, I have lost something.`,`${when?`${when}, `:''}I lost ${article}${phrase}${where?` ${/^(on|at|in) /.test(where)?where:`at ${where}`}`:''}.`,detail,phone?`If it is found, please contact this number: ${phone}.`:''].filter(Boolean);
 return {ja,en,text:`${ja.join('')}\n${en.join(' ')}`};
}
// The police. A lost-property report (遺失届, ishitsu-todoke) at any kōban is free, takes ten
// minutes, and is what an insurer asks for; found things across Japan are matched against it.
export const KOBAN=[
 'Find the nearest kōban (交番): the small police box at most big stations and junctions. Maps: search 交番.',
 'Ask for a lost-property report: 遺失届を出したいです (ishitsu-todoke o dashitai desu). Show this page.',
 'They write down what, where, when and your contact. Give the hotel’s name and a parent’s mobile.',
 'Take a photo of the receipt slip: the report number (受理番号) is what the insurer wants, and what you quote if a desk rings.',
 'In Tokyo the report can also be made online, in English, on the Metropolitan Police site below.'
];
export const POLICE_LINKS=[
 ['Tokyo Metropolitan Police: lost property','https://www.keishicho.metro.tokyo.lg.jp/multilingual/english/finding_services/lost_and_found/index.html'],
 ['Where the lost and found centre is (Tokyo)','https://www.keishicho.metro.tokyo.lg.jp/multilingual/english/finding_services/lost_and_found/information_map.html']
];
// What an insurance claim wants, gathered from what the app already holds.
export const CLAIM=[
 ['report','The police report number, from the kōban slip'],
 ['when','When and where it was lost, from the day’s stops'],
 ['value','What it was worth: the receipt in Family spending, the shop’s listing, or a photo of it'],
 ['policy','The policy number and the insurer’s assistance line, from Tickets tagged insurance'],
 ['calls','Who was rung and when: the desk, the report, the insurer; the call is usually needed within a day or two']
];
export function claimSummary({draft,day,stepTitle,report='',policy=''}){
 return [`Lost-property claim`,`Date: ${day||''}${stepTitle?` · ${stepTitle}`:''}`,`Item: ${draft?.en?.[1]||''}`,report?`Police report number: ${report}`:'Police report number: (add from the kōban slip)',policy?`Policy: ${policy}`:'Policy: (from Tickets tagged insurance)'].join('\n');
}
