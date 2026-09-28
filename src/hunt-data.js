import {isHalfStar} from './trip-features.js';
// The hunts: things we try again and again and want to know which was best. The food list rates
// a dish once each; a hunt rates every one of them — the matcha at Maruni against the one in
// Uji, this capsule against the last — and keeps a leaderboard. Anyone adds a find and everyone
// rates it for themselves, the boys included.
export const HUNTS=[
 {id:'matcha',title:'Matcha',icon:'🍵',hint:'Every matcha, latte and matcha sweet'},
 {id:'gachapon',title:'Gachapon',icon:'🎰',hint:'What came out of the capsule, and was it any good'},
 {id:'kitkat',title:'KitKat flavours',icon:'🍫',hint:'The Japan-only flavours'},
 {id:'ramen',title:'Ramen',icon:'🍜',hint:'Every bowl'},
 {id:'softserve',title:'Soft serve',icon:'🍦',hint:'Soft-serve ice cream, every flavour'},
 {id:'popcorn',title:'Theme park popcorn',icon:'🍿',hint:'The flavours at Universal and Disney'},
 {id:'onigiri',title:'Konbini onigiri',icon:'🍙',hint:'Convenience store rice balls'},
 {id:'vending',title:'Vending machine drinks',icon:'🥤',hint:'The strange ones included'}
];
export const MAX_CUSTOM_HUNTS=20,MAX_HUNT_ENTRIES=1000;
export const EMPTY_HUNTS={custom:[],entries:[],rankings:{}};
export const huntState=state=>({...EMPTY_HUNTS,...(state.hunts||{})});
export const allHunts=state=>[...HUNTS,...huntState(state).custom];
export const findHunt=(state,id)=>allHunts(state).find(h=>h.id===id)||null;
// A find is either something we want to try, or something we have. Only what we have tried is
// rated and ranked; the rest is the list to go looking for. Anything saved before there was a
// "want to try" was tried.
export const isTried=e=>e?.status!=='want';
export const huntWants=(state,huntId)=>huntState(state).entries.filter(e=>e.hunt===huntId&&!isTried(e))
 .sort((a,b)=>String(a.at).localeCompare(String(b.at)));
const triedIn=(state,huntId)=>huntState(state).entries.filter(e=>e.hunt===huntId&&isTried(e));
export function huntAverage(entry){
 const v=Object.values(entry.ratings||{}).filter(isHalfStar);
 return v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length*10)/10:null;
}
// Best first: by the average, then by how many rated it, then newest. Unrated ones last.
export function huntBoard(state,huntId){
 const list=triedIn(state,huntId);
 const ranked=[...list].sort((a,b)=>(huntAverage(b)??-1)-(huntAverage(a)??-1)
  ||Object.keys(b.ratings||{}).length-Object.keys(a.ratings||{}).length||String(b.at).localeCompare(String(a.at)));
 const members=state.members||[];
 const favourites=Object.fromEntries(members.map(n=>{
  const mine=list.filter(e=>(e.ratings||{})[n]>0).sort((a,b)=>b.ratings[n]-a.ratings[n]||String(b.at).localeCompare(String(a.at)));
  return [n,mine[0]||null];
 }).filter(([,e])=>e));
 const best=ranked.find(e=>huntAverage(e)!==null)||null;
 return {entries:ranked,count:list.length,wants:huntWants(state,huntId).length,best,favourites};
}
export function huntEntryFields(o){
 return {hunt:o.hunt,title:String(o.title||'').trim(),place:String(o.place||'').trim(),day:o.stepId?null:(o.day??null),
  yen:Number.isInteger(o.yen)&&o.yen>=0?o.yen:null,note:String(o.note||'').trim(),
  status:o.status==='want'?'want':'tried',shortlistId:o.shortlistId||null,
  stepId:o.stepId||null,locationId:o.locationId||null,pin:o.pin&&Number.isFinite(o.pin.lat)&&Number.isFinite(o.pin.lng)?{lat:o.pin.lat,lng:o.pin.lng}:null};
}
// Where a find was: pinned where the phone stood, a stop on the plan, or a place off our map.
// The city comes from whichever of those it has, so a hunt can be read one city at a time.
export function huntWhere(state,e){
 const step=e.stepId?(state.steps||[]).find(s=>s.id===e.stepId)||null:null;
 const loc=e.locationId?(state.locations||[]).find(l=>l.id===e.locationId)||null:null;
 const day=step?.day||e.day||null;
 const city=loc?.city||(day?(state.days||[]).find(d=>d.date===day)?.city:null)||null;
 const label=[loc?.name||step?.title||'',e.place].filter(Boolean).join(' · ');
 const mapUrl=e.pin?`https://www.google.com/maps/dir/?api=1&destination=${e.pin.lat},${e.pin.lng}&travelmode=walking`
  :(loc||step||e.place)?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.place,loc?.name,loc?.address,step?.place||step?.title,city,'Japan'].filter(Boolean).join(' '))}`:null;
 return {step,loc,day,city,label,mapUrl};
}
export const huntCities=(state,huntId)=>[...new Set(huntState(state).entries.filter(e=>e.hunt===huntId).map(e=>huntWhere(state,e).city).filter(Boolean))].sort();
// Each person's own order for a hunt, best first. Finds they have not placed yet go on the end,
// newest last, so a new one waits at the bottom of their list to be dragged into place.
export function personalOrder(state,huntId,person){
 const entries=triedIn(state,huntId);
 const saved=(huntState(state).rankings?.[huntId]?.[person]||[]).filter(id=>entries.some(e=>e.id===id));
 const rest=entries.filter(e=>!saved.includes(e.id)).sort((a,b)=>String(a.at).localeCompare(String(b.at))).map(e=>e.id);
 return [...saved,...rest];
}
export const hasRanked=(state,huntId,person)=>(huntState(state).rankings?.[huntId]?.[person]||[]).length>0;
// The family's order, from everybody who has dragged theirs: first place in a list of n is worth
// 1, last is worth 0, and a find's score is the average of what it got from each list it is in.
// Ties fall back to the stars.
export function familyRanking(state,huntId){
 const entries=triedIn(state,huntId);
 const lists=Object.entries(huntState(state).rankings?.[huntId]||{}).filter(([,ids])=>Array.isArray(ids)&&ids.length);
 const score={},votes={};
 for(const [,ids] of lists){
  const valid=ids.filter(id=>entries.some(e=>e.id===id)),n=valid.length;
  valid.forEach((id,i)=>{score[id]=(score[id]||0)+(n>1?1-i/(n-1):1);votes[id]=(votes[id]||0)+1;});
 }
 const ranked=entries.map(e=>({entry:e,score:votes[e.id]?Math.round(score[e.id]/votes[e.id]*100)/100:null,votes:votes[e.id]||0}))
  .sort((a,b)=>(b.score??-1)-(a.score??-1)||(huntAverage(b.entry)??-1)-(huntAverage(a.entry)??-1));
 return {ranked,people:lists.map(([n])=>n)};
}
// A shop find we bought can go into a list to be rated. Once, and it remembers where it came from.
export const huntForShortlist=(state,findId)=>huntState(state).entries.find(e=>e.shortlistId===findId)||null;
export const shortlistToHunt=f=>({title:f.title,place:f.shop||f.place||'',day:f.stepId?null:(f.day??null),yen:Number.isInteger(f.price)?f.price:null,
 note:f.notes||'',stepId:f.stepId||null,locationId:f.locationId||null,pin:f.pin||null,shortlistId:f.id,status:'tried'});
