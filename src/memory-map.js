// The memory map: where each thing we will want to remember happened, drawn from what the app
// already knows. A stop is placed by its own pin if somebody dropped one, and otherwise by the
// place it is at, once that place has coordinates from our My Map. A photo that carried its own
// position is placed there instead. Nothing here asks the phone where it is.
import {stepPin,validCoords,documentSteps} from './trip-features.js';
import {resolveLocation,locationKey} from './locations.js';
import {activeSteps} from './timing.js';
// A position somebody shares with the family is rounded to about a hundred metres, and is gone
// three hours after it was shared. It says which part of the aquarium, not which tank.
export const CHECKIN_PLACES=3;
export const CHECKIN_HOURS=3;
// A photo's own position is kept to about ten metres, the same as a stop's pin.
export const PHOTO_PLACES=4;
const round=(v,places)=>Math.round(v*10**places)/10**places;
export const roundedPosition=(lat,lng,places)=>({lat:round(lat,places),lng:round(lng,places)});
export const validPosition=p=>!!p&&typeof p==='object'&&validCoords(p.lat,p.lng);
// ---- Coordinates for our places, read from the family My Map's KML export --------------------
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
 .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(m,e)=>e[0]==='#'?String.fromCodePoint(e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):Number(e.slice(1))):ENTITIES[e.toLowerCase()]??m).trim();
// Every point on the map, by name. Lines and shapes have no one position, so they are left out.
export function parseKml(text){
 const out=[];
 for(const [,body] of String(text||'').matchAll(/<Placemark\b[^>]*>([\s\S]*?)<\/Placemark>/g)){
  const point=body.match(/<Point\b[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/);
  if(!point)continue;
  const [lng,lat]=point[1].trim().split(/[\s,]+/).map(Number);
  if(!validCoords(lat,lng))continue;
  out.push({name:decode(body.match(/<name>([\s\S]*?)<\/name>/)?.[1]),lat,lng});
 }
 return out;
}
// A place takes the position of the one map pin whose name is its name, one of its aliases, or
// its Japanese name. Two pins with the same name and different places are not guessed between.
export function matchPlacemarks(locations,placemarks){
 const byKey=new Map();
 for(const p of placemarks){const k=locationKey(p.name);if(!k)continue;(byKey.get(k)||byKey.set(k,[]).get(k)).push(p);}
 const places={},used=new Set();
 for(const loc of locations||[]){
  const keys=[...new Set([loc.name,...(loc.aliases||[]),loc.japanese].map(locationKey).filter(Boolean))];
  const hits=[...new Set(keys.flatMap(k=>byKey.get(k)||[]))];
  const spots=new Set(hits.map(h=>`${h.lat.toFixed(5)},${h.lng.toFixed(5)}`));
  if(!hits.length||spots.size!==1)continue;
  places[loc.id]={lat:hits[0].lat,lng:hits[0].lng};hits.forEach(h=>used.add(h));
 }
 return {places,matched:Object.keys(places).length,unmatched:placemarks.filter(p=>!used.has(p)).map(p=>p.name)};
}
// The My Map's id, out of the embed link the app already has. The KML export of a shared map is
// public at a fixed address, so no key is needed to read it.
export function myMapKmlUrl(state){
 for(const link of [state?.mapEmbed,state?.mapUrl]){
  try{const mid=new URL(link).searchParams.get('mid');if(mid&&/^[\w-]{10,80}$/.test(mid))return `https://www.google.com/maps/d/kml?mid=${mid}&forcekml=1`;}catch{}
 }
 return null;
}
export const placeCoords=state=>state?.placeCoords?.places||{};
// ---- Where things are -----------------------------------------------------------------------
export function stepPosition(state,step){
 const pin=stepPin(step);
 if(pin)return {lat:pin.lat,lng:pin.lng,exact:true};
 const loc=resolveLocation(state,step),at=loc&&placeCoords(state)[loc.id];
 return validPosition(at)?{lat:at.lat,lng:at.lng,exact:false}:null;
}
// The day's stops in the order we do them, as a line to draw.
export const dayRoute=(state,day)=>activeSteps(state,day).map(s=>({step:s,at:stepPosition(state,s)})).filter(r=>r.at);
const mine=(person,...names)=>!person||names.includes(person);
// Everything worth a marker, for one day or the whole trip, and for one of us or all of us.
// A stop earns a marker when something is attached to it or it has been done; a photo with its
// own position, and a shop find with a pin, earn their own.
export function memoryPoints(state,{day=null,person=null}={}){
 const points=[],unplaced=[];
 const days=day?[day]:(state.days||[]).map(d=>d.date);
 const gallery=(state.documents||[]).filter(d=>d.category==='memory'&&!d.parentDocumentId);
 const placedOwn=d=>validPosition(d.gps);
 for(const date of days){
  for(const s of activeSteps(state,date)){
   const photos=gallery.filter(d=>!placedOwn(d)&&(d.stepId===s.id||documentSteps(d).includes(s.id))&&mine(person,d.person));
   const voice=(state.voiceNotes||[]).filter(v=>v.stepId===s.id&&mine(person,v.by));
   const review=state.stepReviews?.[s.id]||{};
   const ratings=Object.fromEntries(Object.entries(review.ratings||{}).filter(([n])=>mine(person,n)));
   const thoughts=Object.fromEntries(Object.entries(review.thoughts||{}).filter(([n])=>mine(person,n)));
   const count=photos.length+voice.length+Object.keys(ratings).length+Object.keys(thoughts).length;
   if(!count&&s.status!=='done')continue;
   if(person&&!count)continue;
   const at=stepPosition(state,s);
   const point={id:`stop-${s.id}`,kind:'stop',title:s.title,day:date,time:s.time||null,stepId:s.id,done:s.status==='done',photos,voice,ratings,thoughts,count};
   if(at)points.push({...point,...at});else if(count)unplaced.push(point);
  }
  for(const d of gallery.filter(d=>placedOwn(d)&&mine(person,d.person)&&(d.day===date||(state.steps||[]).find(s=>s.id===d.stepId)?.day===date)))
   points.push({id:`media-${d.id}`,kind:'photo',title:d.title,day:date,stepId:d.stepId||null,lat:d.gps.lat,lng:d.gps.lng,exact:true,photos:[d],voice:[],ratings:{},thoughts:{},count:1});
  for(const p of (state.photos||[]).filter(p=>p.day===date&&validPosition(p.gps)&&mine(person,p.for||p.by)))
   points.push({id:`photo-${p.id}`,kind:'daily',title:p.title||`${p.for||p.by}’s photo`,day:date,lat:p.gps.lat,lng:p.gps.lng,exact:true,daily:p,photos:[],voice:[],ratings:{},thoughts:{},count:1});
 }
 for(const f of (state.shortlist||[]).filter(f=>validPosition(f.pin)&&mine(person,f.addedBy)&&(!day||f.day===day)))
  points.push({id:`find-${f.id}`,kind:'find',title:f.title,day:f.day||null,lat:f.pin.lat,lng:f.pin.lng,exact:true,find:f,photos:[],voice:[],ratings:{},thoughts:{},count:1});
 return {points,unplaced};
}
// ---- The family, where they last said they were ---------------------------------------------
export const checkinAge=(c,now=new Date())=>Math.max(0,Math.round((now-new Date(c.at))/60000));
export const checkinFresh=(c,now=new Date())=>!!c&&now-new Date(c.at)<CHECKIN_HOURS*3600000;
export function ageText(minutes){
 if(minutes<2)return 'just now';
 if(minutes<60)return `${minutes} min ago`;
 const h=Math.floor(minutes/60),m=minutes%60;
 return m?`${h} h ${m} min ago`:`${h} h ago`;
}
// Who can see whose position: a parent sees everybody; the boys see Mum and Dad and themselves.
export const canSeeCheckin=(viewer,checkin,parents)=>viewer?.role==='parent'||checkin.name===viewer?.name||parents.includes(checkin.name);
