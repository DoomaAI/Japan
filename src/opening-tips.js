// What the opening screen shows while the trip comes in: the guide's facts, a Japanese word and
// a tip (getting around, money, the boys, manners and the rest), taking turns — any of the three, or none, leaving nothing but the cover
// and the count. It is chosen in Settings and under Customise, and kept on this phone only.
export const TIP_KEY='japan.opening.tips';
export const TIP_KINDS=[
 {id:'facts',label:'Facts'},
 {id:'words',label:'Words'},
 {id:'tips',label:'Tips'},
];
const ALL=TIP_KINDS.map(k=>k.id);
// Kept as the kinds that are on, comma-separated, or 'off' for none. Earlier versions kept one
// of 'both', 'facts', 'words' or 'off'; 'both' was the default, so it reads as everything.
export function cleanTips(v){
 if(v==='off')return [];
 if(v==null||v==='both')return [...ALL];
 const on=String(v).split(',').filter(k=>ALL.includes(k));
 return on.length?ALL.filter(k=>on.includes(k)):[...ALL];
}
export function readTips(store=globalThis.localStorage){try{return cleanTips(store?.getItem(TIP_KEY));}catch{return [...ALL];}}
export function writeTips(kinds,store=globalThis.localStorage){
 const t=ALL.filter(k=>kinds.includes(k));
 try{store?.setItem(TIP_KEY,t.length?t.join(','):'off');}catch{}
 return t;
}
export const toggleTip=(kinds,kind)=>kinds.includes(kind)?kinds.filter(k=>k!==kind):[...kinds,kind];
export const showsFacts=t=>t.includes('facts');
export const showsWords=t=>t.includes('words');
export const showsTips=t=>t.includes('tips');
