// Things we noticed: the small moments that are not an activity, a photo or a find — the man
// bowing to the train as it left, the vending machine that sang, Nate spotting the same cat
// three days running. Said out loud more than typed, because the moment is usually one where
// nobody has a free hand. Each one can be tagged to where it happened (a stop, a place off our
// map, or where the phone was standing) and to a thing it was about (a hunt find or a shop find).
import {huntState,findHunt} from './hunt-data.js';
export const MAX_NOTICED=1000,NOTICED_TEXT=2000;
// What a noticing can be about, other than a place: something already on one of our lists.
// Stored as `kind:id`, so it can say which list it came from without a second field to disagree.
export const NOTICED_ITEM_KINDS=['hunt','find'];
export const noticedState=state=>state.noticed||[];
export const itemKey=item=>item?`${item.kind}:${item.id}`:'';
export function readItem(value){
 const [kind,...rest]=String(value||'').split(':'),id=rest.join(':');
 return NOTICED_ITEM_KINDS.includes(kind)&&id?{kind,id}:null;
}
// Everything a noticing could be tagged to, grouped the way the picker shows it.
export function noticedItems(state){
 const hunts=huntState(state).entries.map(e=>{const h=findHunt(state,e.hunt);
  return {kind:'hunt',id:e.id,label:`${h?.icon||'⭐'} ${e.title}`,group:h?.title||'Our lists'};});
 const finds=(state.shortlist||[]).map(f=>({kind:'find',id:f.id,label:`🛍️ ${f.title}`,group:'Shop finds'}));
 return [...hunts,...finds];
}
// The thing a noticing is tagged to, or null once it has gone from its list: the noticing stays.
export function noticedItem(state,n){
 if(!n?.item)return null;
 return noticedItems(state).find(i=>i.kind===n.item.kind&&i.id===n.item.id)||null;
}
export function noticedFields(o){
 const pin=o.pin&&Number.isFinite(o.pin.lat)&&Number.isFinite(o.pin.lng)?{lat:o.pin.lat,lng:o.pin.lng}:null;
 const item=o.item&&NOTICED_ITEM_KINDS.includes(o.item.kind)&&typeof o.item.id==='string'?{kind:o.item.kind,id:o.item.id}:null;
 return {text:String(o.text||'').trim(),day:o.stepId?null:(o.day??null),stepId:o.stepId||null,locationId:o.locationId||null,pin,item,
  spoken:!!o.spoken};
}
// Where it happened, the same way a hunt find says it: the stop, else the place, else the day.
export function noticedWhere(state,n){
 const step=n.stepId?(state.steps||[]).find(s=>s.id===n.stepId)||null:null;
 const loc=n.locationId?(state.locations||[]).find(l=>l.id===n.locationId)||null:null;
 const day=step?.day||n.day||null;
 const city=loc?.city||(day?(state.days||[]).find(d=>d.date===day)?.city:null)||null;
 const label=loc?.name||step?.title||'';
 const mapUrl=n.pin?`https://www.google.com/maps/search/?api=1&query=${n.pin.lat},${n.pin.lng}`
  :loc?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([loc.name,loc.address,city,'Japan'].filter(Boolean).join(' '))}`:null;
 return {step,loc,day,city,label,mapUrl};
}
// Newest first, optionally for one day, one of us, or one stop.
export function noticedFor(state,{day=null,person=null,stepId=null}={}){
 return noticedState(state).filter(n=>(!person||n.by===person)&&(!stepId||n.stepId===stepId)&&(!day||noticedWhere(state,n).day===day))
  .sort((a,b)=>String(b.at).localeCompare(String(a.at)));
}
