// Live wait times on a park day, from Queue-Times.com's free public feed (neither park publishes an
// open API of its own; Queue-Times reads the parks' own apps every few minutes). Its terms ask
// for a visible "Powered by Queue-Times.com" link wherever the numbers are shown, so every screen
// that shows one carries WAITS_CREDIT. The official app stays one tap away: it is the source.
export const WAITS_SOURCE={name:'Queue-Times.com',url:'https://queue-times.com/'};
export const WAITS_CREDIT='Powered by Queue-Times.com';
// Our park ids against Queue-Times' own.
export const QUEUE_TIMES_PARK={usj:284,tdl:274,tds:275};
export const queueTimesUrl=parkId=>QUEUE_TIMES_PARK[parkId]?`https://queue-times.com/parks/${QUEUE_TIMES_PARK[parkId]}/queue_times.json`:null;
// The feed as it arrives: lands, each with rides, plus a few rides outside any land. Read into one
// flat list, keeping only what is shown, and anything malformed dropped rather than trusted.
export function readQueueTimes(feed){
 const rides=[],seen=new Set();
 const add=(r,land)=>{
  if(!r||typeof r.name!=='string'||!r.name.trim()||seen.has(r.id??r.name))return;seen.add(r.id??r.name);
  const updated=typeof r.last_updated==='string'&&!Number.isNaN(Date.parse(r.last_updated))?new Date(r.last_updated).toISOString():null;
  rides.push({name:r.name.trim().slice(0,120),land:String(land||'').slice(0,80),open:!!r.is_open,wait:Number.isFinite(r.wait_time)?Math.max(0,Math.round(r.wait_time)):null,updated});
 };
 for(const l of Array.isArray(feed?.lands)?feed.lands:[])for(const r of Array.isArray(l?.rides)?l.rides:[])add(r,l.name);
 for(const r of Array.isArray(feed?.rides)?feed.rides:[])add(r,'');
 return rides;
}
// When the park last reported, which is the newest time on any ride.
export const latestUpdate=rides=>rides.reduce((a,r)=>r.updated&&(!a||r.updated>a)?r.updated:a,null);
// Names are matched on their longer words, the way ridePlanned matches a ride to a stop, so a ™, a
// curly apostrophe or "— The Ride" against "– The Ride" does not stop a match.
const words=t=>String(t||'').replace(/[™®©℠]/g,'').normalize('NFKD').toLowerCase().replace(/[’']s\b/g,'').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(w=>w.length>3);
const allIn=(a,b)=>{const x=words(a),y=new Set(words(b));return x.length>0&&x.every(w=>y.has(w));};
export const sameRide=(a,b)=>allIn(a,b)||allIn(b,a);
// The live entry for one of our rides.
export const liveFor=(rides,ride)=>(rides||[]).find(r=>sameRide(r.name,ride.name))||null;
// The live entries a stop is about: any ride whose whole name is in the stop's title (or place),
// e.g. "The Flying Dinosaur — Express Choice A".
export const liveForStop=(rides,step)=>(rides||[]).filter(r=>allIn(r.name,step?.title)||allIn(r.name,step?.place));
// What one ride says, in a few words.
export const waitLabel=r=>!r?'No live time':!r.open?'Closed now':r.wait==null?'Open':r.wait===0?'Walk on':`${r.wait} min`;
// Busiest first among open rides, then closed ones, by name within each.
export const byWait=rides=>[...rides].sort((a,b)=>(b.open-a.open)||((b.wait??-1)-(a.wait??-1))||a.name.localeCompare(b.name));
// "4 min ago", "just now", "over an hour ago": how old a time is, from now.
export function ago(iso,now=new Date()){
 if(!iso)return '';const m=Math.round((now-new Date(iso))/60000);
 return m<1?'just now':m<60?`${m} min ago`:m<120?'over an hour ago':`${Math.floor(m/60)} hours ago`;
}
// A time this old is no longer live: the park is closed for the night, or the feed has stalled.
export const STALE_MINUTES=30;
export const isStale=(iso,now=new Date())=>!iso||now-new Date(iso)>STALE_MINUTES*60000;
