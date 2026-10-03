// What the opening screen shows while the trip comes in: the guide's facts and a Japanese word
// taking turns, only one of the two, or nothing but the cover and the count. It is chosen in
// Settings and under Customise, and kept on this phone only.
export const TIP_KEY='japan.opening.tips';
export const TIP_OPTIONS=[
 {id:'both',label:'Facts and words'},
 {id:'facts',label:'Facts only'},
 {id:'words',label:'Words only'},
 {id:'off',label:'No tips'},
];
export const cleanTips=v=>TIP_OPTIONS.some(o=>o.id===v)?v:'both';
export function readTips(store=globalThis.localStorage){try{return cleanTips(store?.getItem(TIP_KEY));}catch{return 'both';}}
export function writeTips(v,store=globalThis.localStorage){const t=cleanTips(v);try{store?.setItem(TIP_KEY,t);}catch{}return t;}
export const showsFacts=t=>t==='both'||t==='facts';
export const showsWords=t=>t==='both'||t==='words';
