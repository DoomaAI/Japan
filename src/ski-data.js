// The Sapporo ski fields: the five resorts inside the city, each with where its own site says
// which lifts are running today, the runs to tick off the way the theme park rides are, and
// meet-ups at the top or the bottom of a lift. Shared by the phone and the server, so it has no
// dependencies.
//
// The runs and lifts come from OpenStreetMap (piste:type=downhill and aerialway=*), read by the
// server and kept, because no resort publishes its run list in a form a program can read. They
// are as good as the mapping: a run the mappers have not drawn is not in the list, and names
// are the ones on the map (often Japanese, with the English where somebody added it). The
// resort's own trail map is always one tap away. The facts below were gathered in November 2026
// as a planning aid; resorts change their hours and lifts, so the official page is the word on
// the day.
export const SKI_RESORTS=[
 {id:'teine',name:'Sapporo Teine',short:'Teine',ja:'サッポロテイネ',
  centre:{lat:43.083,lon:141.195},radius:3200,zoom:14,
  status:'https://sapporo-teine.com/snow/lang/en/trailstatus',statusLabel:'Lifts and runs open today',
  report:'https://weathernews.jp/ski/report/31401.html',
  site:'https://sapporo-teine.com/snow/lang/en/',
  about:'The 1972 Winter Olympics hill, in two zones joined by the runs: Highland at the top, steeper, with the sea below, and Olympia at the bottom, gentler and better for a mixed group.',
  queues:'Busiest on weekends and holidays, when Sapporo drives up. The Olympia base fills first; Highland is usually quieter.'},
 {id:'kokusai',name:'Sapporo Kokusai',short:'Kokusai',ja:'札幌国際スキー場',
  centre:{lat:43.07,lon:141.08},radius:2500,zoom:15,
  status:'https://www.sapporo-kokusai.jp/en/slopes',statusLabel:'Ski slopes of today',
  report:null,
  site:'https://www.sapporo-kokusai.jp/en/',
  about:'The deepest, driest snow of the city hills and the longest season, from late November into May. A gondola up the middle, long cruising runs, no night skiing.',
  queues:'The gondola is the one to watch on a weekend or a powder morning. Be on it at opening, or ride the quads at the side while it is busy.'},
 {id:'bankei',name:'Sapporo Bankei',short:'Bankei',ja:'さっぽろばんけい',
  centre:{lat:43.053,lon:141.275},radius:1800,zoom:15,
  status:'https://bankei.co.jp/home-english/ski-en',statusLabel:'Ski area and lifts',
  report:null,
  site:'https://bankei.co.jp/home-english/ski-en',
  about:'The closest to the city centre, about 20 minutes away, with night skiing under lights until late. Short, steep and fun after dinner.',
  queues:'Quiet in the day; the evenings bring the after-work crowd.'},
 {id:'fus',name:'Fu’s Snow Area',short:'Fu’s',ja:'フッズスノーエリア',
  centre:{lat:42.953,lon:141.27},radius:1500,zoom:15,
  status:'https://weathernews.jp/ski/spot/31412/',statusLabel:'Snow and lift report (Weathernews)',
  report:'https://weathernews.jp/ski/spot/31412/',
  site:'https://visit.sapporo.travel/?p=463',
  about:'A small, local hill in Minami-ku, south of the city, with night skiing and a terrain park. Off most visitors’ radar.',
  queues:'Rarely a queue.'},
 {id:'moiwa',name:'Sapporo Moiwayama',short:'Moiwa',ja:'札幌藻岩山スキー場',
  centre:{lat:43.022,lon:141.322},radius:1500,zoom:15,
  status:'https://weathernews.jp/ski/spot/31406/',statusLabel:'Snow and lift report (Weathernews)',
  report:'https://weathernews.jp/ski/spot/31406/',
  site:'https://www.sapporo.travel/?p=16757',
  about:'The city’s own hill, on Mt Moiwa above the centre, with night skiing. Skiers only: no snowboards.',
  queues:'Rarely a queue.'}
];
export const SKI_RESORT_IDS=SKI_RESORTS.map(r=>r.id);
export const skiResort=id=>SKI_RESORTS.find(r=>r.id===id)||null;
// No resort in Sapporo publishes lift wait times, live or otherwise. The best there is: the
// official page for which lifts are turning, and a word from whoever in the group is at the
// bottom of one.
export const WAITS_NOTE='No Sapporo resort publishes lift wait times. Weekday queues are short; weekends, Japanese public holidays, New Year and Snow Festival week bring the city to the hills.';
export const OSM_CREDIT='Runs and lifts © OpenStreetMap contributors';
export const OSM_COPYRIGHT='https://www.openstreetmap.org/copyright';

// ---- Grades -------------------------------------------------------------------------------
// Japan grades runs green, red and black, the way the trail maps print them. OpenStreetMap's
// six grades fold into those three. The colours are the app's own green, red and ink, so a
// chip on a card and a line on the map are the same colour.
export const GRADES={
 green:{label:'Beginner',colour:'#28665a'},
 red:{label:'Intermediate',colour:'#c0392b'},
 black:{label:'Advanced',colour:'#16251e'}
};
const OSM_GRADE={novice:'green',easy:'green',intermediate:'red',advanced:'black',expert:'black',freeride:'black',extreme:'black'};
const GRADE_ORDER=['green','red','black'];
export const gradeOf=difficulty=>OSM_GRADE[String(difficulty||'').toLowerCase()]||null;
const harder=(a,b)=>!a?b:!b?a:GRADE_ORDER.indexOf(b)>GRADE_ORDER.indexOf(a)?b:a;

// ---- Lifts --------------------------------------------------------------------------------
// The aerialway kinds that carry skiers up. A goods line or a zip line is not a lift.
const LIFT_KINDS={cable_car:'Ropeway',gondola:'Gondola',mixed_lift:'Gondola and chairs',chair_lift:'Chairlift',
 drag_lift:'Drag lift','t-bar':'T-bar','j-bar':'J-bar',platter:'Platter',rope_tow:'Rope tow',magic_carpet:'Moving carpet'};
const SEATS={1:'Single',2:'Pair',3:'Triple',4:'Quad',6:'Six-seat',8:'Eight-seat'};
export function liftKind(tags={}){
 const kind=LIFT_KINDS[tags.aerialway];if(!kind)return null;
 const seats=Number(tags['aerialway:occupancy']);
 return tags.aerialway==='chair_lift'&&SEATS[seats]?`${SEATS[seats]} chair`:kind;
}

// ---- Reading the map ----------------------------------------------------------------------
// One Overpass query a resort: the runs and lifts with their lines, then the places to eat with
// a single point each. A circle round the resort is used rather than its outline, because an
// outline is the thing most often missing from the map, and a lift's bottom station is often
// just outside it.
export const OVERPASS_URL='https://overpass-api.de/api/interpreter';
export function overpassQuery(resort){
 const at=`around:${resort.radius},${resort.centre.lat},${resort.centre.lon}`;
 return `[out:json][timeout:25];(way["piste:type"="downhill"](${at});relation["piste:type"="downhill"](${at});way["aerialway"](${at}););out tags geom;nwr["amenity"~"^(restaurant|cafe|fast_food)$"](${at});out tags center;`;
}
const round=n=>Math.round(n*1e5)/1e5;
const line=geometry=>(geometry||[]).filter(p=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lon)).map(p=>[round(p.lat),round(p.lon)]);
export function metresBetween(a,b){
 const R=6371000,rad=Math.PI/180,dLat=(b[0]-a[0])*rad,dLon=(b[1]-a[1])*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLon/2)**2;
 return 2*R*Math.asin(Math.sqrt(h));
}
const lengthOf=pts=>pts.slice(1).reduce((m,p,i)=>m+metresBetween(pts[i],p),0);
// The English name where a mapper gave one, else the name as signed. A run's id keeps the name
// as signed, which changes less often than a translation.
const shown=tags=>(tags['name:en']||tags.name||'').trim();
const signed=tags=>(tags.name||tags['name:en']||'').trim();
export const skiRunId=(resortId,name)=>`${resortId}:${String(name).trim().slice(0,100)}`;
export const runResort=runId=>skiResort(String(runId||'').split(':')[0]);
// The Overpass answer turned into what the screens draw: runs grouped by name (a run is often
// mapped as several pieces), lifts with their bottom and top, and places to eat. A run with no
// name is drawn on the map but is not in the checklist: there is nothing to call it.
export function readOverpass(feed,resort){
 const runs=new Map(),lifts=[],food=[],unnamed=[];
 const addRun=(tags,lines)=>{
  lines=lines.filter(l=>l.length>1);if(!lines.length)return;
  const grade=gradeOf(tags['piste:difficulty']),key=signed(tags);
  if(!key){unnamed.push({grade,lines});return;}
  const id=skiRunId(resort.id,key),r=runs.get(id)||{id,name:shown(tags)||key,ja:tags.name&&tags.name!==shown(tags)?tags.name:'',grade:null,lengthM:0,lines:[]};
  r.grade=harder(r.grade,grade);r.lines.push(...lines);r.lengthM+=lines.reduce((m,l)=>m+lengthOf(l),0);
  if(tags['piste:grooming']&&!r.grooming)r.grooming=tags['piste:grooming'];
  runs.set(id,r);
 };
 for(const el of feed?.elements||[]){
  const tags=el.tags||{};
  if(el.type==='way'&&tags['piste:type']==='downhill'&&tags.area!=='yes')addRun(tags,[line(el.geometry)]);
  else if(el.type==='relation'&&tags['piste:type']==='downhill')addRun(tags,(el.members||[]).filter(m=>m.type==='way').map(m=>line(m.geometry)));
  else if(el.type==='way'&&tags.aerialway){
   const kind=liftKind(tags),pts=line(el.geometry);if(!kind||pts.length<2)continue;
   // A lift is drawn bottom to top on OpenStreetMap, by convention.
   lifts.push({id:`lift-${el.id}`,name:shown(tags)||kind,ja:tags.name&&tags.name!==shown(tags)?tags.name:'',kind,bottom:pts[0],top:pts.at(-1),line:pts,lengthM:Math.round(lengthOf(pts))});
  }else if(tags.amenity&&shown(tags)){
   const lat=el.lat??el.center?.lat,lon=el.lon??el.center?.lon;
   if(Number.isFinite(lat)&&Number.isFinite(lon))food.push({id:`food-${el.type}-${el.id}`,name:shown(tags),ja:tags.name&&tags.name!==shown(tags)?tags.name:'',kind:tags.amenity,lat:round(lat),lon:round(lon)});
  }
 }
 const list=[...runs.values()].map(r=>({...r,lengthM:Math.round(r.lengthM)}))
  .sort((a,b)=>GRADE_ORDER.indexOf(a.grade||'red')-GRADE_ORDER.indexOf(b.grade||'red')||a.name.localeCompare(b.name,'ja'));
 return {resort:resort.id,runs:list,unnamed,lifts:lifts.sort((a,b)=>a.name.localeCompare(b.name,'ja')),food};
}

// ---- Places to meet -----------------------------------------------------------------------
// The places a group says "see you at": the top and the bottom of every lift, and every place
// to eat. Each is a label and a point, kept on the meet-up itself so it still reads right if the
// map is redrawn.
export function meetingPlaces(map){
 if(!map)return [];
 return [
  ...map.food.map(f=>({id:f.id,label:f.name,group:'Eat',lat:f.lat,lon:f.lon})),
  ...map.lifts.flatMap(l=>[
   {id:`${l.id}-bottom`,label:`Bottom of ${l.name}`,group:'Lift bottoms',lat:l.bottom[0],lon:l.bottom[1]},
   {id:`${l.id}-top`,label:`Top of ${l.name}`,group:'Lift tops',lat:l.top[0],lon:l.top[1]}])
 ];
}

// ---- The run checklist --------------------------------------------------------------------
// Who has done which run, and who wants to: the same shape as the park rides, under its own key.
export const skiRunEntry=(state,runId)=>state?.skiRuns?.[runId]||{};
export const runDoneBy=(state,runId)=>skiRunEntry(state,runId).done||{};
export const runWantedBy=(state,runId)=>Object.keys(skiRunEntry(state,runId).wants||{});
export const runsDoneAt=(state,resortId,person)=>Object.entries(state?.skiRuns||{}).filter(([id,e])=>id.startsWith(`${resortId}:`)&&e.done?.[person]).length;
export const validRunId=id=>typeof id==='string'&&id.length<=120&&!!runResort(id)&&id.split(':').slice(1).join(':').trim().length>0;

// ---- Meet-ups -----------------------------------------------------------------------------
export const MEETUP_ANSWERS={yes:'Coming',late:'Running late',no:'Can’t make it'};
export const MEETUP_REMIND_MIN=15;
// How far ahead a meet-up can be set, and how long one is kept on the list after its time.
export const MEETUP_AHEAD_MS=8*86400000,MEETUP_KEEP_MS=12*3600000;
export const activeMeetups=(state,now=Date.now())=>(state?.meetups||[]).filter(m=>!m.cancelledAt&&Date.parse(m.at)>now-MEETUP_KEEP_MS).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
export const answerOf=(m,name)=>m.answers?.[name]?.answer||(m.by===name?'yes':null);
// Who a meet-up's news goes to: everyone in the group but the person it is about, and not
// those who have said they cannot come.
export const meetupAudience=(state,m,except)=>(state?.members||[]).filter(n=>n!==except&&answerOf(m,n)!=='no');
const clock=(iso,timeZone)=>new Intl.DateTimeFormat('en-AU',{hour:'numeric',minute:'2-digit',hour12:false,timeZone}).format(new Date(iso));
export const meetupWhen=(m,timeZone='Asia/Tokyo')=>clock(m.at,timeZone);
// The words on each notification a meet-up sends.
export function meetupPush(event,m,who,timeZone='Asia/Tokyo'){
 const at=meetupWhen(m,timeZone),place=m.place.label,resort=skiResort(m.resort)?.short||'';
 const where=`${place}${resort?`, ${resort}`:''}`;
 if(event==='new')return {title:`🎿 Meet at ${place} · ${at}`,body:`${who}${m.note?`: ${m.note}`:' set a meet-up'}. Tap to say if you’re coming.`};
 if(event==='late'){const a=m.answers?.[who];return {title:`${who} is running ${a?.minutes?`${a.minutes} min `:''}late`,body:`For ${where} at ${at}.`};}
 if(event==='no')return {title:`${who} can’t make ${at}`,body:`At ${where}.`};
 if(event==='here')return {title:`${who} is at ${place}`,body:`Meeting at ${at}${resort?` · ${resort}`:''}.`};
 if(event==='cancel')return {title:`Cancelled: ${place} at ${at}`,body:`${who} called off the meet-up${resort?` at ${resort}`:''}.`};
 if(event==='soon')return {title:`In ${MEETUP_REMIND_MIN} minutes: ${place}`,body:`${at}${resort?` at ${resort}`:''}${m.note?` · ${m.note}`:''}.`};
 return {title:`Meet-up at ${place}`,body:at};
}
// Quick times for a meet-up from now: in a quarter of an hour, half an hour, an hour, rounded
// up to the next five minutes so nobody is told to meet at 12:43.
export function quickTimes(now=Date.now()){
 const five=5*60000;
 return [15,30,60].map(min=>({min,at:new Date(Math.ceil((now+min*60000)/five)*five).toISOString()}));
}

// ---- The trip's days ----------------------------------------------------------------------
// The ski plan's days come from its dates and where each night is, set by its organiser when the
// plan is started and changed whenever the bookings change. Flying through Osaka, the first day
// is Osaka until somebody says otherwise; the rest are on the snow.
export const DAY_PLACES=['Osaka','Kyoto','Nara','Sapporo','Travel day'];
export const MAX_PLAN_DAYS=45;
const isoDay=/^\d{4}-\d{2}-\d{2}$/;
const addDays=(date,n)=>new Date(Date.parse(`${date}T00:00:00Z`)+n*86400000).toISOString().slice(0,10);
// The dates from the first to the last, each with its place: the one asked for, else the one it
// had, else Osaka on the first day and Sapporo after. A problem comes back as a sentence.
export function planDays({from,to,places={}},had=[]){
 if(!isoDay.test(from||'')||!isoDay.test(to||'')||!Number.isFinite(Date.parse(from))||!Number.isFinite(Date.parse(to)))return {problem:'Choose the first and the last day.'};
 const count=Math.round((Date.parse(to)-Date.parse(from))/86400000)+1;
 if(count<1)return {problem:'The last day is before the first.'};
 if(count>MAX_PLAN_DAYS)return {problem:`Keep the trip under ${MAX_PLAN_DAYS} days.`};
 const before=new Map(had.map(d=>[d.date,d]));
 const days=[];
 for(let i=0;i<count;i++){
  const date=addDays(from,i),old=before.get(date),asked=typeof places[date]==='string'?places[date].replace(/\s+/g,' ').trim().slice(0,40):'';
  const city=asked||old?.city||(i===0?'Osaka':'Sapporo');
  days.push({date,title:old&&!asked?old.title:city==='Sapporo'?'Sapporo · on the snow':city,city,hotel:old?.hotel||'',pages:old?.pages||[]});
 }
 return {days};
}
