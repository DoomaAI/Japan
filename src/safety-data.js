import {BOYS,personProfile} from './trip-features.js';
// Everything on the safety page is fixed text, so it is in the app itself and works with no
// signal at all. The numbers are the official ones as they stood when this was written; the
// embassy and consulate numbers are worth a check against DFAT's Smartraveller page before
// they are needed, which is why that page is linked beside them.
export const EMERGENCY=[
 {id:'police',number:'110',title:'Police',note:'Crime, a lost child, a traffic accident.'},
 {id:'ambulance',number:'119',title:'Ambulance and fire',note:'Say “kyūkyū” for an ambulance or “kaji” for a fire. Free to call.'},
 {id:'hotline',number:'050-3816-2787',title:'Japan Visitor Hotline',note:'JNTO’s 24-hour line in English: illness, accidents, disasters and where to get help.'},
 {id:'medical',number:'#7119',title:'Is it an emergency?',note:'Medical advice line in Tokyo, Osaka and some other areas. Mostly Japanese; use the hotel desk to help.'}
];
export const CONSULAR=[
 {id:'tokyo',title:'Australian Embassy, Tokyo',number:'+81 3 5232 4111',address:'2-1-14 Mita, Minato-ku, Tokyo'},
 {id:'osaka',title:'Australian Consulate-General, Osaka',number:'+81 6 6941 9271',address:'Twin 21 MID Tower 29F, 2-1-61 Shiromi, Chuo-ku, Osaka'},
 {id:'dfat',title:'DFAT Consular Emergency Centre (24 hours)',number:'+61 2 6261 3305',address:'From anywhere, for serious trouble overseas'}
];
export const SAFETY_LINKS=[
 ['Safety tips app (Japan Tourism Agency): earthquake, tsunami and typhoon alerts in English','https://www.jnto.go.jp/safety-tips/eng/'],
 ['Smartraveller: Japan','https://www.smartraveller.gov.au/destinations/asia/japan'],
 ['NHK World: news and disaster updates in English','https://www3.nhk.or.jp/nhkworld/'],
 ['Japan Meteorological Agency: warnings','https://www.jma.go.jp/jma/indexe.html']
];
export const DISASTER=[
 {id:'quake',title:'Earthquake',steps:['Drop, cover, hold on. Get under a table and away from windows.','Do not run outside while it is shaking; things fall off buildings.','Afterwards, follow hotel or station staff. The evacuation map is on the back of the hotel room door.','Expect trains to stop for checks. Stay put rather than walk a long way.']},
 {id:'tsunami',title:'Tsunami warning',steps:['Near the coast or the bay, go up: a tall, solid building or high ground, straight away.','Do not wait to see the water. Stay up until the warning is lifted.']},
 {id:'typhoon',title:'Typhoon',steps:['Warnings come a day or two ahead. Trains and flights stop on the day it arrives.','Plan an indoor day near the hotel, get cash, water and snacks the day before, and charge the power banks.','Check the Safety tips app and NHK World for when trains restart.']}
];
// How each boy's name is written and said, for his lost card.
const KATAKANA={Nate:'ネイト',Boston:'ボストン'};
const AGE={Nate:5,Boston:8};
// The card a boy shows a station attendant or a police officer if he is lost on his own:
// his name and age, that he is Australian and speaks English, both parents' phones, and
// tonight's hotel. The Japanese is what the adult reads; the English is for him.
export function lostCard(state,name,date){
 const day=(state.days||[]).find(d=>d.date===date)||state.days?.[0]||{};
 const meeting=state.meetings?.[day.date]||{};
 const age=personProfile(state,name).age??AGE[name]??null;
 const kana=KATAKANA[name]||name;
 const parents=['Damien','Lauren'].map(n=>({name:n,phone:(state.contacts||{})[n]||''}));
 return {
  name,kana,age,
  ja:['迷子になりました。',`名前は${kana}です。${age?`${age}歳です。`:''}`,'オーストラリアから来ました。英語を話します。','親に電話してください。'],
  en:[`My name is ${name}.${age?` I am ${age}.`:''}`,'I am lost. I am from Australia and I speak English.','Please phone my mum or dad.'],
  parents,
  hotel:{name:meeting.hotelJapanese||day.hotel||'',english:meeting.hotelJapanese?day.hotel:'',address:meeting.hotelAddress||''}
 };
}
export const lostCardNames=state=>(state.members||[]).filter(n=>BOYS.includes(n));
