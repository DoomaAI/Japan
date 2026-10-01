// The trip highlights video, as data. The plan is the roadmap's: the Claude API reads and chooses,
// it does not make video, so Claude picks the moments and writes the captions (an edit list), and
// the phone puts them together on a canvas and records it (Highlights.jsx). Everything here is the
// part both sides agree on: what can be a shot, what sound goes under it, the edit list's shape and
// the checks any edit list has to pass before a phone will render it.
//
// A shot is one of our own pictures or clips, never anything generated: a photo of the day, a
// boy's photo, or a gallery photo or video. A sound is one of our sound postcards — the station
// melody, the temple bell — played under the shots from the stop it was recorded at.
import {photosFor,photoOfTheDay,photoOwner,stepRatings} from './trip-features.js';
import {clamp} from './text.js';
export const SHOT_SECONDS=3.2,TITLE_SECONDS=2.4,MAX_SHOTS=40,MAX_PER_DAY=4,MAX_VIDEO_SECONDS=6;
const isVideo=d=>String(d.type||'').startsWith('video/');
const isImage=d=>String(d.type||'').startsWith('image/');
const avg=r=>{const v=Object.values(r||{});return v.length?v.reduce((a,b)=>a+b,0)/v.length:0;};
// Every picture or clip that could be a shot, with what is known about it.
export function candidateShots(state){
 const steps=state?.steps||[],stepOf=id=>steps.find(s=>s.id===id)||null,out=[];
 for(const d of state?.days||[]){
  const winners=new Set((photoOfTheDay(state,d.date)?.winners||[]).map(p=>p.id));
  for(const p of photosFor(state,d.date))if(p.pathname)out.push({ref:`photo:${p.id}`,kind:'image',day:d.date,url:`/api/photo?id=${encodeURIComponent(p.id)}`,
   who:photoOwner(p),title:p.title||p.feedback?.title||'',best:winners.has(p.id),stars:0,stepId:null,stop:''});
 }
 for(const doc of state?.documents||[]){
  if(doc.category!=='memory'||doc.tags?.includes('highlights')||doc.parentDocumentId||!doc.pathname||!(isImage(doc)||isVideo(doc)))continue;
  const step=stepOf(doc.stepId),day=doc.day||step?.day||null;if(!day)continue;
  out.push({ref:`doc:${doc.id}`,kind:isVideo(doc)?'video':'image',day,url:`/api/document?id=${encodeURIComponent(doc.id)}`,
   who:doc.person||'',title:doc.title||'',best:false,stars:step?Math.round(avg(stepRatings(state,step.id))*10)/10:0,stepId:step?.id||null,stop:step?.title||''});
 }
 return out.sort((a,b)=>a.day.localeCompare(b.day)||(b.best-a.best)||(b.stars-a.stars));
}
// The sound postcards, and which one belongs under a shot: the one from the shot's own stop, or
// failing that the day's. A sound is used once in the video, so it is not heard twice.
export const soundsOf=state=>(state?.voiceNotes||[]).filter(v=>v.kind==='sound'&&v.pathname);
export function soundFor(state,shot,used=new Set()){
 const free=soundsOf(state).filter(v=>!used.has(v.id));
 return (shot.stepId&&free.find(v=>v.stepId===shot.stepId))||free.find(v=>v.day===shot.day)||null;
}
// What there is to cut from, counted: the page says this before anything is planned.
export function highlightsMaterial(state){
 const shots=candidateShots(state),days=new Set(shots.map(s=>s.day));
 return {shots:shots.length,images:shots.filter(s=>s.kind==='image').length,videos:shots.filter(s=>s.kind==='video').length,
  sounds:soundsOf(state).length,days:days.size,bestOfDay:shots.filter(s=>s.best).length};
}
// An edit list without asking anybody: a title card, then for each day its title and up to four
// shots (the photo of the day first, then the best-starred stops), the sounds laid under the shots
// they belong to, and a closing card. It is also what Claude's plan is checked against.
export function defaultEditList(state){
 const shots=candidateShots(state),used=new Set(),items=[];
 const name=state?.tripName||'Our trip';
 items.push({kind:'title',text:name,sub:`${(state?.days||[]).length} days`,seconds:TITLE_SECONDS});
 for(const d of state?.days||[]){
  const mine=shots.filter(s=>s.day===d.date).slice(0,MAX_PER_DAY);if(!mine.length)continue;
  items.push({kind:'title',text:d.title||d.city||d.date,sub:d.city||'',day:d.date,seconds:TITLE_SECONDS});
  // Sounds go first to the shots from the stop they were recorded at, then to the rest of the day.
  const under=new Map();
  for(const s of [...mine].sort((a,b)=>!!b.stepId-!!a.stepId)){const v=soundFor(state,s,used);if(v&&(v.stepId===s.stepId||!s.stepId||!soundsOf(state).some(x=>x.stepId===s.stepId))){used.add(v.id);under.set(s.ref,v.id);}}
  for(const s of mine){
   const sound=under.get(s.ref);
   items.push({kind:'shot',ref:s.ref,caption:s.stop||s.title||'',seconds:s.kind==='video'?MAX_VIDEO_SECONDS:SHOT_SECONDS,...(sound?{sound}:{})});
  }
 }
 items.push({kind:'title',text:'ありがとう',sub:'Thank you, Japan',seconds:TITLE_SECONDS});
 return {items:trim(items),by:'auto'};
}
function trim(items){
 let shots=0;return items.filter(i=>i.kind!=='shot'||++shots<=MAX_SHOTS);
}
// Any edit list — Claude's, or one a parent has trimmed — is checked before it is drawn: every shot
// has to be one of ours, a sound has to be one of our sound postcards, each sound is used once, and
// the times are kept within reason. Anything else is dropped rather than guessed at.
export function cleanEditList(raw,state){
 const shots=new Map(candidateShots(state).map(s=>[s.ref,s])),sounds=new Set(soundsOf(state).map(v=>v.id)),used=new Set(),items=[];
 for(const it of Array.isArray(raw?.items)?raw.items:[]){
  if(it?.kind==='title'){const text=clamp(it.text,60);if(text)items.push({kind:'title',text,sub:clamp(it.sub,80),...(it.day?{day:clamp(it.day,10)}:{}),seconds:TITLE_SECONDS});continue;}
  if(it?.kind!=='shot')continue;
  const s=shots.get(it.ref);if(!s)continue;
  const max=s.kind==='video'?MAX_VIDEO_SECONDS:5,seconds=Number.isFinite(it.seconds)?Math.min(max,Math.max(1.5,it.seconds)):(s.kind==='video'?MAX_VIDEO_SECONDS:SHOT_SECONDS);
  const sound=typeof it.sound==='string'&&sounds.has(it.sound)&&!used.has(it.sound)?it.sound:null;if(sound)used.add(sound);
  items.push({kind:'shot',ref:s.ref,caption:clamp(it.caption,90),seconds,...(s.kind==='video'&&Number.isFinite(it.from)?{from:Math.max(0,it.from)}:{}),...(sound?{sound}:{})});
 }
 const out=trim(items);
 return out.some(i=>i.kind==='shot')?{items:out,by:raw?.by==='claude'?'claude':'auto'}:null;
}
export const runningTime=list=>Math.round((list?.items||[]).reduce((t,i)=>t+(i.seconds||0),0));
// Where each item starts, for the renderer's clock.
export function timeline(list){
 let t=0;return (list?.items||[]).map(i=>{const at=t;t+=i.seconds||0;return {...i,start:at,end:t};});
}
// The plan to draw: the one kept in the trip, checked again against the trip as it is now (a
// photo may have gone), or the automatic one when there is none or nothing of it is left.
export const currentEditList=state=>(state?.highlights?.list&&cleanEditList(state.highlights.list,state))||defaultEditList(state);
// Where the clock is: the item on screen, how far into it, and the one before (for the cross-fade).
export function itemAt(line,t){
 const i=line.findIndex(x=>t<x.end);const at=i<0?line.length-1:i;
 return {index:at,item:line[at]||null,prev:line[at-1]||null,into:Math.max(0,t-(line[at]?.start||0))};
}
